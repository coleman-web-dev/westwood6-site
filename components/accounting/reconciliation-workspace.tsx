'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  completeReconciliation,
  updateReconciliationBalance,
  assignReconciliationTransactions,
} from '@/lib/actions/banking-actions';
import { BankTransactionDetail } from '@/components/accounting/bank-transaction-detail';
import { MerchantLogo } from '@/components/accounting/merchant-logo';
import { AccountCombobox } from '@/components/accounting/account-combobox';
import type { BankReconciliation, BankTransaction } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';
import type { Vendor } from '@/lib/types/database';

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

  async function handleSyncTransactions() {
    if (!recon) return;
    setSyncing(true);
    try {
      // Look up the Plaid connection for this bank account
      const supabase = createClient();
      const { data: bankAccount } = await supabase
        .from('plaid_bank_accounts')
        .select('plaid_connection_id')
        .eq('id', recon.plaid_bank_account_id)
        .single();

      if (!bankAccount) {
        toast.error('Bank account connection not found.');
        setSyncing(false);
        return;
      }

      const res = await fetch('/api/plaid/sync-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          connectionId: bankAccount.plaid_connection_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Sync failed');
      } else {
        toast.success(`Synced: ${data.added} new, ${data.modified} updated`);
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

  function formatAmount(amount: number) {
    // Plaid: positive = money leaving (debit), negative = money entering (credit)
    const isDebit = amount > 0;
    return {
      text: `${isDebit ? '-' : '+'}${(Math.abs(amount) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
      className: isDebit ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400',
    };
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
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Bank Reconciliation
          </h2>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {new Date(recon.period_start).toLocaleDateString()} -{' '}
            {new Date(recon.period_end).toLocaleDateString()}
          </p>
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
          <Button size="sm" variant="outline" onClick={handleSyncTransactions} disabled={syncing}>
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Sync Transactions
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
            {new Date(recon.period_start).toLocaleDateString()} and{' '}
            {new Date(recon.period_end).toLocaleDateString()}.
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
            {pending.map((txn) => {
              const amt = formatAmount(txn.amount);
              return (
                <div
                  key={txn.id}
                  className="px-card-padding py-2.5 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3"
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
                    <AccountCombobox
                      communityId={communityId}
                      transactionId={txn.id}
                      currentAccountId={txn.categorized_account_id}
                      accounts={accounts}
                      onUpdate={fetchData}
                    />
                    {txn.ai_confidence != null && txn.ai_confidence >= 0.5 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-medium">
                        <Sparkles className="h-2.5 w-2.5" />
                        {(txn.ai_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <span className={`text-body tabular-nums font-medium w-24 text-right ${amt.className}`}>
                      {amt.text}
                    </span>
                  </div>
                </div>
              );
            })}
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
            {(statusFilter === 'matched' ? matched : statusFilter === 'categorized' ? categorized : [...matched, ...categorized]).map((txn) => {
              const amt = formatAmount(txn.amount);
              return (
                <div
                  key={txn.id}
                  className="px-card-padding py-2.5 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3"
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
                    <AccountCombobox
                      communityId={communityId}
                      transactionId={txn.id}
                      currentAccountId={txn.categorized_account_id}
                      accounts={accounts}
                      onUpdate={fetchData}
                    />
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
                    <span className={`text-body tabular-nums font-medium w-24 text-right ${amt.className}`}>
                      {amt.text}
                    </span>
                  </div>
                </div>
              );
            })}
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
              const amt = formatAmount(txn.amount);
              return (
                <div
                  key={txn.id}
                  className="px-card-padding py-2.5 flex items-center gap-3 opacity-50"
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
                  <span className={`text-body tabular-nums font-medium w-24 text-right ${amt.className} opacity-70`}>
                    {amt.text}
                  </span>
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
