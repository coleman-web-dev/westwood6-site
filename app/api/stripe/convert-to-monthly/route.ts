import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createJournalEntry } from '@/lib/utils/accounting-entries';

/**
 * POST /api/stripe/convert-to-monthly
 * One-time conversion endpoint for migrating to the monthly invoicing model.
 *
 * Processes ALL active units (not just non-monthly) because some units may be
 * marked as 'monthly' in the DB but made lump-sum payments under the old system.
 *
 * For each unit with prepaid balance:
 * 1. Sums all PAID invoices for the current fiscal year
 * 2. Calculates prepaid balance (total paid minus months consumed at monthly rate)
 * 3. Credits prepaid amount to wallet with GL reclassification entry
 * 4. Voids any PENDING invoices larger than monthly amount (old bulk invoices)
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
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

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
    const monthsElapsed =
      (currentYear - fiscalStartYear) * 12 + (currentMonth - fiscalStartMonth) + 1;
    const consumedAmount = monthsElapsed * monthlyAmount;

    // Fetch ALL active units (not just non-monthly, because some units may be
    // mismarked as monthly but have lump-sum payments from the old system)
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number, payment_frequency')
      .eq('community_id', communityId)
      .eq('status', 'active');

    if (!units || units.length === 0) {
      return NextResponse.json({
        converted: 0,
        walletCredits: 0,
        voided: 0,
        message: 'No active units found',
      });
    }

    let converted = 0;
    let totalWalletCredits = 0;
    let totalVoided = 0;
    const details: {
      unit: string;
      frequency: string;
      paid: number;
      consumed: number;
      prepaid: number;
      voided: number;
    }[] = [];

    // Fetch units that were already processed (have a conversion wallet transaction)
    const { data: alreadyProcessed } = await supabase
      .from('wallet_transactions')
      .select('unit_id')
      .eq('community_id', communityId)
      .eq('type', 'manual_credit')
      .like('description', '%monthly invoicing conversion%');

    const processedUnitIds = new Set((alreadyProcessed || []).map((t) => t.unit_id));
    let skipped = 0;

    for (const unit of units) {
      // Skip units that were already converted
      if (processedUnitIds.has(unit.id)) {
        skipped++;
        continue;
      }

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

      // Void any PENDING invoices that are larger than monthly amount
      // (these are old bulk invoices from the legacy system that should be
      // replaced by monthly invoices going forward)
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('id, amount')
        .eq('unit_id', unit.id)
        .in('status', ['pending', 'overdue'])
        .gt('amount', monthlyAmount)
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

      // Only count units that had prepaid balance or voided invoices
      if (prepaid > 0 || voidedCount > 0) {
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

          await supabase.from('unit_wallets').upsert(
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
              {
                accountCode: '4000',
                debit: prepaid,
                credit: 0,
                description: 'Assessment Revenue (reclassified)',
              },
              {
                accountCode: '2110',
                debit: 0,
                credit: prepaid,
                description: 'Wallet Credits (prepaid dues)',
              },
            ],
          });

          totalWalletCredits += prepaid;
        }

        converted++;
        details.push({
          unit: unit.unit_number,
          frequency: unit.payment_frequency,
          paid: totalPaid,
          consumed: consumedAmount,
          prepaid,
          voided: voidedCount,
        });
      }
    }

    return NextResponse.json({
      converted,
      walletCredits: totalWalletCredits,
      voided: totalVoided,
      monthlyAmount,
      monthsElapsed,
      consumedAmount,
      totalUnitsScanned: units.length,
      skipped,
      details,
    });
  } catch (err) {
    console.error('Convert-to-monthly error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
