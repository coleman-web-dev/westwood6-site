'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { CheckCircle2, AlertTriangle, Wallet, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Invoice, Payment, WalletTransaction, LedgerEntry } from '@/lib/types/database';

interface HouseholdFinancialSummaryProps {
  unitId: string;
  communityId: string;
}

export function HouseholdFinancialSummary({ unitId, communityId }: HouseholdFinancialSummaryProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);
  const [hasOverdue, setHasOverdue] = useState(false);
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [walletResult, invoiceResult, paymentResult, walletTxResult] = await Promise.all([
      supabase.from('unit_wallets').select('balance').eq('unit_id', unitId).single(),
      supabase
        .from('invoices')
        .select('id, title, amount, amount_paid, status, due_date')
        .eq('unit_id', unitId)
        .in('status', ['pending', 'overdue', 'partial']),
      supabase
        .from('payments')
        .select('id, amount, created_at')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('wallet_transactions')
        .select('id, amount, type, description, created_at')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // Wallet
    setWalletBalance(walletResult.data?.balance ?? 0);

    // Outstanding invoices
    const invoices = (invoiceResult.data as Pick<Invoice, 'id' | 'title' | 'amount' | 'amount_paid' | 'status' | 'due_date'>[]) ?? [];
    setOutstandingCount(invoices.length);
    setOutstandingAmount(invoices.reduce((sum, inv) => sum + (inv.amount - (inv.amount_paid ?? 0)), 0));
    setHasOverdue(invoices.some((inv) => inv.status === 'overdue'));

    // Recent ledger (merge payments + wallet transactions, most recent 5)
    const entries: LedgerEntry[] = [];
    for (const pmt of (paymentResult.data as Pick<Payment, 'id' | 'amount' | 'created_at'>[]) ?? []) {
      entries.push({
        entry_date: pmt.created_at,
        entry_type: 'payment',
        description: 'Payment',
        amount: -pmt.amount,
        running_balance: 0,
        reference_id: pmt.id,
        member_name: null,
      });
    }
    for (const tx of (walletTxResult.data as Pick<WalletTransaction, 'id' | 'amount' | 'type' | 'description' | 'created_at'>[]) ?? []) {
      entries.push({
        entry_date: tx.created_at,
        entry_type: tx.type,
        description: tx.description ?? tx.type.replace(/_/g, ' '),
        amount: -tx.amount,
        running_balance: 0,
        reference_id: tx.id,
        member_name: null,
      });
    }
    entries.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    setRecentEntries(entries.slice(0, 5));
    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const TYPE_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
    payment: { variant: 'secondary', label: 'Payment' },
    manual_credit: { variant: 'secondary', label: 'Credit' },
    manual_debit: { variant: 'destructive', label: 'Debit' },
    overpayment: { variant: 'secondary', label: 'Overpayment' },
    payment_applied: { variant: 'secondary', label: 'Applied' },
    refund: { variant: 'outline', label: 'Refund' },
    deposit_return: { variant: 'secondary', label: 'Deposit Return' },
    bounced_reversal: { variant: 'destructive', label: 'Bounced' },
  };

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
        <div className="animate-pulse h-5 w-1/3 rounded bg-muted" />
        <div className="animate-pulse h-8 w-1/4 rounded bg-muted" />
        <div className="animate-pulse h-4 w-1/2 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Financial Summary
        </h2>
        {hasOverdue ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Past Due
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0">
            <CheckCircle2 className="h-3 w-3" />
            Dues Current
          </Badge>
        )}
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Wallet</span>
          </div>
          <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
            ${(walletBalance / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Outstanding</span>
          <p className={`text-metric-xl tabular-nums ${outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
            ${(outstandingAmount / 100).toFixed(2)}
          </p>
          {outstandingCount > 0 && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {outstandingCount} invoice{outstandingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recentEntries.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Recent Activity
          </h3>
          {recentEntries.map((entry, idx) => {
            const badge = TYPE_BADGE[entry.entry_type] ?? { variant: 'outline' as const, label: entry.entry_type };
            const isCredit = entry.amount < 0;

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={badge.variant} className="text-[10px] shrink-0">{badge.label}</Badge>
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {new Date(entry.entry_date.includes('T') ? entry.entry_date : entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <span className={`text-label tabular-nums shrink-0 ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isCredit ? '-' : '+'}${(Math.abs(entry.amount) / 100).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={`/${community.slug}/payments?tab=ledger&unit=${unitId}`}
        className="inline-flex items-center gap-1 text-label text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400"
      >
        View Full Ledger
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
