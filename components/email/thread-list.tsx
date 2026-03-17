'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Loader2, Paperclip, Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';
import type { EmailThreadWithState } from '@/lib/types/database';

interface ThreadListProps {
  emailAddressId: string | null;
  folder: 'inbox' | 'sent' | 'starred';
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
}

export function ThreadList({
  emailAddressId,
  folder,
  selectedThreadId,
  onSelectThread,
}: ThreadListProps) {
  const { member } = useCommunity();
  const [threads, setThreads] = useState<EmailThreadWithState[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    if (!emailAddressId || !member) return;

    const supabase = createClient();
    setLoading(true);

    try {
      if (folder === 'inbox' || folder === 'starred') {
        // Fetch threads with member state
        let query = supabase
          .from('email_threads')
          .select(
            `
            id,
            community_id,
            email_address_id,
            subject,
            last_message_at,
            message_count,
            is_archived,
            created_at,
            email_thread_members!inner (
              is_read,
              is_starred,
              is_assigned,
              last_read_at
            )
          `
          )
          .eq('email_address_id', emailAddressId)
          .eq('email_thread_members.member_id', member.id)
          .eq('is_archived', false)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (folder === 'starred') {
          query = query.eq('email_thread_members.is_starred', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Failed to fetch threads:', error);
          setThreads([]);
          return;
        }

        // Flatten the joined data
        const flatThreads: EmailThreadWithState[] = (data || []).map((t) => {
          const memberState = Array.isArray(t.email_thread_members)
            ? t.email_thread_members[0]
            : t.email_thread_members;

          return {
            id: t.id,
            community_id: t.community_id,
            email_address_id: t.email_address_id,
            subject: t.subject,
            last_message_at: t.last_message_at,
            message_count: t.message_count,
            is_archived: t.is_archived,
            created_at: t.created_at,
            is_read: memberState?.is_read ?? true,
            is_starred: memberState?.is_starred ?? false,
            is_assigned: memberState?.is_assigned ?? false,
            last_read_at: memberState?.last_read_at ?? null,
          };
        });

        // Fetch latest inbound message for each thread (for preview)
        if (flatThreads.length > 0) {
          const threadIds = flatThreads.map((t) => t.id);
          const { data: latestMessages } = await supabase
            .from('email_inbox')
            .select('thread_id, from_address, from_name, snippet, has_attachments')
            .in('thread_id', threadIds)
            .order('received_at', { ascending: false });

          if (latestMessages) {
            // Group by thread, take first (latest) per thread
            const latestByThread = new Map<string, (typeof latestMessages)[0]>();
            for (const msg of latestMessages) {
              if (msg.thread_id && !latestByThread.has(msg.thread_id)) {
                latestByThread.set(msg.thread_id, msg);
              }
            }

            for (const thread of flatThreads) {
              const latest = latestByThread.get(thread.id);
              if (latest) {
                thread.latest_from_address = latest.from_address;
                thread.latest_from_name = latest.from_name;
                thread.latest_snippet = latest.snippet;
                thread.has_attachments = latest.has_attachments;
              }
            }
          }
        }

        setThreads(flatThreads);
      } else if (folder === 'sent') {
        // For sent folder, group by threads that have sent messages
        const { data: sentMessages } = await supabase
          .from('email_sent_messages')
          .select(
            `
            thread_id,
            to_addresses,
            subject,
            sent_at,
            email_threads (
              id,
              community_id,
              email_address_id,
              subject,
              last_message_at,
              message_count,
              is_archived,
              created_at
            )
          `
          )
          .eq('email_address_id', emailAddressId)
          .eq('sender_member_id', member.id)
          .order('sent_at', { ascending: false })
          .limit(50);

        if (sentMessages) {
          const seenThreads = new Set<string>();
          const sentThreads: EmailThreadWithState[] = [];

          for (const msg of sentMessages) {
            if (!msg.thread_id || seenThreads.has(msg.thread_id)) continue;
            seenThreads.add(msg.thread_id);

            const thread = msg.email_threads as unknown as EmailThreadWithState;
            if (!thread) continue;

            sentThreads.push({
              ...thread,
              is_read: true,
              is_starred: false,
              is_assigned: false,
              last_read_at: null,
              latest_from_address: msg.to_addresses?.[0],
              latest_from_name: null,
              latest_snippet: `To: ${msg.to_addresses?.join(', ')}`,
            });
          }

          setThreads(sentThreads);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [emailAddressId, member, folder]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          {folder === 'inbox' && 'No emails yet'}
          {folder === 'sent' && 'No sent emails'}
          {folder === 'starred' && 'No starred emails'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
      <div className="flex items-center justify-end px-3 py-2">
        <Button variant="ghost" size="sm" onClick={fetchThreads}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onSelectThread(thread.id)}
          className={cn(
            'w-full text-left px-4 py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors',
            selectedThreadId === thread.id &&
              'bg-secondary-400/10 dark:bg-secondary-400/10',
            !thread.is_read && 'bg-surface-light-2/50 dark:bg-surface-dark-2/50'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={cn(
                    'text-body truncate',
                    !thread.is_read
                      ? 'font-semibold text-text-primary-light dark:text-text-primary-dark'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                  )}
                >
                  {thread.latest_from_name || thread.latest_from_address || 'Unknown'}
                </span>
                {thread.message_count > 1 && (
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
                    ({thread.message_count})
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'text-body truncate',
                  !thread.is_read
                    ? 'font-medium text-text-primary-light dark:text-text-primary-dark'
                    : 'text-text-secondary-light dark:text-text-secondary-dark'
                )}
              >
                {thread.subject || '(No subject)'}
              </div>
              {thread.latest_snippet && (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate mt-0.5">
                  {thread.latest_snippet}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                {formatRelativeDate(thread.last_message_at)}
              </span>
              <div className="flex items-center gap-1">
                {thread.is_starred && (
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                )}
                {thread.has_attachments && (
                  <Paperclip className="h-3 w-3 text-text-muted-light dark:text-text-muted-dark" />
                )}
                {!thread.is_read && (
                  <span className="w-2 h-2 rounded-full bg-secondary-400" />
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
