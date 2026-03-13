'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface HouseholdPaymentHistoryProps {
  unitId: string;
  communityId: string;
}

interface PaymentRow {
  id: string;
  amount: number;
  created_at: string;
  invoices: { title: string } | null;
}

export function HouseholdPaymentHistory({ unitId, communityId }: HouseholdPaymentHistoryProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from('payments')
      .select('id, amount, created_at, invoices(title)')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(10);

    setPayments((data as PaymentRow[]) ?? []);
    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-secondary-500" />
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Payment History
          </h2>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-8 rounded bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Payment History
        </h2>
      </div>

      {payments.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No payments recorded.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stroke-light dark:border-stroke-dark">
                <th className="text-label text-text-secondary-light dark:text-text-secondary-dark pb-2 pr-4">Date</th>
                <th className="text-label text-text-secondary-light dark:text-text-secondary-dark pb-2 pr-4">Description</th>
                <th className="text-label text-text-secondary-light dark:text-text-secondary-dark pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt) => (
                <tr key={pmt.id} className="border-b border-stroke-light/50 dark:border-stroke-dark/50 last:border-0">
                  <td className="text-meta text-text-muted-light dark:text-text-muted-dark py-2 pr-4 whitespace-nowrap">
                    {new Date(pmt.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="text-body text-text-primary-light dark:text-text-primary-dark py-2 pr-4">
                    {pmt.invoices?.title ?? 'Payment'}
                  </td>
                  <td className="text-body tabular-nums text-green-600 dark:text-green-400 py-2 text-right whitespace-nowrap">
                    ${(pmt.amount / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        href={`/${community.slug}/payments`}
        className="inline-flex items-center gap-1 text-label text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400"
      >
        View All Payments
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
