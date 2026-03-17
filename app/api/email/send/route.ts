import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/email/send
 * Send an email from the community inbox (compose or reply).
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  const {
    emailAddressId,
    communityId,
    to,
    cc,
    bcc,
    subject,
    bodyHtml,
    bodyText,
    threadId,
    inReplyTo,
  } = body as {
    emailAddressId: string;
    communityId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    threadId?: string;
    inReplyTo?: string;
  };

  if (!emailAddressId || !communityId || !to?.length || !subject) {
    return NextResponse.json(
      { error: 'emailAddressId, communityId, to, and subject are required' },
      { status: 400 }
    );
  }

  // 2. Verify membership and inbox access
  const { data: member } = await supabase
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
  }

  const { data: access } = await supabase
    .from('email_inbox_access')
    .select('can_compose, can_reply')
    .eq('email_address_id', emailAddressId)
    .eq('member_id', member.id)
    .single();

  if (!access) {
    return NextResponse.json({ error: 'No inbox access' }, { status: 403 });
  }

  const isReply = !!threadId && !!inReplyTo;
  if (isReply && !access.can_reply) {
    return NextResponse.json({ error: 'Reply access not granted' }, { status: 403 });
  }
  if (!isReply && !access.can_compose) {
    return NextResponse.json({ error: 'Compose access not granted' }, { status: 403 });
  }

  // 3. Get the email address to send from
  const { data: emailAddr } = await supabase
    .from('email_addresses')
    .select('address, display_name')
    .eq('id', emailAddressId)
    .eq('community_id', communityId)
    .single();

  if (!emailAddr) {
    return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
  }

  // 4. Build and send via Resend
  const messageId = `<${crypto.randomUUID()}@duesiq.com>`;
  const fromDisplay = emailAddr.display_name || emailAddr.address;
  const fromHeader = `${fromDisplay} <${emailAddr.address}>`;

  const resend = getResendClient();

  const headers: Record<string, string> = {
    'Message-ID': messageId,
  };

  if (inReplyTo) {
    headers['In-Reply-To'] = inReplyTo;
    headers['References'] = inReplyTo;
  }

  try {
    const sendPayload: Record<string, unknown> = {
      from: fromHeader,
      to,
      cc: cc || [],
      bcc: bcc || [],
      subject,
      headers,
      replyTo: emailAddr.address,
    };

    if (bodyHtml) sendPayload.html = bodyHtml;
    if (bodyText) sendPayload.text = bodyText;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sendResult, error: sendError } = await resend.emails.send(sendPayload as any);

    if (sendError) {
      console.error('Resend send error:', sendError);
      return NextResponse.json(
        { error: sendError.message || 'Failed to send email' },
        { status: 500 }
      );
    }

    // 5. Handle thread - create new or update existing
    let finalThreadId = threadId || null;

    if (!finalThreadId) {
      // New compose - create thread
      const { data: newThread, error: threadError } = await supabase
        .from('email_threads')
        .insert({
          community_id: communityId,
          email_address_id: emailAddressId,
          subject,
          last_message_at: new Date().toISOString(),
          message_count: 1,
        })
        .select('id')
        .single();

      if (threadError) {
        console.error('Failed to create thread:', threadError);
      } else {
        finalThreadId = newThread.id;
      }
    } else {
      // Reply - update thread
      await supabase.rpc('increment_thread_message_count', {
        thread_uuid: finalThreadId,
      });
    }

    // 6. Store the sent message
    const { data: sentMsg, error: sentError } = await supabase
      .from('email_sent_messages')
      .insert({
        community_id: communityId,
        email_address_id: emailAddressId,
        sender_member_id: member.id,
        to_addresses: to,
        cc_addresses: cc || [],
        bcc_addresses: bcc || [],
        subject,
        body_html: bodyHtml || null,
        body_text: bodyText || null,
        thread_id: finalThreadId,
        in_reply_to: inReplyTo || null,
        message_id: messageId,
        resend_message_id: sendResult?.id || null,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (sentError) {
      console.error('Failed to store sent message:', sentError);
    }

    // 7. Mark thread as read for the sender
    if (finalThreadId) {
      await supabase
        .from('email_thread_members')
        .upsert(
          {
            thread_id: finalThreadId,
            member_id: member.id,
            is_read: true,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'thread_id,member_id' }
        );
    }

    return NextResponse.json({
      status: 'sent',
      messageId: sentMsg?.id,
      threadId: finalThreadId,
      resendMessageId: sendResult?.id,
    });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
