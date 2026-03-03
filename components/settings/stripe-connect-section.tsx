'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';
import type { StripeAccount } from '@/lib/types/stripe';

function StatusRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
      )}
      <span className="text-body text-text-primary-light dark:text-text-primary-dark">{label}</span>
    </div>
  );
}

export function StripeConnectSection() {
  const { community } = useCommunity();
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    async function fetchStripeAccount() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('community_id', community.id)
        .maybeSingle();

      if (error) {
        toast.error('Failed to load payment settings.');
      }

      setStripeAccount(data);
      setLoading(false);
    }

    fetchStripeAccount();
  }, [community.id]);

  async function handleConnect() {
    setConnecting(true);

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to start Stripe onboarding');
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-9 w-36 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Online Payments
        </h2>
      </div>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
        Connect your Stripe account to accept online payments from residents.
      </p>

      {/* Status indicators */}
      {stripeAccount && (
        <div className="space-y-2 mb-4">
          <StatusRow label="Charges enabled" enabled={stripeAccount.charges_enabled} />
          <StatusRow label="Payouts enabled" enabled={stripeAccount.payouts_enabled} />
          <StatusRow label="Onboarding complete" enabled={stripeAccount.onboarding_complete} />
        </div>
      )}

      {/* Application fee info */}
      {stripeAccount?.charges_enabled && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
          DuesIQ processing fee: {stripeAccount.application_fee_percent}%
        </p>
      )}

      {/* Action button */}
      {!(stripeAccount?.charges_enabled && stripeAccount?.onboarding_complete) && (
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting
            ? 'Redirecting...'
            : !stripeAccount
              ? 'Connect Stripe'
              : 'Continue Setup'}
        </Button>
      )}

      {stripeAccount?.charges_enabled && (
        <p className="text-meta text-green-500 mt-2">
          Ready to accept payments
        </p>
      )}
    </div>
  );
}
