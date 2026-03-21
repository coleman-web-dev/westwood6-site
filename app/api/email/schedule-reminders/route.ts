import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queuePaymentReminder } from '@/lib/email/queue';

// Vercel crons send GET requests
export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

/**
 * Cron endpoint: finds invoices needing reminders and queues emails.
 * Uses configurable reminder_days_before and reminder_days_after from community settings.
 * Protected by CRON_SECRET header.
 * Accepts optional { community_id } body for targeted manual trigger.
 */
async function handler(req: NextRequest) {
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

  // Get communities with theme for settings
  let communityQuery = supabase.from('communities').select('id, slug, theme');
  if (targetCommunityId) {
    communityQuery = communityQuery.eq('id', targetCommunityId);
  }
  const { data: communities } = await communityQuery;

  if (!communities || communities.length === 0) {
    return NextResponse.json({ queued: 0, skipped: 0, message: 'No communities found' });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Check for recently sent reminders to avoid duplicates (last 3 days)
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentEmails } = await supabase
    .from('email_queue')
    .select('template_data')
    .eq('category', 'payment_reminder')
    .gte('created_at', threeDaysAgo.toISOString());

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
    const theme = community.theme as Record<string, unknown> | null;
    const paymentSettings = theme?.payment_settings as Record<string, unknown> | undefined;

    // Configurable reminder windows (defaults: 7 days before, 7 days after)
    const daysBefore = (paymentSettings?.reminder_days_before as number) ?? 7;
    const daysAfter = (paymentSettings?.reminder_days_after as number) ?? 7;

    // Calculate reminder date for upcoming invoices
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + daysBefore);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Calculate cutoff for overdue reminders
    const overdueCutoff = new Date(today);
    overdueCutoff.setDate(overdueCutoff.getDate() - daysAfter);
    const overdueCutoffStr = overdueCutoff.toISOString().split('T')[0];

    // Find upcoming invoices (due in X days)
    const { data: upcomingInvoices } = await supabase
      .from('invoices')
      .select('id, title, amount, due_date, unit_id')
      .eq('community_id', community.id)
      .eq('status', 'pending')
      .eq('due_date', reminderDateStr);

    // Find overdue invoices (still within reminder window)
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, title, amount, due_date, unit_id')
      .eq('community_id', community.id)
      .in('status', ['overdue', 'partial'])
      .lt('due_date', todayStr)
      .gte('due_date', overdueCutoffStr);

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
