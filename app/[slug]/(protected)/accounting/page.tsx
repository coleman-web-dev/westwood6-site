'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { BookOpen } from 'lucide-react';
import { SetupWizard } from '@/components/accounting/setup-wizard';
import { ChartOfAccounts } from '@/components/accounting/chart-of-accounts';
import { JournalEntryList } from '@/components/accounting/journal-entry-list';
import { TrialBalance } from '@/components/accounting/trial-balance';
import { BalanceSheet } from '@/components/accounting/balance-sheet';
import { IncomeStatement } from '@/components/accounting/income-statement';
import { FundSummaryCards } from '@/components/accounting/fund-summary';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'chart', label: 'Chart of Accounts' },
  { id: 'journal', label: 'Journal Entries' },
  { id: 'reports', label: 'Reports' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const REPORT_SUBTABS = [
  { id: 'trial-balance', label: 'Trial Balance' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'income-statement', label: 'Income Statement' },
] as const;

type ReportSubtab = (typeof REPORT_SUBTABS)[number]['id'];

export default function AccountingPage() {
  const { isBoard, community } = useCommunity();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [reportTab, setReportTab] = useState<ReportSubtab>('trial-balance');
  const [isSetUp, setIsSetUp] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const checkSetup = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .limit(1);

    setIsSetUp((count ?? 0) > 0);
  }, [community.id]);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  if (!isBoard) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Accounting</h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Accounting is only available to board members.
        </p>
      </div>
    );
  }

  if (isSetUp === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Accounting</h1>
        </div>
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <div className="animate-pulse h-20 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!isSetUp) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Accounting</h1>
        </div>
        <SetupWizard
          communityId={community.id}
          onComplete={() => {
            setIsSetUp(true);
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Accounting</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <FundSummaryCards key={`fund-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'chart' && (
        <ChartOfAccounts key={`coa-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'journal' && (
        <JournalEntryList key={`je-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {REPORT_SUBTABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportTab(tab.id)}
                className={`px-3 py-1.5 rounded-pill text-meta transition-colors ${
                  reportTab === tab.id
                    ? 'bg-secondary-400/15 text-secondary-400'
                    : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {reportTab === 'trial-balance' && (
            <TrialBalance key={`tb-${refreshKey}`} communityId={community.id} />
          )}
          {reportTab === 'balance-sheet' && (
            <BalanceSheet key={`bs-${refreshKey}`} communityId={community.id} />
          )}
          {reportTab === 'income-statement' && (
            <IncomeStatement key={`is-${refreshKey}`} communityId={community.id} />
          )}
        </div>
      )}
    </div>
  );
}
