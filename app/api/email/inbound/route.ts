import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Webhook } from 'svix';
import { sendEmailDirect } from '@/lib/email/resend';
import { render } from '@react-email/components';
import { InboxForwardEmail } from '@/lib/email/templates/inbox-forward';
import crypto from 'crypto';

export const runtime = 'nodejs';

interface ResendInboundPayload {
  type: 'email.received';
  created_at: string;
  data: {
    id: string;
    from: string;
    to: string[];
    cc?: string[];
    subject: string;
    text?: string;
    html?: string;
    headers: Array<{ name: string; value: string }>;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size: number;
      content: string; // base64
    }>;
  };
}

/**
 * POST /api/email/inbound
 * Resend inbound email webhook handler.
 * Receives emails sent to community addresses, stores them in the inbox,
 * handles threading, and forwards to authorized members.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('RESEND_INBOUND_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await req.text();

  // Verify Resend webhook signature (uses Svix)
  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing webhook signature headers' },
      { status: 400 }
    );
  }

  let payload: ResendInboundPayload;

  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendInboundPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Inbound webhook signature verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (payload.type !== 'email.received') {
    return NextResponse.json({ status: 'ignored' });
  }

  const supabase = createAdminClient();
  const { data: emailData } = payload;

  try {
    // Find the email_address matching the "to" address
    const toAddresses = emailData.to.map((a) => a.toLowerCase());

    const { data: matchedAddress } = await supabase
      .from('email_addresses')
      .select('id, community_id, address, display_name, mailbox_type')
      .in('address', toAddresses)
      .eq('mailbox_type', 'full_inbox')
      .limit(1)
      .single();

    if (!matchedAddress) {
      console.warn('Inbound email to unknown address:', toAddresses);
      return NextResponse.json({ status: 'no_matching_address' });
    }

    const communityId = matchedAddress.community_id;
    const emailAddressId = matchedAddress.id;

    // Parse sender display name from "Name <email>" format
    const fromMatch = emailData.from.match(/^(.+?)\s*<(.+)>$/);
    const fromName = fromMatch ? fromMatch[1].replace(/^"|"$/g, '') : null;
    const fromAddress = fromMatch ? fromMatch[2] : emailData.from;

    // Generate a snippet from the text body
    const snippet = emailData.text
      ? emailData.text.substring(0, 200).replace(/\s+/g, ' ').trim()
      : null;

    // Generate a unique Message-ID for this inbound message
    const messageId = `<${crypto.randomUUID()}@duesiq.com>`;

    // Extract In-Reply-To and References headers for threading
    const inReplyTo =
      emailData.headers?.find((h) => h.name.toLowerCase() === 'in-reply-to')?.value || null;
    const references =
      emailData.headers?.find((h) => h.name.toLowerCase() === 'references')?.value || null;

    // Thread matching: check if this is a reply to an existing thread
    let threadId: string | null = null;

    if (inReplyTo || references) {
      // Try to find an existing message matching In-Reply-To or References
      const refMessageIds = [
        ...(inReplyTo ? [inReplyTo] : []),
        ...(references ? references.split(/\s+/) : []),
      ];

      // Check inbox messages
      const { data: inboxMatch } = await supabase
        .from('email_inbox')
        .select('thread_id')
        .eq('community_id', communityId)
        .in('message_id', refMessageIds)
        .not('thread_id', 'is', null)
        .limit(1)
        .single();

      if (inboxMatch?.thread_id) {
        threadId = inboxMatch.thread_id;
      }

      // If not found in inbox, check sent messages
      if (!threadId) {
        const { data: sentMatch } = await supabase
          .from('email_sent_messages')
          .select('thread_id')
          .eq('community_id', communityId)
          .in('message_id', refMessageIds)
          .not('thread_id', 'is', null)
          .limit(1)
          .single();

        if (sentMatch?.thread_id) {
          threadId = sentMatch.thread_id;
        }
      }
    }

    // Create a new thread if no match found
    if (!threadId) {
      const { data: newThread, error: threadError } = await supabase
        .from('email_threads')
        .insert({
          community_id: communityId,
          email_address_id: emailAddressId,
          subject: emailData.subject || '(No subject)',
          last_message_at: new Date().toISOString(),
          message_count: 1,
        })
        .select('id')
        .single();

      if (threadError) {
        console.error('Failed to create thread:', threadError);
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
      }

      threadId = newThread.id;
    } else {
      // Increment message count and update timestamp via RPC
      await supabase.rpc('increment_thread_message_count', { thread_uuid: threadId });
    }

    // Store the inbound message
    const hasAttachments = (emailData.attachments?.length || 0) > 0;

    const { data: inboxMsg, error: inboxError } = await supabase
      .from('email_inbox')
      .insert({
        community_id: communityId,
        email_address_id: emailAddressId,
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: emailData.to,
        cc_addresses: emailData.cc || [],
        subject: emailData.subject || '(No subject)',
        body_text: emailData.text || null,
        body_html: emailData.html || null,
        snippet,
        thread_id: threadId,
        in_reply_to: inReplyTo,
        message_id: messageId,
        has_attachments: hasAttachments,
        resend_inbound_id: emailData.id,
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (inboxError) {
      console.error('Failed to store inbound message:', inboxError);
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
    }

    // Store attachments in Supabase Storage
    if (emailData.attachments?.length) {
      for (const att of emailData.attachments) {
        const storagePath = `${communityId}/${inboxMsg.id}/${att.filename}`;
        const buffer = Buffer.from(att.content, 'base64');

        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, buffer, {
            contentType: att.content_type,
          });

        if (uploadError) {
          console.error('Failed to upload attachment:', uploadError);
          continue;
        }

        await supabase.from('email_attachments').insert({
          inbox_message_id: inboxMsg.id,
          filename: att.filename,
          content_type: att.content_type,
          size_bytes: att.size,
          storage_path: storagePath,
        });
      }
    }

    // Get all members with inbox access for this address
    const { data: accessList } = await supabase
      .from('email_inbox_access')
      .select('member_id, notify_forward')
      .eq('email_address_id', emailAddressId)
      .eq('can_read', true);

    if (accessList?.length) {
      // Reset is_read = false for all members on this thread
      for (const access of accessList) {
        await supabase
          .from('email_thread_members')
          .upsert(
            {
              thread_id: threadId,
              member_id: access.member_id,
              is_read: false,
            },
            { onConflict: 'thread_id,member_id' }
          );
      }

      // Create in-app notifications
      const notifications = accessList.map((access) => ({
        community_id: communityId,
        member_id: access.member_id,
        type: 'general' as const,
        title: `New email from ${fromName || fromAddress}`,
        body: emailData.subject || '(No subject)',
      }));

      await supabase.from('notifications').insert(notifications);

      // Forward to members with notify_forward = true
      const forwardMembers = accessList.filter((a) => a.notify_forward);

      // Also check for forward_to on the email address itself (role address forwarding)
      const { data: addrForward } = await supabase
        .from('email_addresses')
        .select('forward_to')
        .eq('id', emailAddressId)
        .single();

      const { data: community } = await supabase
        .from('communities')
        .select('name, slug')
        .eq('id', communityId)
        .single();

      if (community) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
        const emailUrl = `${appUrl}/${community.slug}/email`;

        // Collect all forward target emails (from access-based forwarding + address-level forward_to)
        const forwardTargets = new Set<string>();

        if (forwardMembers.length) {
          const memberIds = forwardMembers.map((a) => a.member_id);
          const { data: members } = await supabase
            .from('members')
            .select('id, email, first_name')
            .in('id', memberIds)
            .not('email', 'is', null);

          if (members?.length) {
            for (const member of members) {
              if (!member.email) continue;
              forwardTargets.add(member.email);

              try {
                const html = await render(
                  InboxForwardEmail({
                    communityName: community.name,
                    fromName: fromName || fromAddress,
                    fromAddress,
                    subject: emailData.subject || '(No subject)',
                    snippet: snippet || '',
                    emailUrl,
                    recipientName: member.first_name || 'there',
                  })
                );

                await sendEmailDirect({
                  to: member.email,
                  subject: `[${community.name}] ${emailData.subject || '(No subject)'}`,
                  html,
                  from: `${community.name} <notifications@duesiq.com>`,
                });
              } catch (err) {
                console.error(`Failed to forward to ${member.email}:`, err);
              }
            }
          }
        }

        // Forward to address-level forward_to if set and not already covered
        if (addrForward?.forward_to && !forwardTargets.has(addrForward.forward_to)) {
          try {
            const html = await render(
              InboxForwardEmail({
                communityName: community.name,
                fromName: fromName || fromAddress,
                fromAddress,
                subject: emailData.subject || '(No subject)',
                snippet: snippet || '',
                emailUrl,
                recipientName: 'there',
              })
            );

            await sendEmailDirect({
              to: addrForward.forward_to,
              subject: `[${community.name}] ${emailData.subject || '(No subject)'}`,
              html,
              from: `${community.name} <notifications@duesiq.com>`,
            });
          } catch (err) {
            console.error(`Failed to forward to ${addrForward.forward_to}:`, err);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok', threadId, messageId: inboxMsg.id });
  } catch (err) {
    console.error('Inbound webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
