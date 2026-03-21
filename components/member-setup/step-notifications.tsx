'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import type { EmailCategory } from '@/lib/types/database';

interface CategoryConfig {
  key: EmailCategory;
  label: string;
  description: string;
  forced?: boolean;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'payment_confirmation',
    label: 'Payment confirmations',
    description: 'Receipts when payments are recorded for your unit',
    forced: true,
  },
  {
    key: 'payment_reminder',
    label: 'Payment reminders',
    description: 'Notifications when invoices are due or overdue',
    forced: true,
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

interface StepNotificationsProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepNotifications({ onNext, onBack }: StepNotificationsProps) {
  const { member, community } = useCommunity();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
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
      for (const cat of CATEGORIES) {
        prefs[cat.key] = true;
      }
      if (data) {
        for (const row of data) {
          prefs[row.category] = row.enabled;
        }
      }
      // Force payment categories on
      prefs.payment_confirmation = true;
      prefs.payment_reminder = true;
      setPreferences(prefs);
      setLoading(false);
    }

    fetchPreferences();
  }, [member]);

  async function toggleCategory(category: EmailCategory, enabled: boolean) {
    if (!member) return;

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
      setPreferences((prev) => ({ ...prev, [category]: !enabled }));
      toast.error('Could not update preference. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface-light-2 dark:bg-surface-dark-2 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Choose which email notifications you want to receive.
        </p>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((cat, i) => (
          <div key={cat.key}>
            {i > 0 && (
              <div className="border-t border-stroke-light dark:border-stroke-dark mb-4" />
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {cat.label}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {cat.description}
                </p>
                {cat.forced && (
                  <p className="text-meta text-secondary-500 mt-0.5">Required for your account</p>
                )}
              </div>
              <Switch
                checked={preferences[cat.key] ?? true}
                onCheckedChange={(checked) => toggleCategory(cat.key, checked)}
                disabled={cat.forced}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
