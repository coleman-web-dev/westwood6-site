'use client';

import type { Budget, BudgetLineItem } from '@/lib/types/database';

interface BudgetOverviewProps {
  budget: Budget;
  lineItems: BudgetLineItem[];
}

export function BudgetOverview({ budget, lineItems }: BudgetOverviewProps) {
  const incomeBudgeted = lineItems.filter((i) => i.is_income).reduce((s, i) => s + i.budgeted_amount, 0);
  const incomeActual = lineItems.filter((i) => i.is_income).reduce((s, i) => s + i.actual_amount, 0);
  const expenseBudgeted = lineItems.filter((i) => !i.is_income).reduce((s, i) => s + i.budgeted_amount, 0);
  const expenseActual = lineItems.filter((i) => !i.is_income).reduce((s, i) => s + i.actual_amount, 0);
  const netBudgeted = incomeBudgeted - expenseBudgeted;
  const netActual = incomeActual - expenseActual;

  const cards = [
    { label: 'Total Income', budgeted: incomeBudgeted, actual: incomeActual, color: 'text-green-600 dark:text-green-400' },
    { label: 'Total Expenses', budgeted: expenseBudgeted, actual: expenseActual, color: 'text-red-600 dark:text-red-400' },
    { label: 'Reserve Contribution', budgeted: budget.reserve_contribution, actual: budget.reserve_contribution, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Net', budgeted: netBudgeted, actual: netActual, color: netActual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-grid-gap">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding"
        >
          <p className="text-label text-text-muted-light dark:text-text-muted-dark mb-2">
            {card.label}
          </p>
          <p className={`text-metric-xl tabular-nums ${card.color}`}>
            ${(card.actual / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
            Budget: ${(card.budgeted / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      ))}
    </div>
  );
}
