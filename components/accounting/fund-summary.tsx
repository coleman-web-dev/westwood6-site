'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import type { FundSummary } from '@/lib/types/accounting';

interface FundSummaryCardsProps {
  communityId: string;
}

export function FundSummaryCards({ communityId }: FundSummaryCardsProps) {
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/accounting/fund-summary?community_id=${communityId}`);
        if (res.ok) {
          setSummary(await res.json());
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [communityId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-gap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
            <div className="animate-pulse h-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No accounting data available yet. Create some invoices or payments to see your financial overview.
        </p>
      </div>
    );
  }

  const cards = [
    {
      icon: DollarSign,
      label: 'Operating Cash',
      value: summary.operating_balance,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: DollarSign,
      label: 'Reserve Fund',
      value: summary.reserve_balance,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: FileText,
      label: 'Accounts Receivable',
      value: summary.total_ar,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: summary.total_revenue_ytd - summary.total_expenses_ytd >= 0 ? TrendingUp : TrendingDown,
      label: 'Net Income (YTD)',
      value: summary.total_revenue_ytd - summary.total_expenses_ytd,
      color: summary.total_revenue_ytd - summary.total_expenses_ytd >= 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-gap">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
        >
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {card.label}
            </span>
          </div>
          <p className={`text-metric-xl tabular-nums ${card.color}`}>
            {card.value < 0 ? '-' : ''}${(Math.abs(card.value) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      ))}
    </div>
  );
}
