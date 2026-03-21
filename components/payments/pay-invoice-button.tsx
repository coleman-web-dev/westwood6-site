'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { CreditCard, Landmark, CalendarClock } from 'lucide-react';
import { Checkbox } from '@/components/shared/ui/checkbox';
import type { ConvenienceFeeSettings, PaymentSettings } from '@/lib/types/database';

interface PayInvoiceButtonProps {
  invoiceId: string;
  communityId: string;
  amount: number; // cents
  disabled?: boolean;
  /** Whether the unit already has a Stripe subscription */
  hasSubscription?: boolean;
  /** Unit's current preferred billing day (1-28) */
  preferredBillingDay?: number | null;
  /** Whether this invoice is tied to a recurring assessment (vs one-off fine/special) */
  isRecurringInvoice?: boolean;
}

function calcFee(amount: number, settings?: ConvenienceFeeSettings): number {
  if (!settings?.enabled) return 0;
  const percentFee = Math.round(amount * (settings.fee_percent / 100));
  const fixedFee = settings.fee_fixed || 0;
  return percentFee + fixedFee;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ReceiptBreakdown({ amount, fee, label }: { amount: number; fee: number; label: string }) {
  return (
    <div className="text-meta text-text-muted-light dark:text-text-muted-dark tabular-nums space-y-0.5 pl-0.5">
      <div className="flex justify-between gap-6">
        <span>Invoice</span>
        <span>${(amount / 100).toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-6">
        <span>{label}</span>
        <span>${(fee / 100).toFixed(2)}</span>
      </div>
      <div className="flex justify-between gap-6 border-t border-stroke-light dark:border-stroke-dark pt-0.5 text-text-secondary-light dark:text-text-secondary-dark">
        <span>Total</span>
        <span>${((amount + fee) / 100).toFixed(2)}</span>
      </div>
    </div>
  );
}

function AutopayOptIn({
  enabled,
  onToggle,
  billingDay,
  onBillingDayChange,
}: {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  billingDay: string;
  onBillingDayChange: (day: string) => void;
}) {
  return (
    <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="autopay-opt-in"
          checked={enabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />
        <label
          htmlFor="autopay-opt-in"
          className="text-label text-text-primary-light dark:text-text-primary-dark cursor-pointer select-none"
        >
          Set up auto-pay for future invoices
        </label>
      </div>

      {enabled && (
        <div className="flex items-center gap-2 pl-6">
          <CalendarClock className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
          <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            Charge on the
          </span>
          <div className="w-20">
            <Select value={billingDay} onValueChange={onBillingDayChange}>
              <SelectTrigger className="h-7 text-meta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {ordinal(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            of each month
          </span>
        </div>
      )}
    </div>
  );
}

export function PayInvoiceButton({
  invoiceId,
  communityId,
  amount,
  disabled,
  hasSubscription,
  preferredBillingDay,
  isRecurringInvoice,
}: PayInvoiceButtonProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState<'card' | 'ach' | 'any' | null>(null);
  const [showAch, setShowAch] = useState(false);

  // Only show autopay option on recurring assessment invoices when no subscription exists
  const showAutopayOption = !hasSubscription && isRecurringInvoice;
  const [enableAutopay, setEnableAutopay] = useState(false);
  const defaultDay = preferredBillingDay
    ? String(Math.min(preferredBillingDay, 28))
    : String(Math.min(new Date().getDate(), 28));
  const [billingDay, setBillingDay] = useState(defaultDay);

  const theme = community.theme as Record<string, unknown> | null;
  const paymentSettings = (theme?.payment_settings as PaymentSettings) || undefined;
  const feeSettings = paymentSettings?.convenience_fee_settings;
  const appliesTo = feeSettings?.applies_to ?? 'all';
  const fee = calcFee(amount, feeSettings);

  const needsSplit = feeSettings?.enabled && fee > 0 && appliesTo !== 'all';

  async function startCheckout(paymentMethod?: 'card' | 'ach') {
    setLoading(paymentMethod ?? 'any');

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          communityId,
          paymentMethod,
          successUrl: `${window.location.origin}/${community.slug}/payments?payment=success`,
          cancelUrl: `${window.location.origin}/${community.slug}/payments?payment=cancelled`,
          ...(enableAutopay ? { enableAutopay: true, billingDay: Number(billingDay) } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  const autopaySection = showAutopayOption ? (
    <AutopayOptIn
      enabled={enableAutopay}
      onToggle={setEnableAutopay}
      billingDay={billingDay}
      onBillingDayChange={setBillingDay}
    />
  ) : null;

  // Split flow: card primary, ACH toggled via link
  if (needsSplit) {
    const cardFee = appliesTo === 'card' ? fee : 0;
    const achFee = appliesTo === 'ach' ? fee : 0;
    const cardTotal = amount + cardFee;
    const achTotal = amount + achFee;

    if (showAch) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            ACH transfers take 3-5 business days to process.
          </p>
          {achFee > 0 && (
            <ReceiptBreakdown amount={amount} fee={achFee} label="Processing fee" />
          )}
          {autopaySection}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => startCheckout('ach')}
              disabled={!!loading || disabled}
              className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
            >
              <Landmark className="h-4 w-4 mr-1.5" />
              {loading === 'ach' ? 'Redirecting...' : `Pay $${(achTotal / 100).toFixed(2)} via ACH`}
            </Button>
            <button
              type="button"
              onClick={() => setShowAch(false)}
              className="text-label text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
            >
              Back to card
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-2">
        {autopaySection}
        <Button
          variant="outline"
          size="sm"
          onClick={() => startCheckout('card')}
          disabled={!!loading || disabled}
          className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
        >
          <CreditCard className="h-4 w-4 mr-1.5" />
          {loading === 'card' ? 'Redirecting...' : `Pay Instant $${(cardTotal / 100).toFixed(2)}`}
        </Button>
        {cardFee > 0 && (
          <ReceiptBreakdown amount={amount} fee={cardFee} label="Processing fee" />
        )}
        <button
          type="button"
          onClick={() => setShowAch(true)}
          className="text-label text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors underline underline-offset-2"
        >
          Pay via ACH
        </button>
      </div>
    );
  }

  // Single button: fee applies to all methods or no fee
  const total = amount + fee;

  return (
    <div className="flex flex-col items-start gap-2">
      {autopaySection}
      <Button
        variant="outline"
        size="sm"
        onClick={() => startCheckout()}
        disabled={!!loading || disabled}
        className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
      >
        <CreditCard className="h-4 w-4 mr-1.5" />
        {loading ? 'Redirecting...' : `Pay $${(total / 100).toFixed(2)}`}
      </Button>
      {fee > 0 && (
        <ReceiptBreakdown amount={amount} fee={fee} label="Processing fee" />
      )}
    </div>
  );
}
