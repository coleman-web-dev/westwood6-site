'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { DashboardCardShell } from './dashboard-card-shell';

export function BalanceCard() {
  const { community, unit, isBoard, viewMode } = useCommunity();
  const [balance, setBalance] = useState<number | null>(null);
  const [walletCredit, setWalletCredit] = useState<number>(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isAdminView = isBoard && viewMode === 'admin';

  useEffect(() => {
    if (!isAdminView && !unit) {
      setLoading(false);
      return;
    }

    let active = true;
    const supabase = createClient();

    async function fetchBalance() {
      if (isAdminView) {
        // Community-wide outstanding
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount, amount_paid, status')
          .eq('community_id', community.id)
          .in('status', ['pending', 'overdue', 'partial']);

        if (!active) return;
        const total = invoices?.reduce((sum: number, inv: { amount: number; amount_paid: number | null }) =>
          sum + (inv.amount - (inv.amount_paid ?? 0)), 0) ?? 0;
        setBalance(total);
        setOutstandingCount(invoices?.length ?? 0);
        setOverdueCount(invoices?.filter((inv: { status: string }) => inv.status === 'overdue').length ?? 0);
        setWalletCredit(0);
      } else {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount, amount_paid, status')
          .eq('unit_id', unit!.id)
          .in('status', ['pending', 'overdue', 'partial']);

        if (!active) return;
        const total = invoices?.reduce((sum: number, inv: { amount: number; amount_paid: number | null }) =>
          sum + (inv.amount - (inv.amount_paid ?? 0)), 0) ?? 0;
        setBalance(total);

        const { data: walletData } = await supabase
          .from('unit_wallets')
          .select('balance')
          .eq('unit_id', unit!.id)
          .single();

        if (!active) return;
        setWalletCredit(walletData?.balance ?? 0);
      }
      setLoading(false);
    }

    fetchBalance();
    return () => { active = false; };
  }, [unit, isAdminView, community.id]);

  return (
    <DashboardCardShell title={isAdminView ? 'Community Outstanding' : 'Account Balance'}>
      {loading ? (
        <div className="animate-pulse h-8 w-24 rounded bg-muted" />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-metric-xl tabular-nums">
              ${((balance ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-1">
              {isAdminView
                ? `${outstandingCount} outstanding invoice${outstandingCount !== 1 ? 's' : ''}${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}`
                : 'Outstanding balance'}
            </p>
            {walletCredit > 0 && (
              <p className="text-meta text-primary-600 dark:text-primary-400 mt-1 tabular-nums">
                Credit: ${(walletCredit / 100).toFixed(2)}
              </p>
            )}
          </div>
          {!isAdminView && (balance ?? 0) > 0 && (
            <Button asChild size="sm" className="w-full">
              <Link href={`/${community.slug}/payments`}>
                Pay now
              </Link>
            </Button>
          )}
          <Link
            href={`/${community.slug}/payments`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View invoices &amp; payments
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
