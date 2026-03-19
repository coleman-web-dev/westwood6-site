'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { CreditCard } from 'lucide-react';

interface PaymentRow {
  id: string;
  unit_id: string;
  amount: number;
  created_at: string;
  units: { unit_number: string; address: string | null } | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

export function PaymentsCard() {
  const { community, unit, isBoard, viewMode } = useCommunity();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminView = isBoard && viewMode === 'admin';

  useEffect(() => {
    if (!isAdminView && !unit) { setLoading(false); return; }

    const supabase = createClient();

    async function fetchPayments() {
      if (isAdminView) {
        // Community-wide with unit address
        const { data: unitIds } = await supabase
          .from('units')
          .select('id')
          .eq('community_id', community.id);
        const ids = unitIds?.map((u: { id: string }) => u.id) ?? [];
        if (ids.length > 0) {
          const { data } = await supabase
            .from('payments')
            .select('id, unit_id, amount, created_at, units(unit_number, address)')
            .in('unit_id', ids)
            .order('created_at', { ascending: false })
            .limit(5);
          setPayments((data as PaymentRow[]) ?? []);
        }
      } else {
        const { data } = await supabase
          .from('payments')
          .select('id, unit_id, amount, created_at, units(unit_number, address)')
          .eq('unit_id', unit!.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setPayments((data as PaymentRow[]) ?? []);
      }
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
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${community.slug}/household?unit=${p.unit_id}`}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 -mx-2 rounded-md hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
                >
                  <div className="min-w-0">
                    {isAdminView && p.units?.address && (
                      <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                        {p.units.address}
                      </p>
                    )}
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <p className="text-body font-medium tabular-nums text-green-600 dark:text-green-400 shrink-0">
                    ${(p.amount / 100).toFixed(2)}
                  </p>
                </Link>
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
