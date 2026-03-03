'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { toast } from 'sonner';

export function StepCommunityInfo({ onNext }: { onNext: () => void }) {
  const { community } = useCommunity();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: community.name || '',
    address: community.address || '',
    phone: community.phone || '',
    email: community.email || '',
  });

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Community name is required.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('communities')
        .update({
          name: form.name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
        })
        .eq('id', community.id);

      if (error) {
        toast.error('Failed to save community info: ' + error.message);
        return;
      }

      toast.success('Community info saved.');
      onNext();
    } catch (err) {
      console.error('Error saving community info:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
        Community Information
      </h2>
      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-6">
        Confirm or update your community details. This information will appear
        on your portal and in emails sent to residents.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="community-name"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Community Name *
          </Label>
          <Input
            id="community-name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Westwood Estates HOA"
            required
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="community-address"
            className="text-label text-text-secondary-light dark:text-text-secondary-dark"
          >
            Address
          </Label>
          <Input
            id="community-address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="e.g. 123 Main St, Anytown, NC 28779"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="community-phone"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Phone
            </Label>
            <Input
              id="community-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(828) 555-0100"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="community-email"
              className="text-label text-text-secondary-light dark:text-text-secondary-dark"
            >
              Email
            </Label>
            <Input
              id="community-email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="board@community.com"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
