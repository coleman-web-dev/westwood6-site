'use client';

import { useState, useEffect } from 'react';
import type { BudgetVarianceRow } from '@/lib/types/accounting';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  communityId: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function BudgetVariance({ communityId }: Props) {
  const [rows, setRows] = useState<BudgetVarianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/accounting/reports?report=budget-variance&community_id=${communityId}&year=${year}`
        );
        if (res.ok) {
          const data = await res.json();
          setRows(data.rows || []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [communityId, year]);

  const incomeRows = rows.filter((r) => r.is_income);
  const expenseRows = rows.filter((r) => !r.is_income);
  const alertCount = expenseRows.filter((r) => r.over_threshold).length;

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-48 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Budget Variance
          </h3>
          {alertCount > 0 && (
            <span className="inline-flex items-center gap-1 text-meta text-warning-dot bg-warning-dot/10 px-2 py-0.5 rounded-pill">
              <AlertTriangle className="h-3 w-3" />
              {alertCount} over budget
            </span>
          )}
        </div>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-2 py-1 text-meta text-text-primary-light dark:text-text-primary-dark"
        >
          {[0, 1, 2].map((offset) => {
            const y = new Date().getFullYear() - offset;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No budget found for {year}. Create a budget in the Budget section first.
        </p>
      ) : (
        <div className="space-y-6">
          {incomeRows.length > 0 && (
            <div>
              <h4 className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2 uppercase tracking-wide">
                Income
              </h4>
              <VarianceTable rows={incomeRows} />
            </div>
          )}
          {expenseRows.length > 0 && (
            <div>
              <h4 className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2 uppercase tracking-wide">
                Expenses
              </h4>
              <VarianceTable rows={expenseRows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VarianceTable({ rows }: { rows: BudgetVarianceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="border-b border-stroke-light dark:border-stroke-dark">
            <th className="text-left py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Item
            </th>
            <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Budgeted
            </th>
            <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Actual
            </th>
            <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Variance
            </th>
            <th className="text-right py-2 pl-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              % Used
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.category}-${row.name}`}
              className={`border-b border-stroke-light/50 dark:border-stroke-dark/50 ${row.over_threshold ? 'bg-warning-dot/5' : ''}`}
            >
              <td className="py-2.5 pr-4 text-text-primary-light dark:text-text-primary-dark">
                <div className="flex items-center gap-1.5">
                  {row.over_threshold ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning-dot flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-mint flex-shrink-0" />
                  )}
                  {row.name}
                </div>
              </td>
              <td className="py-2.5 px-4 text-right text-text-secondary-light dark:text-text-secondary-dark">
                {fmt(row.budgeted)}
              </td>
              <td className="py-2.5 px-4 text-right text-text-primary-light dark:text-text-primary-dark">
                {fmt(row.actual)}
              </td>
              <td className={`py-2.5 px-4 text-right ${row.variance >= 0 ? 'text-mint' : 'text-warning-dot'}`}>
                {fmt(row.variance)}
              </td>
              <td className={`py-2.5 pl-4 text-right font-medium ${row.variance_pct > 100 ? 'text-warning-dot' : row.variance_pct > 80 ? 'text-yellow-500' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                {row.variance_pct.toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
