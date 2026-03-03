'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
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

  useEffect(() => {
    if (!community) return;

    const settings = community.theme?.email_settings as EmailSettings | undefined;
    setReplyTo(settings?.reply_to || '');
    setFromName(settings?.from_name || '');

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

  async function handleSave() {
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

    toast.success('Email settings updated.');
  }

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
  );
}
