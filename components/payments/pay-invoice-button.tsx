'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { CreditCard, Landmark } from 'lucide-react';
import type { ConvenienceFeeSettings, PaymentSettings } from '@/lib/types/database';

interface PayInvoiceButtonProps {
  invoiceId: string;
  communityId: string;
  amount: number; // cents
  disabled?: boolean;
}

function calcFee(amount: number, settings?: ConvenienceFeeSettings): number {
  if (!settings?.enabled) return 0;
  const percentFee = Math.round(amount * (settings.fee_percent / 100));
  const fixedFee = settings.fee_fixed || 0;
  return percentFee + fixedFee;
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

export function PayInvoiceButton({ invoiceId, communityId, amount, disabled }: PayInvoiceButtonProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState<'card' | 'ach' | 'any' | null>(null);
  const [showAch, setShowAch] = useState(false);

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
      <div className="flex flex-col items-start gap-1.5">
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
          Pay via ACH bank transfer
        </button>
      </div>
    );
  }

  // Single button: fee applies to all methods or no fee
  const total = amount + fee;

  return (
    <div className="flex flex-col items-start gap-1.5">
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
