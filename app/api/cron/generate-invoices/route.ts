import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPeriods } from '@/lib/utils/generate-assessment-invoices';
import { queuePaymentReminder } from '@/lib/email/queue';
import type { PaymentFrequency } from '@/lib/types/database';

/**
 * POST /api/cron/generate-invoices
 * Daily cron: auto-generates invoices for upcoming billing periods (next 14 days).
 * Optionally sends notification emails to homeowners for new invoices.
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

  const today = new Date();
  const lookAhead = new Date();
  lookAhead.setDate(today.getDate() + 14);
  const todayStr = today.toISOString().split('T')[0];
  const lookAheadStr = lookAhead.toISOString().split('T')[0];

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

    // Get active units
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
        const freq = (unit.payment_frequency as PaymentFrequency) || defaultFrequency;
        const periods = getPeriods(freq, assessment.fiscal_year_start, assessment.fiscal_year_end);
        if (periods.length === 0) continue;

        const perPeriodAmount = Math.round(assessment.annual_amount / periods.length);
        const remainder = assessment.annual_amount - perPeriodAmount * periods.length;

        // Only generate for periods with due dates in the next 14 days
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
      }
    }
  }

  return NextResponse.json({ generated: totalGenerated, skipped: totalSkipped, notified: totalNotified });
}
