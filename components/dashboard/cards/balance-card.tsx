'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { CreditCard } from 'lucide-react';

export function BalanceCard() {
  const { unit } = useCommunity();
  const [balance, setBalance] = useState<number | null>(null);
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
      setLoading(false);
    }

    fetchBalance();
  }, [unit]);

  return (
    <DashboardCardShell title="Account Balance" icon={<CreditCard className="h-4 w-4 text-secondary-500" />}>
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
        </div>
      )}
    </DashboardCardShell>
  );
}
