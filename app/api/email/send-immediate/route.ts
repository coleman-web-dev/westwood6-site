import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/components';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';
import { PaymentConfirmationEmail } from '@/lib/email/templates/payment-confirmation';
import { PaymentReminderEmail } from '@/lib/email/templates/payment-reminder';
import { AnnouncementEmail } from '@/lib/email/templates/announcement';
import { WelcomeInviteEmail } from '@/lib/email/templates/welcome-invite';
import type { EmailCategory } from '@/lib/types/database';

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
    default:
      return null;
  }
}

interface SendImmediateBody {
  communityId: string;
  recipientEmail: string;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
  category: EmailCategory;
}

/**
 * POST /api/email/send-immediate
 * Synchronous email send for immediate-priority emails.
 * Called internally by server actions (not from the client).
 */
export async function POST(req: NextRequest) {
  // Verify this is an internal call via CRON_SECRET or service key
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendImmediateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { communityId, recipientEmail, subject, templateId, templateData, category } = body;

  if (!communityId || !recipientEmail || !subject || !templateId || !templateData) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const resend = getResendClient();

  try {
    // Render template
    const element = renderTemplate(templateId, templateData);
    if (!element) {
      return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
    }

    const html = await render(element);

    // Get community settings
    const { data: community } = await supabase
      .from('communities')
      .select('name, theme')
      .eq('id', communityId)
      .single();

    const emailSettings = (community?.theme as Record<string, unknown>)?.email_settings as Record<string, string> | undefined;
    const fromName = emailSettings?.from_name || community?.name || 'DuesIQ';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'notifications@duesiq.com';
    const from = `${fromName} <${fromAddress}>`;

    // Send
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from,
      to: recipientEmail,
      subject,
      html,
      ...(emailSettings?.reply_to ? { reply_to: emailSettings.reply_to } : {}),
    });

    if (sendError) {
      throw new Error(sendError.message);
    }

    // Log
    await supabase.from('email_logs').insert({
      community_id: communityId,
      recipient_email: recipientEmail,
      category,
      subject,
      resend_message_id: sendResult?.id || null,
      status: 'sent',
    });

    return NextResponse.json({ success: true, messageId: sendResult?.id });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Immediate send failed:', errorMessage);

    // Log failure
    await supabase.from('email_logs').insert({
      community_id: communityId,
      recipient_email: recipientEmail,
      category,
      subject,
      status: 'failed',
      error_message: errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
