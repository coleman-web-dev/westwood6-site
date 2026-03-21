'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentFrequency } from '@/lib/types/database';

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

interface StepPaymentPreferencesProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepPaymentPreferences({ onNext, onBack }: StepPaymentPreferencesProps) {
  const { community, unit } = useCommunity();
  const paymentSettings = community.theme?.payment_settings as Record<string, unknown> | undefined;
  const defaultFreq = (paymentSettings?.default_frequency as PaymentFrequency) || 'quarterly';
  const initialFreq = (unit?.payment_frequency as PaymentFrequency) || defaultFreq;

  const [frequency, setFrequency] = useState<PaymentFrequency>(initialFreq);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!unit) {
      onNext();
      return;
    }

    if (frequency === initialFreq) {
      onNext();
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('units')
      .update({ payment_frequency: frequency })
      .eq('id', unit.id);

    if (error) {
      setSaving(false);
      toast.error('Failed to update billing frequency.');
      return;
    }

    // Sync Stripe subscription if one exists
    if (unit.stripe_subscription_id) {
      try {
        const res = await fetch('/api/stripe/update-subscription-frequency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unit.id,
            communityId: community.id,
            newFrequency: frequency,
          }),
        });

        if (!res.ok) {
          toast.error('Frequency saved but Stripe sync failed. The board can fix this.');
        }
      } catch {
        toast.error('Frequency saved but Stripe sync failed. The board can fix this.');
      }
    }

    setSaving(false);
    toast.success(`Billing frequency set to ${FREQUENCY_LABELS[frequency]}.`);
    onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Choose how often you would like to be billed. You will receive monthly invoices regardless of your billing frequency.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
          Billing frequency
        </p>
        <Select
          value={frequency}
          onValueChange={(v) => setFrequency(v as PaymentFrequency)}
          disabled={saving}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]).map((key) => (
              <SelectItem key={key} value={key}>
                {FREQUENCY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {frequency !== 'monthly' && (
        <div className="flex gap-3 rounded-inner-card bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-body text-blue-800 dark:text-blue-200">
            When you pay for multiple months at once, the extra funds are stored in your household
            wallet. Future monthly invoices will automatically deduct from your wallet balance, so
            you won&apos;t need to take any action until your next payment is due.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={handleContinue} disabled={saving}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
