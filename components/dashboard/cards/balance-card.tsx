'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';

export function BalanceCard() {
  const { unit } = useCommunity();
  const [balance, setBalance] = useState<number | null>(null);
  const [walletCredit, setWalletCredit] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unit) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchBalance() {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('unit_id', unit!.id)
        .in('status', ['pending', 'overdue', 'partial']);

      const total = invoices?.reduce((sum: number, inv: { amount: number }) => sum + inv.amount, 0) ?? 0;
      setBalance(total);

      // Fetch wallet credit
      const { data: walletData } = await supabase
        .from('unit_wallets')
        .select('balance')
        .eq('unit_id', unit!.id)
        .single();

      setWalletCredit(walletData?.balance ?? 0);
      setLoading(false);
    }

    fetchBalance();
  }, [unit]);

  return (
    <DashboardCardShell title="Account Balance">
      {loading ? (
        <div className="animate-pulse h-8 w-24 rounded bg-muted" />
      ) : (
        <div>
          <p className="text-metric-xl tabular-nums">
            ${((balance ?? 0) / 100).toFixed(2)}
          </p>
          <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Outstanding balance
          </p>
          {walletCredit > 0 && (
            <p className="text-meta text-primary-600 dark:text-primary-400 mt-1 tabular-nums">
              Credit: ${(walletCredit / 100).toFixed(2)}
            </p>
          )}
        </div>
      )}
    </DashboardCardShell>
  );
}
