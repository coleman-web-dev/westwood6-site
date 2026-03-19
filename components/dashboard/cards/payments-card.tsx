'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { CreditCard } from 'lucide-react';
import type { Payment } from '@/lib/types/database';

export function PaymentsCard() {
  const { community, unit, isBoard, viewMode } = useCommunity();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminView = isBoard && viewMode === 'admin';

  useEffect(() => {
    if (!isAdminView && !unit) { setLoading(false); return; }

    const supabase = createClient();

    async function fetchPayments() {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (isAdminView) {
        // Community-wide: join through invoices to get community_id
        // payments don't have community_id, so filter by units in community
        const { data: unitIds } = await supabase
          .from('units')
          .select('id')
          .eq('community_id', community.id);
        const ids = unitIds?.map((u: { id: string }) => u.id) ?? [];
        if (ids.length > 0) {
          query = query.in('unit_id', ids);
        }
      } else {
        query = query.eq('unit_id', unit!.id);
      }

      const { data } = await query;
      setPayments((data as Payment[]) ?? []);
      setLoading(false);
    }

    fetchPayments();
  }, [unit, isAdminView, community.id]);

  return (
    <DashboardCardShell title="Recent Payments">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CreditCard className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No recent payments.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
          <Link
            href={`/${community.slug}/payments`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all payments
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
