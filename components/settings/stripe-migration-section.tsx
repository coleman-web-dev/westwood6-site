'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { useCommunity } from '@/lib/providers/community-provider';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  CheckCircle,
  Loader2,
  Users,
  CreditCard,
  Key,
  UserPlus,
  BarChart3,
} from 'lucide-react';

interface MigrationState {
  stripeConnected: boolean;
  customersMatched: number;
  customersUnmatched: number;
  subscriptionsCreated: number;
  subscriptionsExisted: number;
  accountsCreated: number;
  accountsExisted: number;
  setupComplete: boolean;
}

interface StepDefinition {
  id: number;
  title: string;
  description: string;
  buttonLabel: string;
  icon: typeof Key;
}

const STEPS: StepDefinition[] = [
  {
    id: 1,
    title: 'Verify Connection',
    description: 'Confirm your Stripe API key is configured and working.',
    buttonLabel: 'Test Connection',
    icon: Key,
  },
  {
    id: 2,
    title: 'Sync Customers',
    description: 'Match your Stripe customers to community members by email.',
    buttonLabel: 'Sync Customers',
    icon: Users,
  },
  {
    id: 3,
    title: 'Create Subscriptions',
    description: 'Set up automatic monthly billing for each unit.',
    buttonLabel: 'Create Subscriptions',
    icon: CreditCard,
  },
  {
    id: 4,
    title: 'Create Accounts',
    description: 'Pre-create login accounts so members can sign in immediately.',
    buttonLabel: 'Create Accounts',
    icon: UserPlus,
  },
  {
    id: 5,
    title: 'Summary',
    description: 'Review the setup results and finalize.',
    buttonLabel: 'Complete Setup',
    icon: BarChart3,
  },
];

const DEFAULT_STATE: MigrationState = {
  stripeConnected: false,
  customersMatched: 0,
  customersUnmatched: 0,
  subscriptionsCreated: 0,
  subscriptionsExisted: 0,
  accountsCreated: 0,
  accountsExisted: 0,
  setupComplete: false,
};

export function StripeMigrationSection() {
  const { community, isBoard } = useCommunity();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [migrationState, setMigrationState] = useState<MigrationState>(DEFAULT_STATE);

  // Determine initial step based on existing data
  const determineCurrentStep = useCallback(async () => {
    const supabase = createClient();

    try {
      // Check stripe_accounts for this community
      const { data: stripeAccount } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('community_id', community.id)
        .maybeSingle();

      const hasStripe =
        stripeAccount?.mode === 'direct' && stripeAccount?.charges_enabled;

      if (!hasStripe) {
        setCurrentStep(1);
        setInitialLoading(false);
        return;
      }

      setMigrationState((prev) => ({ ...prev, stripeConnected: true }));

      // Check how many members have stripe_customer_id
      const { count: matchedCount } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .not('stripe_customer_id', 'is', null);

      if (!matchedCount || matchedCount === 0) {
        setCurrentStep(2);
        setInitialLoading(false);
        return;
      }

      setMigrationState((prev) => ({
        ...prev,
        customersMatched: matchedCount ?? 0,
      }));

      // Check how many units have stripe_subscription_id
      const { count: subCount } = await supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .not('stripe_subscription_id', 'is', null);

      if (!subCount || subCount === 0) {
        setCurrentStep(3);
        setInitialLoading(false);
        return;
      }

      setMigrationState((prev) => ({
        ...prev,
        subscriptionsCreated: subCount ?? 0,
      }));

      // Check how many members have user_id (account created)
      const { count: accountCount } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .not('user_id', 'is', null);

      if (!accountCount || accountCount === 0) {
        setCurrentStep(4);
        setInitialLoading(false);
        return;
      }

      setMigrationState((prev) => ({
        ...prev,
        accountsCreated: accountCount ?? 0,
      }));

      // If everything looks populated, show summary
      setCurrentStep(5);
    } catch {
      // If we cannot determine state, start from the beginning
      setCurrentStep(1);
    } finally {
      setInitialLoading(false);
    }
  }, [community.id]);

  useEffect(() => {
    determineCurrentStep();
  }, [determineCurrentStep]);

  // Step 1: Test Stripe Connection
  async function handleTestConnection() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/sync-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id, testOnly: true }),
      });

      if (res.ok) {
        setMigrationState((prev) => ({ ...prev, stripeConnected: true }));
        setCurrentStep(2);
        toast.success('Stripe connection verified!');
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to connect to Stripe');
      }
    } catch {
      toast.error('Failed to test Stripe connection');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Sync Customers
  async function handleSyncCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/sync-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to sync customers');
        return;
      }

      const data = await res.json();
      setMigrationState((prev) => ({
        ...prev,
        customersMatched: data.matched ?? 0,
        customersUnmatched: data.unmatched ?? 0,
      }));
      setCurrentStep(3);
      toast.success(
        `Synced! ${data.matched ?? 0} matched, ${data.unmatched ?? 0} unmatched.`
      );
    } catch {
      toast.error('Failed to sync customers');
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Create Subscriptions
  async function handleCreateSubscriptions() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to create subscriptions');
        return;
      }

      const data = await res.json();
      setMigrationState((prev) => ({
        ...prev,
        subscriptionsCreated: data.created ?? 0,
        subscriptionsExisted: data.existed ?? 0,
      }));
      setCurrentStep(4);
      toast.success(`${data.created ?? 0} subscriptions created.`);
    } catch {
      toast.error('Failed to create subscriptions');
    } finally {
      setLoading(false);
    }
  }

  // Step 4: Pre-Create Accounts
  async function handlePreCreateAccounts() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/pre-create-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to create accounts');
        return;
      }

      const data = await res.json();
      setMigrationState((prev) => ({
        ...prev,
        accountsCreated: data.created ?? 0,
        accountsExisted: data.existed ?? 0,
      }));
      setCurrentStep(5);
      toast.success(
        `${data.created ?? 0} accounts created, ${data.existed ?? 0} already existed.`
      );
    } catch {
      toast.error('Failed to create accounts');
    } finally {
      setLoading(false);
    }
  }

  // Step 5: Complete Setup
  async function handleCompleteSetup() {
    setMigrationState((prev) => ({ ...prev, setupComplete: true }));
    toast.success('Stripe payment setup is complete!');
  }

  const stepHandlers: Record<number, () => Promise<void>> = {
    1: handleTestConnection,
    2: handleSyncCustomers,
    3: handleCreateSubscriptions,
    4: handlePreCreateAccounts,
    5: handleCompleteSetup,
  };

  function renderStepResult(stepId: number) {
    switch (stepId) {
      case 1:
        if (migrationState.stripeConnected) {
          return (
            <p className="text-meta text-green-600 dark:text-green-400">
              Connection verified
            </p>
          );
        }
        return null;
      case 2:
        if (migrationState.customersMatched > 0 || migrationState.customersUnmatched > 0) {
          return (
            <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
              {migrationState.customersMatched} matched, {migrationState.customersUnmatched} unmatched
            </p>
          );
        }
        return null;
      case 3:
        if (migrationState.subscriptionsCreated > 0 || migrationState.subscriptionsExisted > 0) {
          return (
            <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
              {migrationState.subscriptionsCreated} created
              {migrationState.subscriptionsExisted > 0 && `, ${migrationState.subscriptionsExisted} already existed`}
            </p>
          );
        }
        return null;
      case 4:
        if (migrationState.accountsCreated > 0 || migrationState.accountsExisted > 0) {
          return (
            <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
              {migrationState.accountsCreated} created
              {migrationState.accountsExisted > 0 && `, ${migrationState.accountsExisted} already existed`}
            </p>
          );
        }
        return null;
      case 5:
        if (migrationState.setupComplete) {
          return (
            <div className="text-meta text-text-secondary-light dark:text-text-secondary-dark space-y-1">
              <p>Customers matched: {migrationState.customersMatched}</p>
              <p>Subscriptions: {migrationState.subscriptionsCreated}</p>
              <p>Accounts: {migrationState.accountsCreated}</p>
            </div>
          );
        }
        return null;
      default:
        return null;
    }
  }

  if (!isBoard) return null;

  if (initialLoading) {
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
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Stripe Payment Setup
        </h2>
      </div>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
        Set up automatic payment collection for your community.
      </p>

      <div className="space-y-3">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isFuture = step.id > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-inner-card border transition-colors ${
                isCurrent
                  ? 'border-secondary-300 dark:border-secondary-700 bg-surface-light dark:bg-surface-dark'
                  : 'border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2'
              } ${isFuture ? 'opacity-50' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-secondary-100 dark:bg-secondary-900'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <StepIcon className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-label font-medium text-text-primary-light dark:text-text-primary-dark">
                  {step.title}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {step.description}
                </p>

                {/* Show result for completed steps */}
                {isCompleted && (
                  <div className="mt-1">{renderStepResult(step.id)}</div>
                )}

                {/* Show action for current step */}
                {isCurrent && (
                  <div className="mt-3">
                    <Button
                      onClick={stepHandlers[step.id]}
                      disabled={loading}
                      size="sm"
                    >
                      {loading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {step.buttonLabel}
                    </Button>

                    {/* Show results inline while on this step */}
                    <div className="mt-2">{renderStepResult(step.id)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {migrationState.setupComplete && (
        <p className="text-meta text-green-500 mt-2">
          Payment setup complete. Your community is ready to collect payments.
        </p>
      )}
    </div>
  );
}
