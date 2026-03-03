'use client';

import type { Budget } from '@/lib/types/database';

interface ReserveFundCardProps {
  budgets: Budget[];
}

export function ReserveFundCard({ budgets }: ReserveFundCardProps) {
  const totalReserves = budgets.reduce((s, b) => s + b.reserve_contribution, 0);

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-3">
        Reserve Fund
      </h2>
      <p className="text-metric-xl tabular-nums text-blue-600 dark:text-blue-400">
        ${(totalReserves / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
        Total contributions across {budgets.length} fiscal year{budgets.length !== 1 ? 's' : ''}
      </p>

      {budgets.length > 1 && (
        <div className="mt-4 space-y-2">
          {budgets.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center justify-between">
              <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                FY {b.fiscal_year}
              </span>
              <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
                ${(b.reserve_contribution / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
