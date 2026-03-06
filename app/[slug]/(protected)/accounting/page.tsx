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
import { BankConnectionManager } from '@/components/accounting/bank-connection-manager';
import { BankTransactionList } from '@/components/accounting/bank-transaction-list';
import { CategorizationRulesManager } from '@/components/accounting/categorization-rules-manager';
import { ReconciliationList } from '@/components/accounting/reconciliation-list';
import { AIStatementProcessor } from '@/components/accounting/ai-statement-processor';
import { InterFundTransferDialog } from '@/components/accounting/inter-fund-transfer-dialog';
import { CashFlowForecast } from '@/components/accounting/cash-flow-forecast';
import { BudgetVariance } from '@/components/accounting/budget-variance';
import { BudgetComparison } from '@/components/accounting/budget-comparison';
import { RecurringEntries } from '@/components/accounting/recurring-entries';
import { FinancialAuditTrail } from '@/components/accounting/financial-audit-trail';
import { ExportDialog } from '@/components/accounting/export-dialog';
import { DelinquencySettings } from '@/components/accounting/delinquency-settings';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'chart', label: 'Chart of Accounts' },
  { id: 'journal', label: 'Journal Entries' },
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
  { id: 'ai-statements', label: 'AI Statements' },
] as const;

type BankingSubtab = (typeof BANKING_SUBTABS)[number]['id'];

const JOURNAL_SUBTABS = [
  { id: 'entries', label: 'Entries' },
  { id: 'recurring', label: 'Recurring' },
] as const;

type JournalSubtab = (typeof JOURNAL_SUBTABS)[number]['id'];

export default function AccountingPage() {
  const { isBoard, community } = useCommunity();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [reportTab, setReportTab] = useState<ReportSubtab>('trial-balance');
  const [bankingTab, setBankingTab] = useState<BankingSubtab>('connections');
  const [journalTab, setJournalTab] = useState<JournalSubtab>('entries');
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
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <InterFundTransferDialog
              communityId={community.id}
              onComplete={() => setRefreshKey((k) => k + 1)}
            />
            <ExportDialog communityId={community.id} />
          </div>
          <FundSummaryCards key={`fund-${refreshKey}`} communityId={community.id} />
        </div>
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
