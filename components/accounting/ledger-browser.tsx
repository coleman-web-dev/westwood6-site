'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/shared/ui/resizable';
import {
  ChevronDown,
  ChevronRight,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import {
  getAccountsWithTxnCounts,
  getAccountTransactions,
} from '@/lib/actions/accounting-actions';
import type { AccountType, AccountWithTxnCount, AccountTransaction, JournalSource } from '@/lib/types/accounting';

interface LedgerBrowserProps {
  communityId: string;
}

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const SOURCE_LABELS: Record<JournalSource, string> = {
  manual: 'Manual',
  invoice_created: 'Invoice',
  payment_received: 'Payment',
  late_fee_applied: 'Late Fee',
  late_fee_removed: 'Late Fee Removed',
  invoice_waived: 'Waived',
  invoice_voided: 'Voided',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
  refund: 'Refund',
  assessment_generated: 'Assessment',
  bank_sync: 'Bank Sync',
  vendor_payment: 'Vendor',
  check_payment: 'Check',
  fund_transfer: 'Transfer',
  recurring: 'Recurring',
};

function formatCurrency(cents: number) {
  return `$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function LedgerBrowser({ communityId }: LedgerBrowserProps) {
  const [accounts, setAccounts] = useState<AccountWithTxnCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<AccountType>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [txnLoading, setTxnLoading] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);

  const PAGE_SIZE = 25;

  useEffect(() => {
    async function load() {
      const data = await getAccountsWithTxnCounts(communityId);
      setAccounts(data as AccountWithTxnCount[]);
      setLoading(false);
    }
    load();
  }, [communityId]);

  const loadTransactions = useCallback(
    async (accountId: string, page: number) => {
      setTxnLoading(true);
      const result = await getAccountTransactions(communityId, accountId, page, PAGE_SIZE);
      setTransactions(result.transactions as AccountTransaction[]);
      setTxnTotal(result.total);
      setTxnLoading(false);
    },
    [communityId],
  );

  function handleSelectAccount(id: string) {
    setSelectedId(id);
    setTxnPage(1);
    loadTransactions(id, 1);
    setMobileDetail(true);
  }

  function toggleType(type: AccountType) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filtered = search
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()),
      )
    : accounts;

  const selectedAccount = accounts.find((a) => a.id === selectedId);
  const totalPages = Math.ceil(txnTotal / PAGE_SIZE);

  // Group by type
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    accounts: filtered.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  const accountTree = (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-stroke-light dark:border-stroke-dark">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-meta"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.type}>
            <button
              type="button"
              onClick={() => toggleType(group.type)}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-label text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
            >
              {collapsed.has(group.type) ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {group.label}
              <span className="text-text-muted-light dark:text-text-muted-dark ml-auto text-meta">
                {group.accounts.length}
              </span>
            </button>

            {!collapsed.has(group.type) &&
              group.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => handleSelectAccount(account.id)}
                  className={`w-full text-left px-3 py-1.5 pl-7 flex items-center gap-2 text-meta transition-colors ${
                    selectedId === account.id
                      ? 'bg-primary-700/10 dark:bg-primary-300/10 text-text-primary-light dark:text-text-primary-dark'
                      : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
                  }`}
                >
                  <span className="text-text-muted-light dark:text-text-muted-dark w-10 shrink-0">
                    {account.code}
                  </span>
                  <span className="truncate flex-1">{account.name}</span>
                  {account.txn_count > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {account.txn_count}
                    </Badge>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );

  const transactionPanel = (
    <div className="h-full flex flex-col">
      {!selectedAccount ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Select an account to view transactions
          </p>
        </div>
      ) : (
        <>
          <div className="px-card-padding py-3 border-b border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                className="lg:hidden p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                  {selectedAccount.code} - {selectedAccount.name}
                </h3>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {txnTotal} transaction{txnTotal !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {txnLoading ? (
              <div className="p-card-padding">
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 rounded bg-muted" />
                  ))}
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                  No transactions for this account
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stroke-light dark:border-stroke-dark">
                    <th className="text-left text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Date
                    </th>
                    <th className="text-left text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Description
                    </th>
                    <th className="text-left text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Source
                    </th>
                    <th className="text-right text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Debit
                    </th>
                    <th className="text-right text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Credit
                    </th>
                    <th className="text-right text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 font-medium">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr
                      key={txn.line_id}
                      className="border-b border-stroke-light dark:border-stroke-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                    >
                      <td className="text-meta text-text-secondary-light dark:text-text-secondary-dark px-3 py-2 whitespace-nowrap">
                        {new Date(txn.entry_date).toLocaleDateString()}
                      </td>
                      <td className="text-meta text-text-primary-light dark:text-text-primary-dark px-3 py-2 truncate max-w-[200px]">
                        {txn.description}
                      </td>
                      <td className="text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2 whitespace-nowrap">
                        {SOURCE_LABELS[txn.source] || txn.source}
                      </td>
                      <td className="text-meta text-text-secondary-light dark:text-text-secondary-dark px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
                      </td>
                      <td className="text-meta text-text-secondary-light dark:text-text-secondary-dark px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {txn.credit > 0 ? formatCurrency(txn.credit) : ''}
                      </td>
                      <td className="text-meta text-text-primary-light dark:text-text-primary-dark px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        {formatCurrency(txn.running_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-card-padding py-2 border-t border-stroke-light dark:border-stroke-dark">
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Page {txnPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={txnPage <= 1}
                  onClick={() => {
                    const p = txnPage - 1;
                    setTxnPage(p);
                    if (selectedId) loadTransactions(selectedId, p);
                  }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={txnPage >= totalPages}
                  onClick={() => {
                    const p = txnPage + 1;
                    setTxnPage(p);
                    if (selectedId) loadTransactions(selectedId, p);
                  }}
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-48 rounded bg-muted" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop: resizable split */}
      <div className="hidden lg:block rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden h-[calc(100vh-220px)]">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            {accountTree}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65}>
            {transactionPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: toggle between list and detail */}
      <div className="lg:hidden rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden h-[calc(100vh-220px)]">
        {mobileDetail && selectedId ? transactionPanel : accountTree}
      </div>
    </>
  );
}
