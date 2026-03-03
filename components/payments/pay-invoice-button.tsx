'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';

interface PayInvoiceButtonProps {
  invoiceId: string;
  communityId: string;
  amount: number; // cents
  disabled?: boolean;
}

export function PayInvoiceButton({ invoiceId, communityId, amount, disabled }: PayInvoiceButtonProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(false);

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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading || disabled}
      className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-950"
    >
      <CreditCard className="h-4 w-4 mr-1.5" />
      {loading ? 'Redirecting...' : `Pay $${(amount / 100).toFixed(2)}`}
    </Button>
  );
}
