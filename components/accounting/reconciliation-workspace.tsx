'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ArrowLeft, CalendarIcon, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { Calendar } from '@/components/shared/ui/calendar';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Label } from '@/components/shared/ui/label';
import {
  completeReconciliation,
  updateReconciliationBalance,
  assignReconciliationTransactions,
  updateReconciliationPeriod,
  resetSyncCursor,
  overrideTransactionDirection,
} from '@/lib/actions/banking-actions';
import { BankTransactionDetail } from '@/components/accounting/bank-transaction-detail';
import { MerchantLogo } from '@/components/accounting/merchant-logo';
import { AccountCombobox } from '@/components/accounting/account-combobox';
import { formatBankAmount, isOutflow } from '@/lib/utils/transaction-direction';
import type { BankReconciliation, BankTransaction } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';
import type { Vendor } from '@/lib/types/database';

// ─── Date helpers ───────────────────────────────────────

function fmtDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function toISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

type RangePreset = '1m' | '3m' | '6m' | 'ytd' | 'custom';

function detectPreset(start: string, end: string): RangePreset {
  const now = new Date();
  const today = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const jan1 = `${now.getFullYear()}-01-01`;
  if (start === jan1 && end === today) return 'ytd';

  const endDate = fromISO(end);
  const startDate = fromISO(start);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (end === today) {
    if (diffDays >= 28 && diffDays <= 31) return '1m';
    if (diffDays >= 89 && diffDays <= 92) return '3m';
    if (diffDays >= 180 && diffDays <= 184) return '6m';
  }
  return 'custom';
}

function getPresetDates(preset: RangePreset): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = toISO(today);
  switch (preset) {
    case '1m': {
      const s = new Date(today);
      s.setMonth(s.getMonth() - 1);
      return { start: toISO(s), end };
    }
    case '3m': {
      const s = new Date(today);
      s.setMonth(s.getMonth() - 3);
      return { start: toISO(s), end };
    }
    case '6m': {
      const s = new Date(today);
      s.setMonth(s.getMonth() - 6);
      return { start: toISO(s), end };
    }
    case 'ytd':
    default:
      return { start: `${today.getFullYear()}-01-01`, end };
  }
}

interface ReconciliationWorkspaceProps {
  communityId: string;
  reconciliationId: string;
  onClose: () => void;
}

export function ReconciliationWorkspace({
  communityId,
  reconciliationId,
  onClose,
}: ReconciliationWorkspaceProps) {
  const [recon, setRecon] = useState<BankReconciliation | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'matched' | 'categorized' | 'excluded' | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>('custom');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [amountSignSource, setAmountSignSource] = useState<'sign' | 'name' | 'abs'>('name');
  const [overrideTxnId, setOverrideTxnId] = useState<string | null>(null);
  const [overrideApplyAll, setOverrideApplyAll] = useState(false);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const assignedRef = useRef(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch recon first to get bank account ID and date range
    const { data: reconData } = await supabase
      .from('bank_reconciliations')
      .select('*')
      .eq('id', reconciliationId)
      .single();

    if (!reconData) {
      setRecon(null);
      setLoading(false);
      return;
    }

    setRecon(reconData as BankReconciliation);

    // Fetch bank account sign source setting
    const { data: bankAcct } = await supabase
      .from('plaid_bank_accounts')
      .select('amount_sign_source')
      .eq('id', reconData.plaid_bank_account_id)
      .single();

    if (bankAcct?.amount_sign_source) {
      setAmountSignSource(bankAcct.amount_sign_source as 'sign' | 'name' | 'abs');
    }

    // Now fetch transactions for this bank account within the period
    const [txnResult, { data: accts }, { data: vndrs }] = await Promise.all([
      supabase
        .from('bank_transactions')
        .select('*')
        .eq('community_id', communityId)
        .eq('plaid_bank_account_id', reconData.plaid_bank_account_id)
        .gte('date', reconData.period_start)
        .lte('date', reconData.period_end)
        .neq('status', 'reconciled')
        .order('date', { ascending: false }),
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
    ]);

    setTransactions((txnResult.data as BankTransaction[]) || []);
    setAccounts((accts as Account[]) || []);
    setVendors((vndrs as Vendor[]) || []);
    setLoading(false);

    // Assign reconciliation_id to transactions (once per session)
    if (!assignedRef.current && reconData.status === 'in_progress') {
      assignedRef.current = true;
      await assignReconciliationTransactions(
        communityId,
        reconciliationId,
        reconData.plaid_bank_account_id,
        reconData.period_start,
        reconData.period_end,
      );
    }
  }, [communityId, reconciliationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Detect preset from current recon dates
  useEffect(() => {
    if (recon) {
      setRangePreset(detectPreset(recon.period_start, recon.period_end));
    }
  }, [recon?.period_start, recon?.period_end]);

  async function handlePresetChange(preset: RangePreset) {
    setRangePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getPresetDates(preset);
      await handlePeriodUpdate(start, end);
    }
  }

  async function handlePeriodUpdate(newStart: string, newEnd: string) {
    if (!recon) return;
    try {
      await updateReconciliationPeriod(communityId, reconciliationId, newStart, newEnd);
      // Re-assign transactions for new date range
      assignedRef.current = false;
      await fetchData();
      toast.success('Date range updated.');
    } catch {
      toast.error('Failed to update date range.');
    }
  }

  async function handleRefreshBalance() {
    try {
      const result = await updateReconciliationBalance(communityId, reconciliationId);
      toast.success(
        `GL Balance updated: ${formatCents(result.glEndingBalance || 0)}. Difference: ${formatCents(result.difference || 0)}`,
      );
      fetchData();
    } catch {
      toast.error('Failed to update balance.');
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await completeReconciliation(communityId, reconciliationId);
      toast.success('Reconciliation completed.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete reconciliation.');
    }
    setCompleting(false);
  }

  async function getConnectionId(): Promise<string | null> {
    const supabase = createClient();
    const { data: bankAccount } = await supabase
      .from('plaid_bank_accounts')
      .select('plaid_connection_id')
      .eq('id', recon!.plaid_bank_account_id)
      .single();
    return bankAccount?.plaid_connection_id || null;
  }

  async function handleSyncTransactions(withReset = false) {
    if (!recon) return;
    setSyncing(true);
    try {
      const connectionId = await getConnectionId();
      if (!connectionId) {
        toast.error('Bank account connection not found.');
        setSyncing(false);
        return;
      }

      // If resetting cursor, clear it first so Plaid does a full historical re-sync
      if (withReset) {
        await resetSyncCursor(communityId, connectionId);
        toast.info('Cursor reset. Running full re-sync...');
      }

      const res = await fetch('/api/plaid/sync-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId, connectionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Sync failed');
      } else {
        toast.success(`Synced: ${data.added} new, ${data.modified} updated`);
        // Log debug info to help diagnose sync issues
        if (data.debug) {
          console.log('[sync-debug]', JSON.stringify(data.debug, null, 2));
          if (data.added === 0 && data.modified === 0) {
            const d = data.debug;
            toast.info(
              `Plaid returned ${d.plaid_raw_added} raw txns across ${d.pages_fetched} page(s). ` +
              `${d.active_bank_accounts} active bank account(s). Cursor was ${d.cursor_was_null ? 'reset' : 'existing'}.`,
              { duration: 10000 },
            );
          }
        }
        await fetchData();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync transactions.');
    }
    setSyncing(false);
  }

  function formatCents(cents: number | null) {
    if (cents === null) return '-';
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function formatAmount(txn: BankTransaction) {
    return formatBankAmount(txn.amount, txn.name, txn.plaid_category, amountSignSource, txn.direction_override);
  }

  async function handleDirectionOverride(txnId: string) {
    const txn = transactions.find((t) => t.id === txnId);
    if (!txn) return;

    // Determine current direction and flip it
    const currentlyOutflow = isOutflow(txn.amount, txn.name, txn.plaid_category, amountSignSource, txn.direction_override);
    const newDirection = currentlyOutflow ? 'inflow' : 'outflow';

    setOverrideSaving(true);
    const result = await overrideTransactionDirection(
      communityId,
      txnId,
      newDirection as 'inflow' | 'outflow',
      overrideApplyAll,
    );
    setOverrideSaving(false);

    if (result.success) {
      const count = result.updatedCount || 1;
      toast.success(
        count > 1
          ? `Updated ${count} transactions to ${newDirection}.`
          : `Transaction marked as ${newDirection}.`,
      );
      setOverrideTxnId(null);
      setOverrideApplyAll(false);
      fetchData();
    } else {
      toast.error(result.error || 'Failed to update direction.');
    }
  }

  function AmountCell({ txn }: { txn: BankTransaction }) {
    const amt = formatAmount(txn);
    const currentlyOutflow = isOutflow(txn.amount, txn.name, txn.plaid_category, amountSignSource, txn.direction_override);
    const isOpen = overrideTxnId === txn.id;
    const newDirection = currentlyOutflow ? 'inflow' : 'outflow';

    return (
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOverrideTxnId(null);
            setOverrideApplyAll(false);
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOverrideTxnId(isOpen ? null : txn.id);
              setOverrideApplyAll(false);
            }}
            className={`text-body tabular-nums font-medium w-24 text-right cursor-pointer hover:underline ${amt.className}`}
          >
            {amt.text}
            {txn.direction_override && (
              <span className="ml-0.5 text-[9px] opacity-60" title="Manually overridden">*</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end" side="bottom">
          <p className="text-body text-text-primary-light dark:text-text-primary-dark mb-2">
            Change to <strong>{newDirection === 'inflow' ? 'inflow (+)' : 'outflow (-)'}</strong>?
          </p>
          <div className="flex items-start gap-2 mb-3">
            <Checkbox
              id={`apply-all-${txn.id}`}
              checked={overrideApplyAll}
              onCheckedChange={(checked) => setOverrideApplyAll(checked === true)}
            />
            <Label htmlFor={`apply-all-${txn.id}`} className="text-meta leading-tight cursor-pointer">
              Apply to all &ldquo;{txn.name}&rdquo; transactions
            </Label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-meta"
              onClick={() => {
                setOverrideTxnId(null);
                setOverrideApplyAll(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-meta"
              disabled={overrideSaving}
              onClick={() => handleDirectionOverride(txn.id)}
            >
              {overrideSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-48 rounded bg-muted" />
      </div>
    );
  }

  if (!recon) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-8">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Reconciliation not found.
        </p>
        <Button size="sm" variant="ghost" onClick={onClose} className="mt-2">
          Go Back
        </Button>
      </div>
    );
  }

  const pending = transactions.filter((t) => t.status === 'pending');
  const matched = transactions.filter((t) => t.status === 'matched');
  const categorized = transactions.filter((t) => t.status === 'categorized');
  const excluded = transactions.filter((t) => t.status === 'excluded');
  const canComplete = recon.difference === 0 && pending.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Bank Reconciliation
          </h2>
        </div>
        {/* Date range selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={rangePreset} onValueChange={(v) => handlePresetChange(v as RangePreset)}>
            <SelectTrigger className="w-[180px] h-8 text-meta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="1m">Last 1 Month</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-meta font-normal gap-1.5">
                <CalendarIcon className="h-3 w-3 opacity-50" />
                {fmtDate(fromISO(recon.period_start))}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fromISO(recon.period_start)}
                onSelect={(d) => {
                  if (d) {
                    setRangePreset('custom');
                    handlePeriodUpdate(toISO(d), recon.period_end);
                  }
                  setStartPickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">to</span>
          <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-meta font-normal gap-1.5">
                <CalendarIcon className="h-3 w-3 opacity-50" />
                {fmtDate(fromISO(recon.period_end))}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={fromISO(recon.period_end)}
                onSelect={(d) => {
                  if (d) {
                    setRangePreset('custom');
                    handlePeriodUpdate(recon.period_start, toISO(d));
                  }
                  setEndPickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Balance comparison */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Statement Balance
            </p>
            <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark tabular-nums">
              {formatCents(recon.statement_ending_balance)}
            </p>
          </div>
          <div>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              GL Book Balance
            </p>
            <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark tabular-nums">
              {formatCents(recon.gl_ending_balance)}
            </p>
          </div>
          <div>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Difference
            </p>
            <p
              className={`text-metric-xl tabular-nums ${
                recon.difference === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              }`}
            >
              {formatCents(recon.difference)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => handleSyncTransactions(false)} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Sync Transactions
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSyncTransactions(true)}
            disabled={syncing}
            title="Clears the sync cursor and pulls all historical transactions from Plaid"
          >
            Reset & Re-sync
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefreshBalance}>
            Refresh Balance
          </Button>
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={!canComplete || completing}
          >
            {completing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            )}
            Complete Reconciliation
          </Button>
          {!canComplete && (
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark self-center">
              {pending.length > 0
                ? `${pending.length} pending transaction${pending.length !== 1 ? 's' : ''} remaining`
                : recon.difference !== 0
                  ? 'Balance difference must be $0.00'
                  : ''}
            </span>
          )}
        </div>
      </div>

      {/* Transaction summary - clickable to filter */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: 'Pending', key: 'pending' as const, count: pending.length, variant: 'outline' as const },
          { label: 'Matched', key: 'matched' as const, count: matched.length, variant: 'secondary' as const },
          { label: 'Categorized', key: 'categorized' as const, count: categorized.length, variant: 'default' as const },
          { label: 'Excluded', key: 'excluded' as const, count: excluded.length, variant: 'destructive' as const },
        ]).map((s) => (
          <button
            key={s.label}
            onClick={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
            className={`rounded-inner-card border p-3 text-center transition-all cursor-pointer ${
              statusFilter === s.key
                ? 'border-secondary-400 ring-2 ring-secondary-400/30 bg-surface-light-2 dark:bg-surface-dark-2'
                : 'border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark hover:border-text-muted-light dark:hover:border-text-muted-dark'
            }`}
          >
            <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark">
              {s.count}
            </p>
            <Badge variant={s.variant} className="text-meta mt-1">
              {s.label}
            </Badge>
          </button>
        ))}
      </div>

      {/* No transactions message */}
      {transactions.length === 0 && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-8">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No transactions found for this bank account between{' '}
            {new Date(recon.period_start + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} and{' '}
            {new Date(recon.period_end + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
            Make sure you have synced transactions and the date range covers your bank statement period.
          </p>
        </div>
      )}

      {/* Pending transactions (action needed) */}
      {pending.length > 0 && (!statusFilter || statusFilter === 'pending') && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Needs Review ({pending.length})
            </h3>
          </div>
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {pending.map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="px-card-padding py-2.5 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <MerchantLogo name={txn.merchant_name || txn.name} logoUrl={txn.logo_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                      {txn.merchant_name || txn.name}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {txn.merchant_name && txn.name !== txn.merchant_name && (
                        <span className="ml-1.5">{txn.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div onClick={(e) => e.stopPropagation()}>
                      <AccountCombobox
                        communityId={communityId}
                        transactionId={txn.id}
                        currentAccountId={txn.categorized_account_id}
                        accounts={accounts}
                        onUpdate={fetchData}
                      />
                    </div>
                    {txn.ai_confidence != null && txn.ai_confidence >= 0.5 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-medium">
                        <Sparkles className="h-2.5 w-2.5" />
                        {(txn.ai_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <AmountCell txn={txn} />
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Cleared transactions */}
      {(matched.length > 0 || categorized.length > 0) && (!statusFilter || statusFilter === 'matched' || statusFilter === 'categorized') && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              {statusFilter === 'matched' ? `Matched (${matched.length})` : statusFilter === 'categorized' ? `Categorized (${categorized.length})` : `Cleared (${matched.length + categorized.length})`}
            </h3>
          </div>
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {(statusFilter === 'matched' ? matched : statusFilter === 'categorized' ? categorized : [...matched, ...categorized]).map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="px-card-padding py-2.5 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <MerchantLogo name={txn.merchant_name || txn.name} logoUrl={txn.logo_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                      {txn.merchant_name || txn.name}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {txn.merchant_name && txn.name !== txn.merchant_name && (
                        <span className="ml-1.5">{txn.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div onClick={(e) => e.stopPropagation()}>
                      <AccountCombobox
                        communityId={communityId}
                        transactionId={txn.id}
                        currentAccountId={txn.categorized_account_id}
                        accounts={accounts}
                        onUpdate={fetchData}
                      />
                    </div>
                    {txn.match_method === 'ai' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-medium">
                        <Sparkles className="h-2.5 w-2.5" />
                        {txn.ai_confidence != null ? `${(txn.ai_confidence * 100).toFixed(0)}%` : 'AI'}
                      </span>
                    )}
                    {txn.match_method === 'rule' && (
                      <Badge variant="outline" className="text-[10px]">
                        Rule
                      </Badge>
                    )}
                    <AmountCell txn={txn} />
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Excluded transactions */}
      {excluded.length > 0 && (!statusFilter || statusFilter === 'excluded') && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-muted-light dark:text-text-muted-dark">
              Excluded ({excluded.length})
            </h3>
          </div>
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {excluded.map((txn) => {
              return (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="px-card-padding py-2.5 flex items-center gap-3 opacity-50 hover:opacity-75 cursor-pointer transition-opacity"
                >
                  <MerchantLogo name={txn.merchant_name || txn.name} logoUrl={txn.logo_url} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark truncate">
                      {txn.merchant_name || txn.name}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {txn.excluded_reason && (
                        <span className="ml-1.5 italic">{txn.excluded_reason}</span>
                      )}
                    </p>
                  </div>
                  <AmountCell txn={txn} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedTxn && (
        <BankTransactionDetail
          transaction={selectedTxn}
          communityId={communityId}
          accounts={accounts}
          vendors={vendors}
          amountSignSource={amountSignSource}
          open={!!selectedTxn}
          onOpenChange={(open) => !open && setSelectedTxn(null)}
          onUpdate={() => {
            setSelectedTxn(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
