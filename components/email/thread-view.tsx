'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  ArrowLeft,
  Star,
  UserCheck,
  Loader2,
  Paperclip,
  Download,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils';
import type {
  EmailThread,
  EmailThreadMessage,
  EmailAttachment,
} from '@/lib/types/database';

interface ThreadViewProps {
  threadId: string;
  emailAddressId: string;
  onBack: () => void;
  onReply: (threadId: string, inReplyTo: string, subject: string) => void;
}

export function ThreadView({
  threadId,
  emailAddressId,
  onBack,
  onReply,
}: ThreadViewProps) {
  const { member, community } = useCommunity();
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [isAssigned, setIsAssigned] = useState(false);

  const fetchThread = useCallback(async () => {
    if (!member) return;

    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch thread
      const { data: threadData } = await supabase
        .from('email_threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadData) {
        setThread(threadData);
      }

      // Fetch inbound messages
      const { data: inbound } = await supabase
        .from('email_inbox')
        .select('*, email_attachments(*)')
        .eq('thread_id', threadId)
        .order('received_at', { ascending: true });

      // Fetch outbound messages
      const { data: outbound } = await supabase
        .from('email_sent_messages')
        .select('*, email_attachments(*)')
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: true });

      // Merge and sort by timestamp
      const allMessages: EmailThreadMessage[] = [];

      if (inbound) {
        for (const msg of inbound) {
          allMessages.push({
            id: msg.id,
            direction: 'inbound',
            from_address: msg.from_address,
            from_name: msg.from_name,
            to_addresses: msg.to_addresses || [],
            cc_addresses: msg.cc_addresses || [],
            subject: msg.subject,
            body_html: msg.body_html,
            body_text: msg.body_text,
            has_attachments: msg.has_attachments,
            attachments: msg.email_attachments || [],
            timestamp: msg.received_at,
          });
        }
      }

      if (outbound) {
        for (const msg of outbound) {
          allMessages.push({
            id: msg.id,
            direction: 'outbound',
            from_address: '', // sent from community address
            from_name: null,
            to_addresses: msg.to_addresses || [],
            cc_addresses: msg.cc_addresses || [],
            subject: msg.subject,
            body_html: msg.body_html,
            body_text: msg.body_text,
            has_attachments: (msg.email_attachments?.length || 0) > 0,
            attachments: msg.email_attachments || [],
            timestamp: msg.sent_at,
            sender_member_id: msg.sender_member_id,
          });
        }
      }

      allMessages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setMessages(allMessages);

      // Fetch member state
      const { data: memberState } = await supabase
        .from('email_thread_members')
        .select('is_starred, is_assigned')
        .eq('thread_id', threadId)
        .eq('member_id', member.id)
        .single();

      if (memberState) {
        setIsStarred(memberState.is_starred);
        setIsAssigned(memberState.is_assigned);
      }

      // Mark as read
      await supabase.from('email_thread_members').upsert(
        {
          thread_id: threadId,
          member_id: member.id,
          is_read: true,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'thread_id,member_id' }
      );
    } finally {
      setLoading(false);
    }
  }, [threadId, member]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  async function toggleStar() {
    if (!member) return;
    const supabase = createClient();
    const newVal = !isStarred;
    setIsStarred(newVal);

    await supabase.from('email_thread_members').upsert(
      {
        thread_id: threadId,
        member_id: member.id,
        is_starred: newVal,
      },
      { onConflict: 'thread_id,member_id' }
    );
  }

  async function toggleAssign() {
    if (!member) return;
    const supabase = createClient();
    const newVal = !isAssigned;
    setIsAssigned(newVal);

    await supabase.from('email_thread_members').upsert(
      {
        thread_id: threadId,
        member_id: member.id,
        is_assigned: newVal,
      },
      { onConflict: 'thread_id,member_id' }
    );
  }

  function handleReply() {
    if (!thread || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const lastMessageId =
      lastMessage.direction === 'inbound'
        ? // For inbound, we stored message_id in the DB but it's not on the union type
          // Use the message id as in_reply_to
          lastMessage.id
        : lastMessage.id;

    onReply(
      threadId,
      lastMessageId,
      thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stroke-light dark:border-stroke-dark">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark flex-1 truncate">
          {thread?.subject || '(No subject)'}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleStar}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={cn(
                'h-4 w-4',
                isStarred
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-text-muted-light dark:text-text-muted-dark'
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAssign}
            title={isAssigned ? 'Unassign' : 'Assign to me'}
          >
            <UserCheck
              className={cn(
                'h-4 w-4',
                isAssigned
                  ? 'text-mint'
                  : 'text-text-muted-light dark:text-text-muted-dark'
              )}
            />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReply}>
            <Reply className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            communityId={community.id}
          />
        ))}
      </div>

      {/* Reply bar */}
      <div className="border-t border-stroke-light dark:border-stroke-dark p-3">
        <Button variant="outline" className="w-full" onClick={handleReply}>
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  communityId,
}: {
  message: EmailThreadMessage;
  communityId: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const isOutbound = message.direction === 'outbound';

  return (
    <div
      className={cn(
        'rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden',
        isOutbound && 'bg-secondary-400/5'
      )}
    >
      {/* Message header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isOutbound ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Sent
              </Badge>
            ) : null}
            <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
              {isOutbound
                ? `To: ${message.to_addresses.join(', ')}`
                : message.from_name || message.from_address}
            </span>
          </div>
          {!isOutbound && (
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {message.from_address}
            </span>
          )}
        </div>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
          {new Date(message.timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      </button>

      {/* Message body */}
      {expanded && (
        <div className="px-4 pb-4">
          {message.body_html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-body text-text-primary-light dark:text-text-primary-dark"
              dangerouslySetInnerHTML={{ __html: message.body_html }}
            />
          ) : (
            <pre className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap font-sans">
              {message.body_text || '(No content)'}
            </pre>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 space-y-1">
              {message.attachments.map((att: EmailAttachment) => (
                <AttachmentLink
                  key={att.id}
                  attachment={att}
                  communityId={communityId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentLink({
  attachment,
  communityId,
}: {
  attachment: EmailAttachment;
  communityId: string;
}) {
  async function handleDownload() {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('email-attachments')
      .createSignedUrl(attachment.storage_path, 300);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  }

  const sizeLabel =
    attachment.size_bytes > 1024 * 1024
      ? `${(attachment.size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(attachment.size_bytes / 1024)} KB`;

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 text-body text-secondary-400 hover:underline"
    >
      <Paperclip className="h-3.5 w-3.5" />
      <span>{attachment.filename}</span>
      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
        ({sizeLabel})
      </span>
      <Download className="h-3 w-3" />
    </button>
  );
}
