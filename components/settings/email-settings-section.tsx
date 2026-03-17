'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, Clock, Inbox, Loader2, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/shared/ui/switch';
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes';
import { UnsavedChangesDialog } from '@/components/settings/unsaved-changes-dialog';
import { EmailDomainSetup } from '@/components/settings/email-domain-setup';
import { EmailAddressManager } from '@/components/settings/email-address-manager';
import type { EmailSettings } from '@/lib/types/database';

interface RecentLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  created_at: string;
}

export function EmailSettingsSection() {
  const { community } = useCommunity();
  const [replyTo, setReplyTo] = useState('');
  const [fromName, setFromName] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const savedReplyTo = useRef('');
  const savedFromName = useRef('');

  // Community inbox state
  const [inboxEnabled, setInboxEnabled] = useState(false);
  const [togglingInbox, setTogglingInbox] = useState(false);
  const [boardMembersGranted, setBoardMembersGranted] = useState(0);

  useEffect(() => {
    if (!community) return;

    const settings = community.theme?.email_settings as EmailSettings | undefined;
    const r = settings?.reply_to || '';
    const f = settings?.from_name || '';
    setReplyTo(r);
    setFromName(f);
    savedReplyTo.current = r;
    savedFromName.current = f;
    setInboxEnabled(!!settings?.inbox_enabled);

    // Fetch recent email logs
    async function fetchLogs() {
      const supabase = createClient();
      const { data } = await supabase
        .from('email_logs')
        .select('id, recipient_email, subject, status, created_at')
        .eq('community_id', community!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentLogs((data as RecentLog[]) || []);
      setLoadingLogs(false);
    }

    fetchLogs();
  }, [community]);

  const isDirty = useMemo(
    () => replyTo !== savedReplyTo.current || fromName !== savedFromName.current,
    [replyTo, fromName],
  );

  const handleSave = useCallback(async () => {
    if (!community) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...community.theme,
          email_settings: {
            ...(community.theme?.email_settings || {}),
            reply_to: replyTo.trim() || undefined,
            from_name: fromName.trim() || undefined,
          },
        },
      })
      .eq('id', community.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save email settings. Please try again.');
      return;
    }

    savedReplyTo.current = replyTo;
    savedFromName.current = fromName;
    toast.success('Email settings updated.');
  }, [community, replyTo, fromName]);

  const handleToggleInbox = useCallback(async () => {
    if (!community) return;

    const enabling = !inboxEnabled;
    setTogglingInbox(true);

    try {
      if (enabling) {
        const res = await fetch('/api/email/inbox/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ communityId: community.id }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to enable inbox');
          return;
        }

        setInboxEnabled(true);
        setBoardMembersGranted(data.boardMembersGranted || 0);
        toast.success(
          `Community inbox enabled. ${data.boardMembersGranted} board member${data.boardMembersGranted === 1 ? '' : 's'} granted access.`
        );
      } else {
        const res = await fetch('/api/email/inbox/enable', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ communityId: community.id }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || 'Failed to disable inbox');
          return;
        }

        setInboxEnabled(false);
        setBoardMembersGranted(0);
        toast.success('Community inbox disabled.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setTogglingInbox(false);
    }
  }, [community, inboxEnabled]);

  const unsaved = useUnsavedChanges({ isDirty, onSave: handleSave });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  return (
    <>
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Email Notifications
        </h2>
      </div>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
        Configure how email notifications are sent to your community members.
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="from-name"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            From name
          </Label>
          <Input
            id="from-name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder={community?.name || 'Community Name'}
          />
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            The sender name shown in email clients. Defaults to your community name.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="reply-to"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Reply-to email
          </Label>
          <Input
            id="reply-to"
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="board@example.com"
          />
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            When members reply to notifications, responses go to this address.
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Email Settings'}
          </Button>
        </div>
      </div>

      {/* Community inbox toggle */}
      <div className="mt-6 pt-6 border-t border-stroke-light dark:border-stroke-dark">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-inner-card bg-secondary-400/10 flex items-center justify-center shrink-0 mt-0.5">
              <Inbox className="h-4.5 w-4.5 text-secondary-500" />
            </div>
            <div>
              <h3 className="text-label text-text-primary-light dark:text-text-primary-dark mb-0.5">
                Community Inbox
              </h3>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {inboxEnabled
                  ? 'Board members can send and receive emails from the Email page. Manage access below under Email Addresses.'
                  : 'Enable a shared inbox so board members can read and reply to community emails directly from the dashboard.'}
              </p>
            </div>
          </div>
          <div className="shrink-0 pt-0.5">
            {togglingInbox ? (
              <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            ) : (
              <Switch
                checked={inboxEnabled}
                onCheckedChange={handleToggleInbox}
              />
            )}
          </div>
        </div>

        {inboxEnabled && (
          <div className="mt-3 ml-12 flex items-center gap-2 text-meta">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              Active
            </span>
            <span className="text-text-muted-light dark:text-text-muted-dark">
              &middot; All board members have inbox access by default
            </span>
          </div>
        )}
      </div>

      {/* Sending address configuration */}
      <div className="mt-6 pt-6 border-t border-stroke-light dark:border-stroke-dark">
        <EmailDomainSetup />
      </div>

      {/* Email addresses */}
      <div className="mt-6 pt-6 border-t border-stroke-light dark:border-stroke-dark">
        <EmailAddressManager />
      </div>

      {/* Recent email activity */}
      <div className="mt-6 pt-6 border-t border-stroke-light dark:border-stroke-dark">
        <h3 className="text-label text-text-primary-light dark:text-text-primary-dark mb-3">
          Recent Email Activity
        </h3>

        {loadingLogs ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-surface-light-2 dark:bg-surface-dark-2 rounded" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            No emails have been sent yet.
          </p>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-1.5 text-meta"
              >
                {statusIcon(log.status)}
                <span className="flex-1 min-w-0 truncate text-text-primary-light dark:text-text-primary-dark">
                  {log.subject}
                </span>
                <span className="text-text-muted-light dark:text-text-muted-dark shrink-0">
                  {log.recipient_email.split('@')[0]}@...
                </span>
                <span className="text-text-muted-light dark:text-text-muted-dark shrink-0">
                  {new Date(log.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <UnsavedChangesDialog {...unsaved} />
    </>
  );
}
