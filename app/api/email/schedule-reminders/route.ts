import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queuePaymentReminder } from '@/lib/email/queue';

/**
 * POST /api/email/schedule-reminders
 * Cron endpoint: finds invoices needing reminders and queues emails.
 * Protected by CRON_SECRET header.
 * Accepts optional { community_id } body for targeted manual trigger.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  let targetCommunityId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    if (body?.community_id) {
      targetCommunityId = body.community_id;
    }
  } catch {
    // No body is fine
  }

  // Get communities
  let communityQuery = supabase.from('communities').select('id, slug');
  if (targetCommunityId) {
    communityQuery = communityQuery.eq('id', targetCommunityId);
  }
  const { data: communities } = await communityQuery;

  if (!communities || communities.length === 0) {
    return NextResponse.json({ queued: 0, skipped: 0, message: 'No communities found' });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const reminderDate = sevenDaysOut.toISOString().split('T')[0];

  // Check for recently sent reminders to avoid duplicates (last 7 days)
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentEmails } = await supabase
    .from('email_queue')
    .select('template_data')
    .eq('category', 'payment_reminder')
    .gte('created_at', sevenDaysAgo.toISOString());

  const sentInvoiceIds = new Set<string>();
  if (recentEmails) {
    for (const e of recentEmails) {
      const data = e.template_data as Record<string, unknown>;
      if (data?.invoiceId) {
        sentInvoiceIds.add(data.invoiceId as string);
      }
    }
  }

  let queued = 0;
  let skipped = 0;

  for (const community of communities) {
    // Find upcoming invoices (due in 7 days)
    const { data: upcomingInvoices } = await supabase
      .from('invoices')
      .select('id, title, amount, due_date, unit_id')
      .eq('community_id', community.id)
      .eq('status', 'pending')
      .eq('due_date', reminderDate);

    // Find overdue invoices
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, title, amount, due_date, unit_id')
      .eq('community_id', community.id)
      .in('status', ['overdue', 'pending'])
      .lt('due_date', todayStr);

    const allInvoices = [
      ...(upcomingInvoices ?? []).map((inv) => ({ ...inv, isOverdue: false })),
      ...(overdueInvoices ?? []).map((inv) => ({ ...inv, isOverdue: true })),
    ];

    for (const inv of allInvoices) {
      if (sentInvoiceIds.has(inv.id)) {
        skipped++;
        continue;
      }

      try {
        await queuePaymentReminder(
          community.id,
          community.slug,
          inv.id,
          inv.title,
          inv.amount,
          inv.due_date,
          inv.isOverdue,
          inv.unit_id,
        );
        queued++;
      } catch (err) {
        console.error(`Failed to queue reminder for invoice ${inv.id}:`, err);
        skipped++;
      }
    }
  }

  return NextResponse.json({ queued, skipped });
}
