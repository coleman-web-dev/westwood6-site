'use client';

import { useState } from 'react';

import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import { seedChartOfAccountsAction } from '@/lib/actions/accounting-actions';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface SetupWizardProps {
  communityId: string;
  onComplete: () => void;
}

export function SetupWizard({ communityId, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<'intro' | 'seeding' | 'backfilling' | 'done'>('intro');
  const [seeding, setSeeding] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillStats, setBackfillStats] = useState<{
    invoices: number;
    payments: number;
    walletCredits: number;
    errors: number;
  } | null>(null);

  async function handleSeedAccounts() {
    setSeeding(true);
    const result = await seedChartOfAccountsAction(communityId);
    setSeeding(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to create chart of accounts.');
      return;
    }

    toast.success('Chart of accounts created.');
    setStep('seeding');
  }

  async function handleBackfill() {
    setBackfilling(true);
    setStep('backfilling');

    try {
      const res = await fetch('/api/accounting/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: communityId }),
      });

      if (!res.ok) {
        toast.error('Backfill failed. You can always do this later.');
        setStep('seeding');
        setBackfilling(false);
        return;
      }

      const stats = await res.json();
      setBackfillStats(stats);
      setStep('done');
      toast.success('Historical entries created.');
    } catch {
      toast.error('Backfill failed.');
      setStep('seeding');
    }
    setBackfilling(false);
  }

  function handleSkipBackfill() {
    setStep('done');
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding space-y-6">
      <div>
        <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Set Up Accounting
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1">
          DuesIQ includes a full double-entry general ledger built for HOAs. This wizard will create your chart of accounts and optionally generate journal entries from your existing invoices and payments.
        </p>
      </div>

      {step === 'intro' && (
        <div className="space-y-4">
          <div className="bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card p-4 space-y-2">
            <p className="text-body text-text-primary-light dark:text-text-primary-dark font-medium">
              What gets created:
            </p>
            <ul className="text-body text-text-secondary-light dark:text-text-secondary-dark space-y-1 list-disc list-inside">
              <li>30+ HOA-specific accounts (cash, receivables, revenue, expenses)</li>
              <li>Operating and reserve fund tracking</li>
              <li>Automatic journal entries for invoices, payments, and waivers</li>
            </ul>
          </div>
          <Button onClick={handleSeedAccounts} disabled={seeding}>
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating accounts...
              </>
            ) : (
              'Create Chart of Accounts'
            )}
          </Button>
        </div>
      )}

      {step === 'seeding' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-body font-medium">Chart of accounts created.</span>
          </div>
          <div className="bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card p-4">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Would you like to generate journal entries from your existing invoices and payments? This creates historical accounting records so your reports reflect all past transactions.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleBackfill} disabled={backfilling}>
              {backfilling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Backfill Historical Entries'
              )}
            </Button>
            <Button variant="outline" onClick={handleSkipBackfill} disabled={backfilling}>
              Skip
            </Button>
          </div>
        </div>
      )}

      {step === 'backfilling' && (
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
          <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            Processing existing invoices and payments...
          </span>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-body font-medium">Accounting is ready.</span>
          </div>
          {backfillStats && (
            <div className="bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card p-4">
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                Created {backfillStats.invoices} invoice entries, {backfillStats.payments} payment entries
                {backfillStats.walletCredits > 0 ? `, ${backfillStats.walletCredits} wallet credit entries` : ''}
                {backfillStats.errors > 0 ? ` (${backfillStats.errors} errors)` : ''}.
              </p>
            </div>
          )}
          <Button onClick={onComplete}>Go to Accounting</Button>
        </div>
      )}
    </div>
  );
}
