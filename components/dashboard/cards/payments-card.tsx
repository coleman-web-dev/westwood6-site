'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import type { Payment } from '@/lib/types/database';

export function PaymentsCard() {
  const { unit } = useCommunity();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unit) { setLoading(false); return; }

    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('unit_id', unit!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setPayments((data as Payment[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [unit]);

  return (
    <DashboardCardShell title="Recent Payments">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No payments yet.</p>
      ) : (
        <ul className="space-y-3">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                {new Date(p.created_at).toLocaleDateString()}
              </p>
              <p className="text-body font-medium tabular-nums">
                ${(p.amount / 100).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
