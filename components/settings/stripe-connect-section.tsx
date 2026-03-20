'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, XCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
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
  const { community, isBoard } = useCommunity();
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchStripeAccount() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('community_id', community.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        toast.error('Failed to load payment settings.');
      }

      setStripeAccount(data);
      setLoading(false);
    }

    fetchStripeAccount();
    return () => { active = false; };
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

  async function handleMigrateSubscriptions() {
    setMigrating(true);

    try {
      const response = await fetch('/api/stripe/migrate-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to migrate subscriptions');
      }

      const data = await response.json();
      const { migrated, skipped, errors } = data;

      if (errors && errors.length > 0) {
        toast.error(`${errors.length} subscription(s) failed to migrate. Check console for details.`);
        console.error('Subscription migration errors:', errors);
      } else {
        toast.success(`${migrated} subscription(s) migrated, ${skipped} already up to date.`);
      }

      setMigrationDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setMigrating(false);
    }
  }

  if (!isBoard) return null;

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

  const isDirectMode = stripeAccount?.mode === 'direct';
  const isConnectComplete = stripeAccount?.mode === 'connect' && stripeAccount?.onboarding_complete && stripeAccount?.charges_enabled;
  const isConnectIncomplete = stripeAccount?.mode === 'connect' && !stripeAccount?.onboarding_complete;

  // Don't show this section if there's no Stripe account at all (migration wizard handles initial setup)
  if (!stripeAccount) return null;

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          DuesIQ Connect
        </h2>
      </div>

      {/* Direct mode: show upgrade prompt */}
      {isDirectMode && !isConnectIncomplete && (
        <>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
            Your community is currently using Direct mode. Connect a Stripe Express account
            through DuesIQ to enable platform payment processing with automatic fee splitting.
          </p>
          <div className="space-y-2 mb-4">
            <StatusRow label="Direct mode active" enabled />
            <StatusRow label="DuesIQ Connect" enabled={false} />
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                Switch to DuesIQ Connect
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </>
      )}

      {/* Connect onboarding incomplete */}
      {(isConnectIncomplete || (isDirectMode && stripeAccount?.stripe_account_id && !stripeAccount?.onboarding_complete)) && (
        <>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
            Stripe onboarding is not yet complete. Click below to continue the setup process.
          </p>
          <div className="space-y-2 mb-4">
            <StatusRow label="Express account created" enabled />
            <StatusRow label="Onboarding complete" enabled={false} />
            <StatusRow label="Charges enabled" enabled={stripeAccount?.charges_enabled ?? false} />
            <StatusRow label="Payouts enabled" enabled={stripeAccount?.payouts_enabled ?? false} />
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Continue Stripe Setup'
            )}
          </Button>
        </>
      )}

      {/* Connect mode fully active */}
      {isConnectComplete && (
        <>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
            Your community is connected to DuesIQ via Stripe Express.
          </p>
          <div className="space-y-2 mb-4">
            <StatusRow label="Charges enabled" enabled />
            <StatusRow label="Payouts enabled" enabled={stripeAccount.payouts_enabled} />
            <StatusRow label="Onboarding complete" enabled />
          </div>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            DuesIQ processing fee: {stripeAccount.application_fee_percent}%
          </p>

          {/* Subscription migration button */}
          {!migrationDone ? (
            <div className="mt-4 p-3 border border-stroke-light dark:border-stroke-dark rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2">
              <p className="text-body text-text-primary-light dark:text-text-primary-dark mb-1">
                Migrate existing subscriptions
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-3">
                Update all active subscriptions to route payments through your new Express account.
                This ensures recurring payments (monthly, quarterly, semi-annual, annual) are deposited
                to your connected account with automatic fee splitting.
              </p>
              <Button onClick={handleMigrateSubscriptions} disabled={migrating} size="sm">
                {migrating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Migrate Subscriptions
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-meta text-green-500 mt-4">
              Subscriptions migrated. All payments now route to your Express account.
            </p>
          )}

          <p className="text-meta text-green-500 mt-2">
            Ready to accept payments
          </p>
        </>
      )}
    </div>
  );
}
