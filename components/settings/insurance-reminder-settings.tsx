'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';
import type { CommunityTheme } from '@/lib/types/database';

const DEFAULT_DAYS = [60, 30, 7];

interface Props {
  communityId: string;
  communityTheme: CommunityTheme;
}

export function InsuranceReminderSettings({ communityId, communityTheme }: Props) {
  const router = useRouter();
  const currentDays = communityTheme.vendor_settings?.insurance_reminder_days ?? DEFAULT_DAYS;

  const [day1, setDay1] = useState(currentDays[0] ?? 60);
  const [day2, setDay2] = useState(currentDays[1] ?? 30);
  const [day3, setDay3] = useState(currentDays[2] ?? 7);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const days = [day1, day2, day3].filter((d) => d > 0).sort((a, b) => b - a);
    if (days.length === 0) {
      toast.error('At least one reminder day is required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...communityTheme,
          vendor_settings: {
            ...communityTheme.vendor_settings,
            insurance_reminder_days: days,
          },
        },
      })
      .eq('id', communityId);

    setSaving(false);

    if (error) {
      toast.error('Failed to save reminder settings.');
      return;
    }

    toast.success('Insurance reminder settings updated.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Insurance Reminders
        </h3>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Board members receive email reminders when a vendor&apos;s insurance is about to expire.
          Set how many days before expiry to send each reminder.
        </p>
      </div>
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            1st reminder
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={365}
              className="h-8 w-20 text-body"
              value={day1}
              onChange={(e) => setDay1(parseInt(e.target.value) || 0)}
            />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">days</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            2nd reminder
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={365}
              className="h-8 w-20 text-body"
              value={day2}
              onChange={(e) => setDay2(parseInt(e.target.value) || 0)}
            />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">days</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            3rd reminder
          </Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={365}
              className="h-8 w-20 text-body"
              value={day3}
              onChange={(e) => setDay3(parseInt(e.target.value) || 0)}
            />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">days</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
