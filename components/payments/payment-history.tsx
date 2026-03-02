'use client';

import type { Payment, Invoice } from '@/lib/types/database';

interface PaymentHistoryProps {
  payments: Payment[];
  invoices: Invoice[];
  loading: boolean;
}

export function PaymentHistory({ payments, invoices, loading }: PaymentHistoryProps) {
  // Build a lookup for invoice titles
  const invoiceMap = new Map<string, Invoice>();
  for (const inv of invoices) {
    invoiceMap.set(inv.id, inv);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-1/2 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No payments recorded.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => {
        const invoice = invoiceMap.get(payment.invoice_id);

        return (
          <div
            key={payment.id}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                  {invoice ? invoice.title : 'Payment'}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                  {new Date(payment.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <p className="text-metric-l tabular-nums text-text-primary-light dark:text-text-primary-dark shrink-0">
                ${(payment.amount / 100).toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
