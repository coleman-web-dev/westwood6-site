import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/cron/mark-overdue
 * Daily cron: automatically marks pending invoices as overdue once past their due date.
 * Only runs for communities with auto_mark_overdue enabled.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // Get communities with auto-mark-overdue enabled
  const { data: communities, error: comError } = await supabase
    .from('communities')
    .select('id, theme');

  if (comError || !communities) {
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
  }

  let totalMarked = 0;

  for (const community of communities) {
    const theme = community.theme as Record<string, unknown> | null;
    const paymentSettings = theme?.payment_settings as Record<string, unknown> | undefined;

    if (!paymentSettings?.auto_mark_overdue) continue;

    // Mark pending invoices past due date as overdue
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('community_id', community.id)
      .eq('status', 'pending')
      .lt('due_date', todayStr)
      .select('id');

    if (!error && data) {
      totalMarked += data.length;
    }
  }

  return NextResponse.json({ marked_overdue: totalMarked });
}
