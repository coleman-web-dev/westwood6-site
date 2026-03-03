import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LateFeeSettings } from '@/lib/types/database';

/**
 * POST /api/cron/apply-late-fees
 * Daily cron: applies late fees to overdue/partial invoices past the grace period.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all communities with late fees enabled
  const { data: communities, error: comError } = await supabase
    .from('communities')
    .select('id, theme');

  if (comError || !communities) {
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
  }

  let processed = 0;
  let applied = 0;
  let skipped = 0;

  for (const community of communities) {
    const theme = community.theme as Record<string, unknown> | null;
    const paymentSettings = theme?.payment_settings as Record<string, unknown> | undefined;
    const lateFeeSettings = paymentSettings?.late_fee_settings as LateFeeSettings | undefined;

    if (!lateFeeSettings?.enabled) continue;

    const { grace_period_days, fee_type, fee_amount, max_fee } = lateFeeSettings;
    const graceCutoff = new Date();
    graceCutoff.setDate(graceCutoff.getDate() - grace_period_days);
    const cutoffDate = graceCutoff.toISOString().split('T')[0];

    // Find eligible invoices: overdue/partial, due before cutoff, no late fee yet
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('id, amount, late_fee_amount')
      .eq('community_id', community.id)
      .in('status', ['overdue', 'partial'])
      .lt('due_date', cutoffDate)
      .eq('late_fee_amount', 0);

    if (invError || !invoices) {
      skipped++;
      continue;
    }

    processed += invoices.length;

    for (const invoice of invoices) {
      let fee: number;
      if (fee_type === 'flat') {
        fee = fee_amount;
      } else {
        fee = Math.round(invoice.amount * (fee_amount / 100));
      }

      if (max_fee && fee > max_fee) {
        fee = max_fee;
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          late_fee_amount: fee,
          amount: invoice.amount + fee,
        })
        .eq('id', invoice.id);

      if (updateError) {
        skipped++;
      } else {
        applied++;
      }
    }
  }

  return NextResponse.json({ processed, applied, skipped });
}
