'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { BankTransactionDetail } from '@/components/accounting/bank-transaction-detail';
import type { BankTransaction, BankTxnStatus } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';
import type { Vendor } from '@/lib/types/database';

const STATUS_LABELS: Record<BankTxnStatus, string> = {
  pending: 'Pending',
  matched: 'Matched',
  categorized: 'Categorized',
  excluded: 'Excluded',
  reconciled: 'Reconciled',
};

const STATUS_VARIANTS: Record<BankTxnStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  matched: 'secondary',
  categorized: 'default',
  excluded: 'destructive',
  reconciled: 'secondary',
};

interface BankTransactionListProps {
  communityId: string;
  refreshKey?: number;
}

export function BankTransactionList({ communityId, refreshKey }: BankTransactionListProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

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

    const [{ data: txns }, { data: accts }, { data: vndrs }] = await Promise.all([
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
    ]);

    setTransactions((txns as BankTransaction[]) || []);
    setAccounts((accts as Account[]) || []);
    setVendors((vndrs as Vendor[]) || []);
    setLoading(false);
  }, [communityId, statusFilter, page, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function formatAmount(amount: number) {
    const abs = Math.abs(amount) / 100;
    return abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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

  if (transactions.length === 0 && statusFilter === 'all') {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-12">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No bank transactions yet. Connect a bank account and sync transactions to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36 h-8 text-meta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="categorized">Categorized</SelectItem>
              <SelectItem value="excluded">Excluded</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        {/* Header */}
        <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark grid grid-cols-[100px_1fr_120px_100px] gap-3 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">
          <span>Date</span>
          <span>Description</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Status</span>
        </div>

        <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
          {transactions.map((txn) => (
            <button
              key={txn.id}
              type="button"
              onClick={() => setSelectedTxn(txn)}
              className="w-full text-left px-card-padding py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors grid grid-cols-[100px_1fr_120px_100px] gap-3 items-center"
            >
              <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark">
                {new Date(txn.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <div>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {txn.merchant_name || txn.name}
                </span>
                {txn.merchant_name && txn.merchant_name !== txn.name && (
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-2">
                    {txn.name}
                  </span>
                )}
              </div>
              <span
                className={`text-body tabular-nums text-right flex items-center justify-end gap-1 ${
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
              <span className="text-center">
                <Badge variant={STATUS_VARIANTS[txn.status]} className="text-meta">
                  {STATUS_LABELS[txn.status]}
                </Badge>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {transactions.length === PAGE_SIZE && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
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
