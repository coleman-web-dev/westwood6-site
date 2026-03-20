'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { PaymentFrequency } from '@/lib/types/database';

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

interface FrequencySelectorProps {
  onFrequencyChanged?: () => void;
}

export function FrequencySelector({ onFrequencyChanged }: FrequencySelectorProps) {
  const { community, unit, isBoard, canManageHousehold } = useCommunity();
  const [saving, setSaving] = useState(false);

  const paymentSettings = community.theme?.payment_settings;
  const allowFlexible = paymentSettings?.allow_flexible_frequency ?? false;
  const defaultFreq = paymentSettings?.default_frequency ?? 'quarterly';

  // Only show if flexible frequency is enabled
  if (!allowFlexible) return null;

  // Only owner/member roles or board can change (not tenant/minor)
  const canChange = isBoard || canManageHousehold;
  if (!canChange || !unit) return null;

  const currentFrequency = unit.payment_frequency ?? defaultFreq;

  async function handleChange(value: string) {
    if (!unit) return;

    const newFreq = value as PaymentFrequency;
    if (newFreq === currentFrequency) return;

    setSaving(true);
    const supabase = createClient();

    // Update unit's payment frequency (controls Stripe billing interval)
    const { error: unitError } = await supabase
      .from('units')
      .update({ payment_frequency: newFreq })
      .eq('id', unit.id);

    if (unitError) {
      setSaving(false);
      toast.error('Failed to update billing frequency.');
      return;
    }

    // Update the Stripe subscription interval to match the new frequency.
    // Invoices are always monthly regardless of frequency, so no invoice changes needed.
    if (unit.stripe_subscription_id) {
      try {
        const res = await fetch('/api/stripe/update-subscription-frequency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unit.id,
            communityId: community.id,
            newFrequency: newFreq,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error || 'Billing frequency saved but Stripe update failed.');
          setSaving(false);
          onFrequencyChanged?.();
          return;
        }
      } catch {
        toast.error('Billing frequency saved but Stripe update failed.');
        setSaving(false);
        onFrequencyChanged?.();
        return;
      }
    }

    setSaving(false);
    toast.success('Billing frequency updated to ' + FREQUENCY_LABELS[newFreq] + '.');
    onFrequencyChanged?.();
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-body text-text-primary-light dark:text-text-primary-dark">
            Billing Frequency
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Choose how often you are billed. Invoices are always monthly.
          </p>
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={currentFrequency}
            onValueChange={handleChange}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="semi_annual">Semi-Annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {saving && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
          Updating billing...
        </p>
      )}
    </div>
  );
}
