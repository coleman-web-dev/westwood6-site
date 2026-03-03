'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import type { EmailCategory } from '@/lib/types/database';

interface CategoryConfig {
  key: EmailCategory;
  label: string;
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'payment_confirmation',
    label: 'Payment confirmations',
    description: 'Receipts when payments are recorded for your unit',
  },
  {
    key: 'payment_reminder',
    label: 'Payment reminders',
    description: 'Notifications when invoices are due or overdue',
  },
  {
    key: 'announcement',
    label: 'Announcements',
    description: 'Community announcements from the board',
  },
  {
    key: 'maintenance_update',
    label: 'Maintenance updates',
    description: 'Updates on maintenance requests you submitted',
  },
  {
    key: 'voting_notice',
    label: 'Voting notices',
    description: 'Notifications about new ballots, reminders, and results',
  },
  {
    key: 'reservation_update',
    label: 'Reservation updates',
    description: 'Booking confirmations, approvals, and cancellations',
  },
  {
    key: 'weekly_digest',
    label: 'Weekly digest',
    description: 'A weekly summary of activity, balances, and events',
  },
];

export function EmailPreferences() {
  const { member, community } = useCommunity();
  const [preferences, setPreferences] = useState<Record<EmailCategory, boolean>>({} as Record<EmailCategory, boolean>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;

    async function fetchPreferences() {
      const supabase = createClient();
      const { data } = await supabase
        .from('email_preferences')
        .select('category, enabled')
        .eq('member_id', member!.id);

      const prefs: Record<string, boolean> = {};
      // Default all to true
      for (const cat of CATEGORIES) {
        prefs[cat.key] = true;
      }
      // Override with saved preferences
      if (data) {
        for (const row of data) {
          prefs[row.category] = row.enabled;
        }
      }
      setPreferences(prefs as Record<EmailCategory, boolean>);
      setLoading(false);
    }

    fetchPreferences();
  }, [member]);

  async function toggleCategory(category: EmailCategory, enabled: boolean) {
    if (!member) return;

    // Optimistic update
    setPreferences((prev) => ({ ...prev, [category]: enabled }));

    const supabase = createClient();
    const { error } = await supabase
      .from('email_preferences')
      .upsert(
        {
          member_id: member.id,
          community_id: community.id,
          category,
          enabled,
        },
        { onConflict: 'member_id,category' },
      );

    if (error) {
      // Revert
      setPreferences((prev) => ({ ...prev, [category]: !enabled }));
      toast.error('Could not update email preference. Please try again.');
      console.error('Email preference update failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
          Email Notifications
        </h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-light-2 dark:bg-surface-dark-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Email Notifications
      </h2>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
        Choose which email notifications you receive. System emails (account confirmations, password resets) cannot be disabled.
      </p>

      <div className="space-y-4">
        {CATEGORIES.map((cat, i) => (
          <div key={cat.key}>
            {i > 0 && (
              <div className="border-t border-stroke-light dark:border-stroke-dark mb-4" />
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {cat.label}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {cat.description}
                </p>
              </div>
              <Switch
                checked={preferences[cat.key] ?? true}
                onCheckedChange={(checked) => toggleCategory(cat.key, checked)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
