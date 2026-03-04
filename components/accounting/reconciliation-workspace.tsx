'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  completeReconciliation,
  updateReconciliationBalance,
} from '@/lib/actions/banking-actions';
import { BankTransactionDetail } from '@/components/accounting/bank-transaction-detail';
import type { BankReconciliation, BankTransaction } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';

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
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [{ data: reconData }, { data: txns }, { data: accts }] = await Promise.all([
      supabase
        .from('bank_reconciliations')
        .select('*')
        .eq('id', reconciliationId)
        .single(),
      supabase
        .from('bank_transactions')
        .select('*')
        .eq('community_id', communityId)
        .or(
          `reconciliation_id.eq.${reconciliationId},and(status.eq.pending,reconciliation_id.is.null)`,
        )
        .order('date', { ascending: false }),
      supabase
        .from('accounts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('code'),
    ]);

    setRecon(reconData as BankReconciliation);
    setTransactions((txns as BankTransaction[]) || []);
    setAccounts((accts as Account[]) || []);
    setLoading(false);
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

  function formatCents(cents: number | null) {
    if (cents === null) return '-';
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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

      {/* Transaction summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: pending.length, variant: 'outline' as const },
          { label: 'Matched', count: matched.length, variant: 'secondary' as const },
          { label: 'Categorized', count: categorized.length, variant: 'default' as const },
          { label: 'Excluded', count: excluded.length, variant: 'destructive' as const },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center"
          >
            <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark">
              {s.count}
            </p>
            <Badge variant={s.variant} className="text-meta mt-1">
              {s.label}
            </Badge>
          </div>
        ))}
      </div>

      {/* Pending transactions (action needed) */}
      {pending.length > 0 && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Needs Review ({pending.length})
            </h3>
          </div>
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {pending.map((txn) => (
              <button
                key={txn.id}
                type="button"
                onClick={() => setSelectedTxn(txn)}
                className="w-full text-left px-card-padding py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3"
              >
                <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-20 shrink-0">
                  {new Date(txn.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 truncate">
                  {txn.merchant_name || txn.name}
                </span>
                <span
                  className={`text-body tabular-nums shrink-0 ${
                    txn.amount > 0
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {txn.amount > 0 ? '-' : '+'}
                  {(Math.abs(txn.amount) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Processed transactions summary */}
      {(matched.length > 0 || categorized.length > 0) && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              Cleared ({matched.length + categorized.length})
            </h3>
          </div>
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {[...matched, ...categorized].map((txn) => (
              <div
                key={txn.id}
                className="px-card-padding py-2 flex items-center gap-3 text-text-secondary-light dark:text-text-secondary-dark"
              >
                <span className="text-meta tabular-nums w-20 shrink-0">
                  {new Date(txn.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-body flex-1 truncate">
                  {txn.merchant_name || txn.name}
                </span>
                <Badge variant="secondary" className="text-meta shrink-0">
                  {txn.status}
                </Badge>
                <span className="text-body tabular-nums shrink-0">
                  {(Math.abs(txn.amount) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTxn && (
        <BankTransactionDetail
          transaction={selectedTxn}
          communityId={communityId}
          accounts={accounts}
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
