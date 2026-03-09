'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { BookOpen } from 'lucide-react';
import { SetupWizard } from '@/components/accounting/setup-wizard';
import { ChartOfAccounts } from '@/components/accounting/chart-of-accounts';
import { JournalEntryList } from '@/components/accounting/journal-entry-list';
import { TrialBalance } from '@/components/accounting/trial-balance';
import { BalanceSheet } from '@/components/accounting/balance-sheet';
import { IncomeStatement } from '@/components/accounting/income-statement';
import { BankConnectionManager } from '@/components/accounting/bank-connection-manager';
import { BankTransactionList } from '@/components/accounting/bank-transaction-list';
import { CategorizationRulesManager } from '@/components/accounting/categorization-rules-manager';
import { ReconciliationList } from '@/components/accounting/reconciliation-list';
import { AIStatementProcessor } from '@/components/accounting/ai-statement-processor';
import { AccountingDashboard } from '@/components/accounting/accounting-dashboard';
import { LedgerBrowser } from '@/components/accounting/ledger-browser';
import { CashFlowForecast } from '@/components/accounting/cash-flow-forecast';
import { BudgetVariance } from '@/components/accounting/budget-variance';
import { BudgetComparison } from '@/components/accounting/budget-comparison';
import { RecurringEntries } from '@/components/accounting/recurring-entries';
import { FinancialAuditTrail } from '@/components/accounting/financial-audit-trail';
import { ExportDialog } from '@/components/accounting/export-dialog';
import { DelinquencySettings } from '@/components/accounting/delinquency-settings';
import { CheckRegister } from '@/components/accounting/checks/check-register';
import { CheckSettingsPanel } from '@/components/accounting/checks/check-settings';
import { TransactionInbox } from '@/components/accounting/transaction-inbox';

const TABS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'chart', label: 'Chart of Accounts' },
  { id: 'journal', label: 'Journal Entries' },
  { id: 'checks', label: 'Checks' },
  { id: 'banking', label: 'Banking' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'reports', label: 'Reports' },
  { id: 'automation', label: 'Automation' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const REPORT_SUBTABS = [
  { id: 'trial-balance', label: 'Trial Balance' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'income-statement', label: 'Income Statement' },
  { id: 'cash-flow', label: 'Cash Flow' },
  { id: 'budget-variance', label: 'Budget Variance' },
  { id: 'budget-comparison', label: 'Multi-Year' },
  { id: 'audit-trail', label: 'Audit Trail' },
] as const;

type ReportSubtab = (typeof REPORT_SUBTABS)[number]['id'];

const BANKING_SUBTABS = [
  { id: 'connections', label: 'Connections' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'rules', label: 'Categorization Rules' },
  { id: 'ai-statements', label: 'Statements' },
] as const;

type BankingSubtab = (typeof BANKING_SUBTABS)[number]['id'];

const JOURNAL_SUBTABS = [
  { id: 'entries', label: 'Entries' },
  { id: 'recurring', label: 'Recurring' },
] as const;

type JournalSubtab = (typeof JOURNAL_SUBTABS)[number]['id'];

export default function AccountingPage() {
  const { isBoard, canRead, community } = useCommunity();
  const searchParams = useSearchParams();

  // Allow deep-linking via ?tab=checks&subtab=settings
  const initialTab = (searchParams.get('tab') as Tab) || 'inbox';
  const initialSubtab = searchParams.get('subtab') || '';

  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'inbox',
  );
  const [reportTab, setReportTab] = useState<ReportSubtab>(
    REPORT_SUBTABS.some((t) => t.id === initialSubtab) ? (initialSubtab as ReportSubtab) : 'trial-balance',
  );
  const [bankingTab, setBankingTab] = useState<BankingSubtab>(
    BANKING_SUBTABS.some((t) => t.id === initialSubtab) ? (initialSubtab as BankingSubtab) : 'connections',
  );
  const [journalTab, setJournalTab] = useState<JournalSubtab>(
    JOURNAL_SUBTABS.some((t) => t.id === initialSubtab) ? (initialSubtab as JournalSubtab) : 'entries',
  );
  const [checksTab, setChecksTab] = useState<'register' | 'settings'>(
    initialSubtab === 'settings' ? 'settings' : 'register',
  );
  const [isSetUp, setIsSetUp] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

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

  if (!canRead('accounting')) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Accounting</h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Accounting is only available to authorized members.
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
            <span className="inline-flex items-center gap-1">
              {tab.label}
              {tab.id === 'inbox' && pendingCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary-400 text-[10px] font-semibold text-primary-900 px-1">
                  {pendingCount}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'inbox' && (
        <TransactionInbox
          key={`inbox-${refreshKey}`}
          communityId={community.id}
          onPendingCountChange={setPendingCount}
        />
      )}

      {activeTab === 'dashboard' && (
        <AccountingDashboard
          key={`dash-${refreshKey}`}
          communityId={community.id}
          refreshKey={refreshKey}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {activeTab === 'ledger' && (
        <LedgerBrowser key={`ledger-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'chart' && (
        <ChartOfAccounts key={`coa-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {JOURNAL_SUBTABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setJournalTab(tab.id)}
                className={`px-3 py-1.5 rounded-pill text-meta transition-colors ${
                  journalTab === tab.id
                    ? 'bg-secondary-400/15 text-secondary-400'
                    : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {journalTab === 'entries' && (
            <JournalEntryList key={`je-${refreshKey}`} communityId={community.id} />
          )}
          {journalTab === 'recurring' && (
            <RecurringEntries key={`re-${refreshKey}`} communityId={community.id} />
          )}
        </div>
      )}

      {activeTab === 'checks' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['register', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setChecksTab(tab)}
                className={`px-3 py-1.5 rounded-pill text-meta transition-colors ${
                  checksTab === tab
                    ? 'bg-secondary-400/15 text-secondary-400'
                    : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
                }`}
              >
                {tab === 'register' ? 'Check Register' : 'Settings'}
              </button>
            ))}
          </div>

          {checksTab === 'register' && (
            <CheckRegister key={`ck-${refreshKey}`} communityId={community.id} />
          )}
          {checksTab === 'settings' && (
            <CheckSettingsPanel key={`cks-${refreshKey}`} communityId={community.id} />
          )}
        </div>
      )}

      {activeTab === 'banking' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {BANKING_SUBTABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBankingTab(tab.id)}
                className={`px-3 py-1.5 rounded-pill text-meta transition-colors ${
                  bankingTab === tab.id
                    ? 'bg-secondary-400/15 text-secondary-400'
                    : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {bankingTab === 'connections' && (
            <BankConnectionManager
              key={`bc-${refreshKey}`}
              communityId={community.id}
              onSync={() => setRefreshKey((k) => k + 1)}
            />
          )}
          {bankingTab === 'transactions' && (
            <BankTransactionList
              key={`bt-${refreshKey}`}
              communityId={community.id}
              refreshKey={refreshKey}
            />
          )}
          {bankingTab === 'rules' && (
            <CategorizationRulesManager
              key={`cr-${refreshKey}`}
              communityId={community.id}
            />
          )}
          {bankingTab === 'ai-statements' && (
            <AIStatementProcessor
              key={`ai-${refreshKey}`}
              communityId={community.id}
            />
          )}
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <ReconciliationList key={`recon-${refreshKey}`} communityId={community.id} />
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
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
            <ExportDialog communityId={community.id} />
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
          {reportTab === 'cash-flow' && (
            <CashFlowForecast key={`cf-${refreshKey}`} communityId={community.id} />
          )}
          {reportTab === 'budget-variance' && (
            <BudgetVariance key={`bv-${refreshKey}`} communityId={community.id} />
          )}
          {reportTab === 'budget-comparison' && (
            <BudgetComparison key={`bc2-${refreshKey}`} communityId={community.id} />
          )}
          {reportTab === 'audit-trail' && (
            <FinancialAuditTrail key={`at-${refreshKey}`} communityId={community.id} />
          )}
        </div>
      )}

      {activeTab === 'automation' && (
        <div className="space-y-6">
          <DelinquencySettings key={`dl-${refreshKey}`} communityId={community.id} />
        </div>
      )}
    </div>
  );
}
