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

  const theme = community.theme as Record<string, unknown> | null;
  const paymentSettings = (theme?.payment_settings as PaymentSettings) || undefined;
  const feeSettings = paymentSettings?.convenience_fee_settings;
  const appliesTo = feeSettings?.applies_to ?? 'all';
  const fee = calcFee(amount, feeSettings);

  // Determine if we need split buttons (fee applies to only one method)
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

  // Split buttons: one for card (with/without fee) and one for ACH (with/without fee)
  if (needsSplit) {
    const cardFee = appliesTo === 'card' ? fee : 0;
    const achFee = appliesTo === 'ach' ? fee : 0;
    const cardTotal = amount + cardFee;
    const achTotal = amount + achFee;

    const cardButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => startCheckout('card')}
        disabled={!!loading || disabled}
        className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
      >
        <CreditCard className="h-4 w-4 mr-1.5" />
        {loading === 'card' ? 'Redirecting...' : `Card $${(cardTotal / 100).toFixed(2)}`}
      </Button>
    );

    const achButton = (
      <Button
        variant="outline"
        size="sm"
        onClick={() => startCheckout('ach')}
        disabled={!!loading || disabled}
        className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
      >
        <Landmark className="h-4 w-4 mr-1.5" />
        {loading === 'ach' ? 'Redirecting...' : `ACH $${(achTotal / 100).toFixed(2)}`}
      </Button>
    );

    return (
      <div className="flex items-center gap-2">
        {cardFee > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>{cardButton}</TooltipTrigger>
            <TooltipContent>
              <p>${(amount / 100).toFixed(2)} + ${(cardFee / 100).toFixed(2)} processing fee</p>
            </TooltipContent>
          </Tooltip>
        ) : cardButton}
        {achFee > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>{achButton}</TooltipTrigger>
            <TooltipContent>
              <p>${(amount / 100).toFixed(2)} + ${(achFee / 100).toFixed(2)} processing fee</p>
            </TooltipContent>
          </Tooltip>
        ) : achButton}
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
