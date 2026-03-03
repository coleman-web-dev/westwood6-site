'use client';

import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Invoice, Payment } from '@/lib/types/database';

interface CollectionSummaryProps {
  invoices: Invoice[];
  payments: Payment[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function CollectionSummary({ invoices, payments }: CollectionSummaryProps) {
  const nonVoided = invoices.filter((inv) => inv.status !== 'voided');
  const totalBilled = nonVoided.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const outstanding = nonVoided
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partial')
    .reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  let rateColor = 'text-red-500';
  if (collectionRate >= 90) rateColor = 'text-mint';
  else if (collectionRate >= 70) rateColor = 'text-amber-400';

  const cards = [
    {
      label: 'Total Billed',
      value: `$${formatDollars(totalBilled)}`,
      icon: DollarSign,
      iconBg: 'bg-secondary-100 dark:bg-secondary-900',
      iconColor: 'text-secondary-600 dark:text-secondary-400',
    },
    {
      label: 'Total Collected',
      value: `$${formatDollars(totalCollected)}`,
      icon: CheckCircle2,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Collection Rate',
      value: `${collectionRate.toFixed(1)}%`,
      icon: TrendingUp,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: rateColor,
    },
    {
      label: 'Outstanding',
      value: `$${formatDollars(outstanding)}`,
      icon: AlertCircle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid gap-grid-gap grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-inner-card ${card.iconBg}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {card.label}
              </p>
              <p className={`text-metric-xl tabular-nums ${card.valueColor || 'text-text-primary-light dark:text-text-primary-dark'}`}>
                {card.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
