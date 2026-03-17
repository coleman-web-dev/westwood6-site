'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { Mail, Send, Inbox, Star, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { cn } from '@/lib/utils';
import { ThreadList } from '@/components/email/thread-list';
import { ThreadView } from '@/components/email/thread-view';
import { ComposeDialog } from '@/components/email/compose-dialog';
import type { EmailAddress } from '@/lib/types/database';

type Folder = 'inbox' | 'sent' | 'starred';

export default function EmailPage() {
  const { isBoard, member, community } = useCommunity();

  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyThreadId, setReplyThreadId] = useState<string | undefined>();
  const [replyInReplyTo, setReplyInReplyTo] = useState<string | undefined>();
  const [replySubject, setReplySubject] = useState<string | undefined>();
  const [replyTo, setReplyTo] = useState<string | undefined>();

  const fetchAddresses = useCallback(async () => {
    if (!member || !community) return;

    const supabase = createClient();

    // Get addresses the member has access to
    const { data: access } = await supabase
      .from('email_inbox_access')
      .select('email_address_id')
      .eq('member_id', member.id)
      .eq('community_id', community.id)
      .eq('can_read', true);

    if (!access?.length) {
      setEmailAddresses([]);
      setLoading(false);
      return;
    }

    const addressIds = access.map((a) => a.email_address_id);

    const { data: addresses } = await supabase
      .from('email_addresses')
      .select('*')
      .in('id', addressIds)
      .eq('mailbox_type', 'full_inbox');

    setEmailAddresses(addresses || []);
    if (addresses?.length && !activeAddressId) {
      setActiveAddressId(addresses[0].id);
    }
    setLoading(false);
  }, [member, community, activeAddressId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!member || !activeAddressId) return;

    const supabase = createClient();

    const { count } = await supabase
      .from('email_thread_members')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [member, activeAddressId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  function handleReply(threadId: string, inReplyTo: string, subject: string) {
    setReplyThreadId(threadId);
    setReplyInReplyTo(inReplyTo);
    setReplySubject(subject);
    setReplyTo(undefined); // TODO: could pre-fill from thread
    setComposeOpen(true);
  }

  function handleCompose() {
    setReplyThreadId(undefined);
    setReplyInReplyTo(undefined);
    setReplySubject(undefined);
    setReplyTo(undefined);
    setComposeOpen(true);
  }

  function handleSent() {
    // Refresh the thread list and unread count
    fetchUnreadCount();
  }

  if (!isBoard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Email is only available for board members.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-5 h-5 border-2 border-secondary-400/30 border-t-secondary-400 rounded-full animate-spin" />
      </div>
    );
  }

  // No email addresses configured
  if (emailAddresses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Email
        </h1>
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-light-2 dark:bg-surface-dark-2 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-text-muted-light dark:text-text-muted-dark" />
            </div>
            <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-2">
              No inbox configured
            </h2>
            <p className="text-body text-text-muted-light dark:text-text-muted-dark max-w-sm mb-4">
              Set up your community inbox in Settings to start sending and receiving
              emails. An admin needs to enable the community inbox and grant you access.
            </p>
            <Button variant="outline" asChild>
              <a href={`/${community.slug}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeAddress = emailAddresses.find((a) => a.id === activeAddressId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Email
        </h1>
        <Button onClick={handleCompose}>
          <Plus className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      {/* Address selector (if multiple) */}
      {emailAddresses.length > 1 && (
        <div className="flex gap-2">
          {emailAddresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => {
                setActiveAddressId(addr.id);
                setSelectedThreadId(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-pill text-label transition-colors',
                addr.id === activeAddressId
                  ? 'bg-secondary-400/15 text-secondary-400'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
              )}
            >
              {addr.address}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-grid-gap lg:grid-cols-[240px_1fr] min-h-[500px]">
        {/* Sidebar - folders */}
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-1">
          <FolderButton
            icon={Inbox}
            label="Inbox"
            active={folder === 'inbox'}
            badge={unreadCount > 0 ? unreadCount : undefined}
            onClick={() => {
              setFolder('inbox');
              setSelectedThreadId(null);
            }}
          />
          <FolderButton
            icon={Send}
            label="Sent"
            active={folder === 'sent'}
            onClick={() => {
              setFolder('sent');
              setSelectedThreadId(null);
            }}
          />
          <FolderButton
            icon={Star}
            label="Starred"
            active={folder === 'starred'}
            onClick={() => {
              setFolder('starred');
              setSelectedThreadId(null);
            }}
          />

          {/* Active address info */}
          {activeAddress && (
            <div className="pt-4 mt-4 border-t border-stroke-light dark:border-stroke-dark">
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
                Inbox
              </p>
              <p className="text-label text-text-secondary-light dark:text-text-secondary-dark truncate">
                {activeAddress.address}
              </p>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel overflow-hidden">
          {selectedThreadId && activeAddressId ? (
            <ThreadView
              threadId={selectedThreadId}
              emailAddressId={activeAddressId}
              onBack={() => setSelectedThreadId(null)}
              onReply={handleReply}
            />
          ) : (
            <ThreadList
              emailAddressId={activeAddressId}
              folder={folder}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
            />
          )}
        </div>
      </div>

      {/* Compose dialog */}
      {activeAddress && (
        <ComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          emailAddressId={activeAddress.id}
          fromAddress={activeAddress.address}
          replyThreadId={replyThreadId}
          replyInReplyTo={replyInReplyTo}
          replySubject={replySubject}
          replyTo={replyTo}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

function FolderButton({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-inner-card transition-colors text-body',
        active
          ? 'bg-secondary-400/15 text-secondary-400 font-medium'
          : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 min-w-[20px] text-center"
        >
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </button>
  );
}
