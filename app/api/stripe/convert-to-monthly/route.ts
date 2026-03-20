import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createJournalEntry } from '@/lib/utils/accounting-entries';

/**
 * POST /api/stripe/convert-to-monthly
 * One-time conversion endpoint for existing non-monthly invoices.
 * Converts annual/semi-annual/quarterly invoices to the monthly invoicing model.
 *
 * For each non-monthly unit:
 * 1. Finds PAID invoices for the current fiscal year
 * 2. Calculates prepaid balance (total paid minus months consumed)
 * 3. Credits prepaid amount to wallet with GL reclassification entry
 * 4. Voids any PENDING non-monthly invoices
 *
 * Requires board member authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId } = await req.json();

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    // Verify the user is authenticated and is a board member
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: callerMember } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!callerMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 403 });
    }

    const isBoardOrHigher =
      callerMember.system_role === 'board' ||
      callerMember.system_role === 'manager' ||
      callerMember.system_role === 'super_admin';

    if (!isBoardOrHigher) {
      return NextResponse.json({ error: 'Board member access required' }, { status: 403 });
    }

    // Fetch active assessment for the community
    const { data: assessment } = await supabase
      .from('assessments')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: 'No active assessment found' }, { status: 400 });
    }

    const monthlyAmount = Math.round(assessment.annual_amount / 12);

    // Calculate months elapsed in the current fiscal year
    const fiscalStart = new Date(assessment.fiscal_year_start + 'T00:00:00Z');
    const now = new Date();
    const currentMonth = now.getUTCMonth(); // 0-indexed
    const fiscalStartMonth = fiscalStart.getUTCMonth();
    const fiscalStartYear = fiscalStart.getUTCFullYear();
    const currentYear = now.getUTCFullYear();

    // Months elapsed since fiscal year start (including the current month)
    const monthsElapsed = (currentYear - fiscalStartYear) * 12 + (currentMonth - fiscalStartMonth) + 1;
    const consumedAmount = monthsElapsed * monthlyAmount;

    // Fetch non-monthly units
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number, payment_frequency')
      .eq('community_id', communityId)
      .eq('status', 'active')
      .neq('payment_frequency', 'monthly');

    if (!units || units.length === 0) {
      return NextResponse.json({
        converted: 0,
        walletCredits: 0,
        voided: 0,
        message: 'No non-monthly units found',
      });
    }

    let converted = 0;
    let totalWalletCredits = 0;
    let totalVoided = 0;
    const details: { unit: string; paid: number; consumed: number; prepaid: number; voided: number }[] = [];

    for (const unit of units) {
      // Fetch PAID invoices for this unit in the current fiscal year
      // Match by date range (not assessment_id) because old invoices may have been
      // created under a different assessment or imported from legacy system
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('id, amount, amount_paid, status')
        .eq('unit_id', unit.id)
        .eq('status', 'paid')
        .gte('due_date', assessment.fiscal_year_start)
        .lte('due_date', assessment.fiscal_year_end);

      const totalPaid = (paidInvoices || []).reduce(
        (sum, inv) => sum + (inv.amount_paid ?? inv.amount),
        0
      );

      // Calculate prepaid balance
      const prepaid = Math.max(0, totalPaid - consumedAmount);

      // Void any PENDING non-monthly invoices for this fiscal year
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('unit_id', unit.id)
        .in('status', ['pending', 'overdue'])
        .gte('due_date', now.toISOString().split('T')[0])
        .lte('due_date', assessment.fiscal_year_end);

      let voidedCount = 0;
      if (pendingInvoices && pendingInvoices.length > 0) {
        const pendingIds = pendingInvoices.map((inv) => inv.id);
        const { error: voidError } = await supabase
          .from('invoices')
          .update({
            status: 'voided',
            notes: 'Voided during conversion to monthly invoicing model',
          })
          .in('id', pendingIds);

        if (!voidError) {
          voidedCount = pendingIds.length;
          totalVoided += voidedCount;
        }
      }

      // Credit prepaid amount to wallet
      if (prepaid > 0) {
        // Upsert wallet balance
        const { data: wallet } = await supabase
          .from('unit_wallets')
          .select('balance')
          .eq('unit_id', unit.id)
          .single();

        const currentBalance = wallet?.balance ?? 0;
        const newBalance = currentBalance + prepaid;

        await supabase
          .from('unit_wallets')
          .upsert(
            {
              unit_id: unit.id,
              community_id: communityId,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'unit_id' }
          );

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          unit_id: unit.id,
          community_id: communityId,
          amount: prepaid,
          type: 'manual_credit',
          description: 'Prepaid dues converted to wallet credit (monthly invoicing conversion)',
        });

        // GL entry: reclassify recognized revenue as deferred (wallet liability)
        // DR Assessment Revenue (4000) - reverse the premature revenue recognition
        // CR Wallet Credits (2110) - record as liability (prepaid dues)
        await createJournalEntry({
          communityId,
          description: `Prepaid dues reclassification: Unit ${unit.unit_number}`,
          source: 'wallet_credit',
          referenceType: 'unit',
          referenceId: unit.id,
          unitId: unit.id,
          lines: [
            { accountCode: '4000', debit: prepaid, credit: 0, description: 'Assessment Revenue (reclassified)' },
            { accountCode: '2110', debit: 0, credit: prepaid, description: 'Wallet Credits (prepaid dues)' },
          ],
        });

        totalWalletCredits += prepaid;
      }

      converted++;
      details.push({
        unit: unit.unit_number,
        paid: totalPaid,
        consumed: consumedAmount,
        prepaid,
        voided: voidedCount,
      });
    }

    return NextResponse.json({
      converted,
      walletCredits: totalWalletCredits,
      voided: totalVoided,
      details,
    });
  } catch (err) {
    console.error('Convert-to-monthly error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
