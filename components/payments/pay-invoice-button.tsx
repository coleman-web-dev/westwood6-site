'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
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

export function PayInvoiceButton({ invoiceId, communityId, amount, disabled }: PayInvoiceButtonProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState<'card' | 'ach' | 'any' | null>(null);
  const [showAch, setShowAch] = useState(false);

  const theme = community.theme as Record<string, unknown> | null;
  const paymentSettings = (theme?.payment_settings as PaymentSettings) || undefined;
  const feeSettings = paymentSettings?.convenience_fee_settings;
  const appliesTo = feeSettings?.applies_to ?? 'all';
  const fee = calcFee(amount, feeSettings);

  // Determine if fee is method-specific
  const needsSplit = feeSettings?.enabled && fee > 0 && appliesTo !== 'all';

  async function startCheckout(paymentMethod?: 'card' | 'ach') {
    const loadingKey = paymentMethod ?? 'any';
    setLoading(loadingKey);

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

  // Split flow: card button primary, ACH as a secondary text link that toggles an ACH view
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
          <div className="flex items-center gap-3">
            {achFee > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>${(amount / 100).toFixed(2)} + ${(achFee / 100).toFixed(2)} processing fee</p>
                </TooltipContent>
              </Tooltip>
            ) : (
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
            )}
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
        {cardFee > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>${(amount / 100).toFixed(2)} + ${(cardFee / 100).toFixed(2)} processing fee</p>
            </TooltipContent>
          </Tooltip>
        ) : (
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
  const button = (
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
  );

  if (fee > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>${(amount / 100).toFixed(2)} + ${(fee / 100).toFixed(2)} processing fee</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
