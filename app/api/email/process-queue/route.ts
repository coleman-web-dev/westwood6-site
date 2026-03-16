import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';
import { PaymentConfirmationEmail } from '@/lib/email/templates/payment-confirmation';
import { PaymentReminderEmail } from '@/lib/email/templates/payment-reminder';
import { AnnouncementEmail } from '@/lib/email/templates/announcement';
import { WelcomeInviteEmail } from '@/lib/email/templates/welcome-invite';
import { WeeklyDigestEmail } from '@/lib/email/templates/weekly-digest';
import { ViolationNoticeEmail } from '@/lib/email/templates/violation-notice';
import { EventNotificationEmail } from '@/lib/email/templates/event-notification';
import { ReservationBoardNotificationEmail } from '@/lib/email/templates/reservation-board-notification';
import { BallotNotificationEmail } from '@/lib/email/templates/ballot-notification';
import { resolveSender } from '@/lib/email/resolve-sender';
import type { EmailQueueItem, EmailSettings } from '@/lib/types/database';

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any;

// Template rendering map
function renderTemplate(templateId: string, data: Record<string, unknown>): React.ReactElement | null {
  const d = data as AnyProps;
  switch (templateId) {
    case 'payment-confirmation':
      return PaymentConfirmationEmail(d);
    case 'payment-reminder':
      return PaymentReminderEmail(d);
    case 'announcement':
      return AnnouncementEmail(d);
    case 'welcome-invite':
      return WelcomeInviteEmail(d);
    case 'weekly-digest':
      return WeeklyDigestEmail(d);
    case 'violation-notice':
      return ViolationNoticeEmail(d);
    case 'event-notification':
      return EventNotificationEmail(d);
    case 'reservation-board-notification':
      return ReservationBoardNotificationEmail(d);
    case 'ballot-notification':
      return BallotNotificationEmail(d);
    default:
      console.error(`Unknown template: ${templateId}`);
      return null;
  }
}

/**
 * POST /api/email/process-queue
 * Cron endpoint: processes queued emails in batches.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend = getResendClient();
  const now = new Date().toISOString();

  // Fetch queued emails ready to send
  const { data: queueItems, error: fetchError } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', now)
    .lt('attempts', MAX_ATTEMPTS)
    .order('priority', { ascending: true }) // immediate first (alphabetical: i < n < s)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('Failed to fetch email queue:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }

  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No emails to process' });
  }

  let sent = 0;
  let failed = 0;

  for (const item of queueItems as EmailQueueItem[]) {
    // Mark as sending (atomically claim this item to prevent duplicate sends)
    const { data: claimed } = await supabase
      .from('email_queue')
      .update({ status: 'sending', attempts: item.attempts + 1 })
      .eq('id', item.id)
      .eq('status', 'queued')
      .select('id')
      .maybeSingle();

    // If another process already claimed this item, skip it
    if (!claimed) continue;

    try {
      // Render template
      const element = renderTemplate(item.template_id, item.template_data);
      if (!element) {
        throw new Error(`Unknown template: ${item.template_id}`);
      }

      const html = await render(element);

      // Get community email settings for from address
      const { data: community } = await supabase
        .from('communities')
        .select('name, theme')
        .eq('id', item.community_id)
        .maybeSingle();

      if (!community) {
        throw new Error(`Community not found: ${item.community_id}`);
      }

      const emailSettings = (community.theme as Record<string, unknown>)?.email_settings as EmailSettings | undefined;

      // Resolve sender based on community's email configuration
      const { from, replyTo } = await resolveSender(
        item.community_id,
        community.name,
        emailSettings,
      );

      // Send via Resend
      const { data: sendResult, error: sendError } = await resend.emails.send({
        from,
        to: item.recipient_email,
        subject: item.subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      });

      if (sendError) {
        throw new Error(sendError.message);
      }

      const messageId = sendResult?.id || null;

      // Mark as sent
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          resend_message_id: messageId,
          sent_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Log success
      await supabase.from('email_logs').insert({
        community_id: item.community_id,
        queue_id: item.id,
        recipient_email: item.recipient_email,
        category: item.category,
        subject: item.subject,
        resend_message_id: messageId,
        status: 'sent',
      });

      sent++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Failed to send email ${item.id}:`, errorMessage);

      const newAttempts = item.attempts + 1;
      const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'queued';

      // Mark as failed or re-queue
      await supabase
        .from('email_queue')
        .update({
          status: newStatus,
          error_message: errorMessage,
        })
        .eq('id', item.id);

      // Log failure
      await supabase.from('email_logs').insert({
        community_id: item.community_id,
        queue_id: item.id,
        recipient_email: item.recipient_email,
        category: item.category,
        subject: item.subject,
        status: 'failed',
        error_message: errorMessage,
      });

      failed++;
    }
  }

  return NextResponse.json({
    processed: queueItems.length,
    sent,
    failed,
  });
}
