'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';

interface StepProfileProps {
  onNext: () => void;
}

export function StepProfile({ onNext }: StepProfileProps) {
  const { member, unit } = useCommunity();

  const [firstName, setFirstName] = useState(member?.first_name ?? '');
  const [lastName, setLastName] = useState(member?.last_name ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [useUnitAddress, setUseUnitAddress] = useState(member?.use_unit_address !== false);
  const [mailingLine1, setMailingLine1] = useState(member?.mailing_address_line1 ?? '');
  const [mailingLine2, setMailingLine2] = useState(member?.mailing_address_line2 ?? '');
  const [mailingCity, setMailingCity] = useState(member?.mailing_city ?? '');
  const [mailingState, setMailingState] = useState(member?.mailing_state ?? '');
  const [mailingZip, setMailingZip] = useState(member?.mailing_zip ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      toast.error('First and last name are required.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('members')
      .update({
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone: phone.trim() || null,
        use_unit_address: useUnitAddress,
        mailing_address_line1: useUnitAddress ? null : mailingLine1.trim() || null,
        mailing_address_line2: useUnitAddress ? null : mailingLine2.trim() || null,
        mailing_city: useUnitAddress ? null : mailingCity.trim() || null,
        mailing_state: useUnitAddress ? null : mailingState.trim() || null,
        mailing_zip: useUnitAddress ? null : mailingZip.trim() || null,
      })
      .eq('id', member!.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save your info. Please try again.');
      return;
    }

    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Confirm your contact information. You can update these later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={member?.email ?? ''}
          disabled
          className="opacity-60"
        />
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Contact the board to change your email address.
        </p>
      </div>

      {/* Mailing address */}
      <div className="border-t border-stroke-light dark:border-stroke-dark pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-body text-text-primary-light dark:text-text-primary-dark">
              Mailing address
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {unit?.address
                ? `Use your unit address (${unit.address})`
                : 'Use your unit address for mail'}
            </p>
          </div>
          <Switch checked={useUnitAddress} onCheckedChange={setUseUnitAddress} />
        </div>

        {!useUnitAddress && (
          <div className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label htmlFor="mailingLine1">Address line 1</Label>
              <Input
                id="mailingLine1"
                value={mailingLine1}
                onChange={(e) => setMailingLine1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mailingLine2">Address line 2</Label>
              <Input
                id="mailingLine2"
                value={mailingLine2}
                onChange={(e) => setMailingLine2(e.target.value)}
                placeholder="Apt, suite, etc."
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="mailingCity">City</Label>
                <Input
                  id="mailingCity"
                  value={mailingCity}
                  onChange={(e) => setMailingCity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mailingState">State</Label>
                <Input
                  id="mailingState"
                  value={mailingState}
                  onChange={(e) => setMailingState(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mailingZip">ZIP</Label>
                <Input
                  id="mailingZip"
                  value={mailingZip}
                  onChange={(e) => setMailingZip(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
