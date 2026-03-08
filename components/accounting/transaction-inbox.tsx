'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Label } from '@/components/shared/ui/label';
import { Input } from '@/components/shared/ui/input';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/shared/ui/resizable';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
  Inbox,
  CheckCircle2,
  XCircle,
  Link2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  categorizeTransaction,
  excludeTransaction,
  unmatchTransaction,
  createJournalEntryFromBankTxn,
} from '@/lib/actions/banking-actions';
import { MatchTransactionDialog } from '@/components/accounting/match-transaction-dialog';
import type { BankTransaction, BankTxnStatus } from '@/lib/types/banking';
import type { Account, AccountType } from '@/lib/types/accounting';
import type { Vendor } from '@/lib/types/database';

const STATUS_FILTERS = [
  { id: 'pending' as const, label: 'Pending' },
  { id: 'categorized' as const, label: 'Categorized' },
  { id: 'all' as const, label: 'All' },
  { id: 'excluded' as const, label: 'Excluded' },
];

const TYPE_ORDER: AccountType[] = ['expense', 'revenue', 'asset', 'liability', 'equity'];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

interface TransactionInboxProps {
  communityId: string;
  onPendingCountChange?: (count: number) => void;
}

export function TransactionInbox({ communityId, onPendingCountChange }: TransactionInboxProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bankAccountGlMap, setBankAccountGlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BankTxnStatus | 'all'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);
  const PAGE_SIZE = 50;

  const selectedTxn = transactions.find((t) => t.id === selectedId) || null;

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from('bank_transactions')
      .select('*')
      .eq('community_id', communityId)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const [{ data: txns }, { data: accts }, { data: vndrs }, { data: bankAccounts }, { count }] =
      await Promise.all([
        query,
        supabase
          .from('accounts')
          .select('*')
          .eq('community_id', communityId)
          .eq('is_active', true)
          .order('code'),
        supabase
          .from('vendors')
          .select('*')
          .eq('community_id', communityId)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('plaid_bank_accounts')
          .select('id, gl_account_id')
          .eq('community_id', communityId)
          .not('gl_account_id', 'is', null),
        supabase
          .from('bank_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'pending'),
      ]);

    setTransactions((txns as BankTransaction[]) || []);
    setAccounts((accts as Account[]) || []);
    setVendors((vndrs as Vendor[]) || []);
    setPendingCount(count ?? 0);
    onPendingCountChange?.(count ?? 0);

    // Build bank account -> GL account mapping
    const glMap: Record<string, string> = {};
    (bankAccounts || []).forEach((ba: { id: string; gl_account_id: string | null }) => {
      if (ba.gl_account_id) glMap[ba.id] = ba.gl_account_id;
    });
    setBankAccountGlMap(glMap);

    setLoading(false);
  }, [communityId, statusFilter, page, onPendingCountChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatAmount(amount: number) {
    const abs = Math.abs(amount) / 100;
    return abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function handleSelectNext(afterId: string) {
    const currentIndex = transactions.findIndex((t) => t.id === afterId);
    const remaining = transactions.filter(
      (t, i) => i > currentIndex && t.status === 'pending',
    );
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    } else {
      setSelectedId(null);
    }
  }

  async function handleCategorizeAndNext(
    txn: BankTransaction,
    accountId: string,
    vendorId: string | null,
    createRule: { pattern: string; matchField: string } | undefined,
  ) {
    const bankGlId = bankAccountGlMap[txn.plaid_bank_account_id];

    await categorizeTransaction(
      communityId,
      txn.id,
      accountId,
      createRule,
      vendorId,
    );

    // Create journal entry if bank account has a GL mapping
    if (bankGlId) {
      await createJournalEntryFromBankTxn(communityId, txn.id, accountId, bankGlId);
    }

    toast.success('Transaction categorized.');
    handleSelectNext(txn.id);
    fetchData();
  }

  async function handleExclude(txnId: string, reason: string) {
    await excludeTransaction(communityId, txnId, reason);
    toast.success('Transaction excluded.');
    handleSelectNext(txnId);
    fetchData();
  }

  async function handleUnmatch(txnId: string) {
    await unmatchTransaction(communityId, txnId);
    toast.success('Transaction reset to pending.');
    fetchData();
  }

  function handleMatchComplete() {
    fetchData();
    setSelectedId(null);
  }

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // Mobile: show detail panel fullscreen
  if (mobileDetail && selectedTxn) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMobileDetail(false); setSelectedId(null); }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to list
        </Button>
        <DetailPanel
          transaction={selectedTxn}
          accounts={accounts}
          vendors={vendors}
          communityId={communityId}
          onCategorize={handleCategorizeAndNext}
          onExclude={handleExclude}
          onUnmatch={handleUnmatch}
          onMatchComplete={handleMatchComplete}
        />
      </div>
    );
  }

  const listContent = (
    <div className="flex flex-col h-full">
      {/* Status filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 flex-shrink-0">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setStatusFilter(f.id); setPage(0); setSelectedId(null); }}
            className={`px-2.5 py-1 rounded-pill text-meta transition-colors ${
              statusFilter === f.id
                ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark'
            }`}
          >
            {f.label}
            {f.id === 'pending' && pendingCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary-400 text-[10px] font-semibold text-primary-900 px-1">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto divide-y divide-stroke-light dark:divide-stroke-dark">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted-light dark:text-text-muted-dark">
            <Inbox className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-body">
              {statusFilter === 'pending'
                ? 'No pending transactions. You are all caught up!'
                : 'No transactions found.'}
            </p>
          </div>
        ) : (
          transactions.map((txn) => (
            <button
              key={txn.id}
              type="button"
              onClick={() => {
                setSelectedId(txn.id);
                // On mobile, show detail full screen
                if (window.innerWidth < 1024) setMobileDetail(true);
              }}
              className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-3 ${
                selectedId === txn.id
                  ? 'bg-primary-700/8 dark:bg-primary-300/8'
                  : 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                    {txn.merchant_name || txn.name}
                  </span>
                  {txn.match_method === 'ai' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-medium flex-shrink-0">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                  {txn.status === 'pending' && txn.ai_confidence != null && txn.ai_confidence >= 0.5 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium flex-shrink-0">
                      <Sparkles className="h-2.5 w-2.5" /> Suggestion
                    </span>
                  )}
                </div>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(txn.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <span
                className={`text-body tabular-nums font-medium flex items-center gap-0.5 flex-shrink-0 ${
                  txn.amount > 0
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {txn.amount > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownLeft className="h-3 w-3" />
                )}
                {formatAmount(txn.amount)}
              </span>
              {statusFilter === 'all' && (
                <Badge
                  variant={txn.status === 'pending' ? 'outline' : txn.status === 'excluded' ? 'destructive' : 'secondary'}
                  className="text-[10px] flex-shrink-0"
                >
                  {txn.status}
                </Badge>
              )}
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {transactions.length === PAGE_SIZE && (
        <div className="flex justify-center gap-2 p-2 border-t border-stroke-light dark:border-stroke-dark flex-shrink-0">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
      {/* Desktop: split view */}
      <div className="hidden lg:block h-[calc(100vh-220px)] min-h-[500px]">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={55} minSize={35}>
            {listContent}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            {selectedTxn ? (
              <div className="h-full overflow-y-auto p-4">
                <DetailPanel
                  transaction={selectedTxn}
                  accounts={accounts}
                  vendors={vendors}
                  communityId={communityId}
                  onCategorize={handleCategorizeAndNext}
                  onExclude={handleExclude}
                  onUnmatch={handleUnmatch}
                  onMatchComplete={handleMatchComplete}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted-light dark:text-text-muted-dark">
                <Inbox className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-body">Select a transaction to review</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: list only */}
      <div className="lg:hidden max-h-[calc(100vh-220px)] overflow-y-auto">
        {listContent}
      </div>
    </div>
  );
}

// ─── Detail Panel ──────────────────────────────────────────────────

interface DetailPanelProps {
  transaction: BankTransaction;
  accounts: Account[];
  vendors: Vendor[];
  communityId: string;
  onCategorize: (
    txn: BankTransaction,
    accountId: string,
    vendorId: string | null,
    createRule: { pattern: string; matchField: string } | undefined,
  ) => Promise<void>;
  onExclude: (txnId: string, reason: string) => Promise<void>;
  onUnmatch: (txnId: string) => Promise<void>;
  onMatchComplete: () => void;
}

function DetailPanel({
  transaction,
  accounts,
  vendors,
  communityId,
  onCategorize,
  onExclude,
  onUnmatch,
  onMatchComplete,
}: DetailPanelProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    transaction.categorized_account_id || '',
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    transaction.vendor_id || '',
  );
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState(
    transaction.merchant_name || transaction.name || '',
  );
  const [excludeReason, setExcludeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [mode, setMode] = useState<'categorize' | 'exclude'>(
    transaction.status === 'pending' ? 'categorize' : 'categorize',
  );
  const categoryRef = useRef<HTMLButtonElement>(null);

  // Reset form when transaction changes
  useEffect(() => {
    setSelectedAccountId(transaction.categorized_account_id || '');
    setSelectedVendorId(transaction.vendor_id || '');
    setCreateRule(false);
    setRulePattern(transaction.merchant_name || transaction.name || '');
    setExcludeReason('');
    setMode('categorize');
    setSaving(false);
  }, [transaction.id, transaction.categorized_account_id, transaction.vendor_id, transaction.merchant_name, transaction.name]);

  const isProcessed = ['matched', 'categorized', 'reconciled'].includes(transaction.status);

  function formatAmount(amount: number) {
    const abs = Math.abs(amount) / 100;
    return abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  async function handleCategorize() {
    if (!selectedAccountId) {
      toast.error('Select an account.');
      return;
    }
    setSaving(true);
    try {
      await onCategorize(
        transaction,
        selectedAccountId,
        selectedVendorId && selectedVendorId !== 'none' ? selectedVendorId : null,
        createRule ? { pattern: rulePattern.toLowerCase(), matchField: 'name' } : undefined,
      );
    } catch {
      toast.error('Failed to categorize.');
    }
    setSaving(false);
  }

  async function handleExclude() {
    if (!excludeReason.trim()) {
      toast.error('Provide a reason.');
      return;
    }
    setSaving(true);
    try {
      await onExclude(transaction.id, excludeReason);
    } catch {
      toast.error('Failed to exclude.');
    }
    setSaving(false);
  }

  async function handleUnmatch() {
    setSaving(true);
    try {
      await onUnmatch(transaction.id);
    } catch {
      toast.error('Failed to reset.');
    }
    setSaving(false);
  }

  // Group accounts by type for the dropdown
  const groupedAccounts = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    accounts: accounts.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  return (
    <div className="space-y-4">
      {/* Transaction header */}
      <div className="space-y-1">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          {transaction.merchant_name || transaction.name}
        </h3>
        {transaction.merchant_name && transaction.merchant_name !== transaction.name && (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {transaction.name}
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {new Date(transaction.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span
            className={`text-page-title font-semibold ${
              transaction.amount > 0
                ? 'text-red-500 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {transaction.amount > 0 ? '-' : '+'}
            {formatAmount(transaction.amount)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={transaction.status === 'pending' ? 'outline' : transaction.status === 'excluded' ? 'destructive' : 'secondary'}
            className="text-meta"
          >
            {transaction.status}
          </Badge>
          {transaction.match_method === 'ai' && (
            <Badge className="text-meta bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-0">
              <Sparkles className="h-3 w-3 mr-0.5" /> AI Categorized
              {transaction.ai_confidence != null && (
                <span className="ml-1 opacity-75">
                  ({(transaction.ai_confidence * 100).toFixed(0)}%)
                </span>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {transaction.ai_reasoning && (
        <div className="rounded-inner-card bg-violet-500/5 border border-violet-500/10 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span className="text-meta font-medium text-violet-600 dark:text-violet-400">AI Reasoning</span>
          </div>
          <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            {transaction.ai_reasoning}
          </p>
        </div>
      )}

      {/* Notes */}
      {transaction.notes && (
        <div>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Notes: </span>
          <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
            {transaction.notes}
          </span>
        </div>
      )}

      {/* Action tabs for pending */}
      {transaction.status === 'pending' && (
        <>
          <div className="flex gap-2 border-b border-stroke-light dark:border-stroke-dark pb-2">
            <button
              type="button"
              onClick={() => setMode('categorize')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-meta transition-colors ${
                mode === 'categorize'
                  ? 'bg-primary-700/10 text-primary-700 dark:bg-primary-300/10 dark:text-primary-300'
                  : 'text-text-muted-light dark:text-text-muted-dark'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Categorize
            </button>
            <button
              type="button"
              onClick={() => setMatchOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-meta text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" /> Match to Entry
            </button>
            <button
              type="button"
              onClick={() => setMode('exclude')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-meta transition-colors ${
                mode === 'exclude'
                  ? 'bg-red-500/10 text-red-500'
                  : 'text-text-muted-light dark:text-text-muted-dark'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" /> Exclude
            </button>
          </div>

          {/* Categorize form */}
          {mode === 'categorize' && (
            <div className="space-y-3">
              {/* AI suggestion quick-accept */}
              {transaction.status === 'pending' &&
                transaction.ai_confidence != null &&
                transaction.ai_confidence >= 0.5 &&
                transaction.categorized_account_id && (
                <div className="rounded-inner-card border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-meta font-medium text-amber-600 dark:text-amber-400">
                      AI Suggestion ({(transaction.ai_confidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    {accounts.find((a) => a.id === transaction.categorized_account_id)
                      ? `${accounts.find((a) => a.id === transaction.categorized_account_id)!.code} - ${accounts.find((a) => a.id === transaction.categorized_account_id)!.name}`
                      : 'Unknown account'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      setSelectedAccountId(transaction.categorized_account_id!);
                      handleCategorize();
                    }}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    <Sparkles className="h-3 w-3 mr-1" /> Accept AI Suggestion
                  </Button>
                </div>
              )}

              <div>
                <Label className="text-meta">Category (GL Account)</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="mt-1" ref={categoryRef}>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedAccounts.map((group) => (
                      <SelectGroup key={group.type}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transaction.amount > 0 && vendors.length > 0 && (
                <div>
                  <Label className="text-meta">Vendor (optional)</Label>
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Assign to vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vendor</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                          {v.company ? ` (${v.company})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Checkbox
                  id="inbox-create-rule"
                  checked={createRule}
                  onCheckedChange={(c) => setCreateRule(!!c)}
                />
                <div className="flex-1">
                  <Label htmlFor="inbox-create-rule" className="text-body">
                    Create rule for similar transactions
                  </Label>
                  {createRule && (
                    <Input
                      className="mt-1"
                      value={rulePattern}
                      onChange={(e) => setRulePattern(e.target.value)}
                      placeholder="Pattern to match"
                    />
                  )}
                </div>
              </div>

              <Button onClick={handleCategorize} disabled={saving || !selectedAccountId} className="w-full">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Categorize & Next
              </Button>
            </div>
          )}

          {/* Exclude form */}
          {mode === 'exclude' && (
            <div className="space-y-3">
              <div>
                <Label className="text-meta">Reason for excluding</Label>
                <Input
                  className="mt-1"
                  value={excludeReason}
                  onChange={(e) => setExcludeReason(e.target.value)}
                  placeholder="e.g., Duplicate, personal transfer"
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleExclude}
                disabled={saving || !excludeReason.trim()}
                className="w-full"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Exclude Transaction
              </Button>
            </div>
          )}
        </>
      )}

      {/* Reset for processed transactions */}
      {isProcessed && transaction.status !== 'reconciled' && (
        <div className="border-t border-stroke-light dark:border-stroke-dark pt-3">
          <Button size="sm" variant="outline" onClick={handleUnmatch} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Reset to Pending
          </Button>
        </div>
      )}

      {/* Match dialog */}
      <MatchTransactionDialog
        open={matchOpen}
        onOpenChange={setMatchOpen}
        communityId={communityId}
        transactionId={transaction.id}
        transactionAmount={transaction.amount}
        transactionDate={transaction.date}
        onMatch={onMatchComplete}
      />
    </div>
  );
}
