import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPeriods } from '@/lib/utils/generate-assessment-invoices';
import { applyWalletToInvoiceBatch } from '@/lib/utils/apply-wallet-to-invoices';
import { queuePaymentReminder } from '@/lib/email/queue';
import type { PaymentFrequency } from '@/lib/types/database';

/**
 * POST /api/cron/generate-invoices
 * Daily cron: auto-generates monthly invoices for upcoming billing periods.
 * - Monthly payers: 14-day lookahead
 * - Non-monthly payers (quarterly/semi_annual/annual): 10-day lookahead
 * After generating invoices, auto-applies wallet balances to cover them.
 * Auto-rolls regular assessments forward when their fiscal year ends.
 * Idempotent: always checks for existing invoices before inserting.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get communities with auto-generate enabled
  const { data: communities, error: comError } = await supabase
    .from('communities')
    .select('id, slug, theme');

  if (comError || !communities) {
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
  }

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalNotified = 0;
  let totalWalletApplied = 0;
  let totalRolledOver = 0;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Pre-compute lookahead dates
  const lookAhead14 = new Date(today);
  lookAhead14.setDate(today.getDate() + 14);
  const lookAhead14Str = lookAhead14.toISOString().split('T')[0];

  const lookAhead10 = new Date(today);
  lookAhead10.setDate(today.getDate() + 10);
  const lookAhead10Str = lookAhead10.toISOString().split('T')[0];

  for (const community of communities) {
    const theme = community.theme as Record<string, unknown> | null;
    const paymentSettings = theme?.payment_settings as Record<string, unknown> | undefined;

    if (!paymentSettings?.auto_generate_invoices) continue;

    const defaultFrequency = (paymentSettings?.default_frequency as PaymentFrequency) || 'quarterly';
    const autoNotify = !!paymentSettings?.auto_notify_new_invoices;

    // Get active assessments
    const { data: assessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('community_id', community.id)
      .eq('is_active', true);

    if (!assessments || assessments.length === 0) continue;

    // Auto-rollover: regular assessments whose fiscal year has ended get rolled forward 1 year.
    // This keeps recurring dues generating invoices indefinitely without manual intervention.
    for (const assessment of assessments) {
      if (assessment.type === 'special') continue;
      if (assessment.fiscal_year_end >= todayStr) continue;

      const fyStart = new Date(assessment.fiscal_year_start + 'T00:00:00Z');
      const fyEnd = new Date(assessment.fiscal_year_end + 'T00:00:00Z');
      fyStart.setUTCFullYear(fyStart.getUTCFullYear() + 1);
      fyEnd.setUTCFullYear(fyEnd.getUTCFullYear() + 1);

      const newStart = `${fyStart.getUTCFullYear()}-${String(fyStart.getUTCMonth() + 1).padStart(2, '0')}-${String(fyStart.getUTCDate()).padStart(2, '0')}`;
      const newEnd = `${fyEnd.getUTCFullYear()}-${String(fyEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(fyEnd.getUTCDate()).padStart(2, '0')}`;

      const { error: rollError } = await supabase
        .from('assessments')
        .update({ fiscal_year_start: newStart, fiscal_year_end: newEnd })
        .eq('id', assessment.id);

      if (!rollError) {
        assessment.fiscal_year_start = newStart;
        assessment.fiscal_year_end = newEnd;
        totalRolledOver++;
        console.log(`Auto-rolled assessment "${assessment.title}" to ${newStart} - ${newEnd}`);
      } else {
        console.error(`Failed to rollover assessment "${assessment.title}":`, rollError);
      }
    }

    // Get active units (need payment_frequency for lookahead window)
    const { data: units } = await supabase
      .from('units')
      .select('id, payment_frequency')
      .eq('community_id', community.id)
      .eq('status', 'active');

    if (!units || units.length === 0) continue;

    for (const assessment of assessments) {
      // Get existing invoices for this assessment to avoid duplicates
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('unit_id, due_date')
        .eq('assessment_id', assessment.id);

      const existingSet = new Set(
        (existingInvoices || []).map((inv) => `${inv.unit_id}:${inv.due_date}`)
      );

      const newInvoices: {
        community_id: string;
        unit_id: string;
        assessment_id: string;
        title: string;
        description: string | null;
        amount: number;
        due_date: string;
        status: 'pending';
      }[] = [];

      for (const unit of units) {
        // Always generate monthly invoices regardless of payment_frequency.
        // payment_frequency only controls Stripe billing interval.
        const periods = getPeriods('monthly', assessment.fiscal_year_start, assessment.fiscal_year_end);
        if (periods.length === 0) continue;

        const perPeriodAmount = Math.round(assessment.annual_amount / periods.length);
        const remainder = assessment.annual_amount - perPeriodAmount * periods.length;

        // Use per-unit lookahead: 14 days for monthly payers, 10 days for non-monthly.
        // Non-monthly payers have prepaid via wallet, so we generate just-in-time.
        const unitFreq = (unit.payment_frequency as PaymentFrequency) || defaultFrequency;
        const lookAheadStr = unitFreq === 'monthly' ? lookAhead14Str : lookAhead10Str;

        // Only generate for periods with due dates in the lookahead window
        for (let i = 0; i < periods.length; i++) {
          const period = periods[i];
          if (period.dueDate < todayStr || period.dueDate > lookAheadStr) continue;

          const key = `${unit.id}:${period.dueDate}`;
          if (existingSet.has(key)) {
            totalSkipped++;
            continue;
          }

          newInvoices.push({
            community_id: community.id,
            unit_id: unit.id,
            assessment_id: assessment.id,
            title: `${assessment.title} - ${period.label}`,
            description: assessment.description,
            amount: perPeriodAmount + (i === periods.length - 1 ? remainder : 0),
            due_date: period.dueDate,
            status: 'pending',
          });
        }
      }

      if (newInvoices.length > 0) {
        // Collect all inserted invoices for wallet auto-apply
        const allInserted: { id: string; amount: number; unit_id: string; title: string }[] = [];

        // Insert in batches of 50
        for (let i = 0; i < newInvoices.length; i += 50) {
          const batch = newInvoices.slice(i, i + 50);
          const { data: inserted, error } = await supabase
            .from('invoices')
            .insert(batch)
            .select('id, unit_id, title, amount, due_date');

          if (error) {
            console.error('Failed to insert invoices batch:', error);
          } else {
            totalGenerated += batch.length;

            // Collect for wallet auto-apply
            if (inserted) {
              for (const inv of inserted) {
                allInserted.push({
                  id: inv.id,
                  amount: inv.amount,
                  unit_id: inv.unit_id,
                  title: inv.title,
                });
              }
            }

            // Auto-notify homeowners about new invoices
            if (autoNotify && inserted) {
              for (const inv of inserted) {
                try {
                  await queuePaymentReminder(
                    community.id,
                    community.slug as string,
                    inv.id,
                    inv.title,
                    inv.amount,
                    inv.due_date,
                    false, // not overdue, it's a new invoice notification
                    inv.unit_id,
                  );
                  totalNotified++;
                } catch {
                  // Non-critical, continue
                }
              }
            }
          }
        }

        // Auto-apply wallet balances to newly generated invoices.
        // This covers prepaid households (yearly/semi-annual payers with wallet credits).
        if (allInserted.length > 0) {
          try {
            const walletResult = await applyWalletToInvoiceBatch(
              supabase, allInserted, community.id, null
            );
            if (walletResult.totalApplied > 0) {
              totalWalletApplied += walletResult.totalApplied;
              console.log(
                `Wallet auto-applied: ${walletResult.totalApplied} cents across ${walletResult.unitsAffected} units`
              );
            }
          } catch (err) {
            console.error('Wallet auto-apply failed:', err);
          }
        }
      }
    }
  }

  return NextResponse.json({
    generated: totalGenerated,
    skipped: totalSkipped,
    notified: totalNotified,
    walletApplied: totalWalletApplied,
    rolledOver: totalRolledOver,
  });
}
