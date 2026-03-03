'use client';

import type { Invoice } from '@/lib/types/database';

interface AgingReportProps {
  invoices: Invoice[];
}

interface AgingBucket {
  label: string;
  invoices: Invoice[];
  unitIds: Set<string>;
  total: number;
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function AgingReport({ invoices }: AgingReportProps) {
  const outstanding = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partial'
  );

  const now = new Date();

  const buckets: AgingBucket[] = [
    { label: 'Current', invoices: [], unitIds: new Set(), total: 0 },
    { label: '1-30 days', invoices: [], unitIds: new Set(), total: 0 },
    { label: '31-60 days', invoices: [], unitIds: new Set(), total: 0 },
    { label: '61-90 days', invoices: [], unitIds: new Set(), total: 0 },
    { label: '90+ days', invoices: [], unitIds: new Set(), total: 0 },
  ];

  for (const inv of outstanding) {
    const owed = inv.amount - inv.amount_paid;
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let bucketIndex: number;
    if (daysOverdue <= 0) bucketIndex = 0;
    else if (daysOverdue <= 30) bucketIndex = 1;
    else if (daysOverdue <= 60) bucketIndex = 2;
    else if (daysOverdue <= 90) bucketIndex = 3;
    else bucketIndex = 4;

    buckets[bucketIndex].invoices.push(inv);
    buckets[bucketIndex].unitIds.add(inv.unit_id);
    buckets[bucketIndex].total += owed;
  }

  const totalOutstanding = outstanding.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  if (outstanding.length === 0) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
          Aging Report
        </h3>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          No outstanding invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Aging Report
      </h3>
      <div className="space-y-3">
        {buckets.map((bucket) => {
          const pct = totalOutstanding > 0 ? (bucket.total / totalOutstanding) * 100 : 0;
          return (
            <div key={bucket.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {bucket.label}
                </span>
                <div className="flex items-center gap-3 text-meta text-text-secondary-light dark:text-text-secondary-dark">
                  <span>{bucket.invoices.length} invoice{bucket.invoices.length !== 1 ? 's' : ''}</span>
                  <span>{bucket.unitIds.size} unit{bucket.unitIds.size !== 1 ? 's' : ''}</span>
                  <span className="font-medium tabular-nums text-text-primary-light dark:text-text-primary-dark">
                    ${formatDollars(bucket.total)}
                  </span>
                </div>
              </div>
              <div className="relative h-2 rounded-full bg-primary-100 dark:bg-primary-800/40 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-secondary-400"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
