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
import { CreditCard } from 'lucide-react';
import type { ConvenienceFeeSettings, PaymentSettings } from '@/lib/types/database';

interface PayInvoiceButtonProps {
  invoiceId: string;
  communityId: string;
  amount: number; // cents
  disabled?: boolean;
}

function getConvenienceFee(amount: number, settings?: ConvenienceFeeSettings): number {
  if (!settings?.enabled) return 0;
  const percentFee = Math.round(amount * (settings.fee_percent / 100));
  const fixedFee = settings.fee_fixed || 0;
  return percentFee + fixedFee;
}

export function PayInvoiceButton({ invoiceId, communityId, amount, disabled }: PayInvoiceButtonProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(false);

  const theme = community.theme as Record<string, unknown> | null;
  const paymentSettings = (theme?.payment_settings as PaymentSettings) || undefined;
  const convenienceFeeSettings = paymentSettings?.convenience_fee_settings;
  const fee = getConvenienceFee(amount, convenienceFeeSettings);
  const total = amount + fee;

  async function handleClick() {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          communityId,
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
      setLoading(false);
    }
  }

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || disabled}
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
