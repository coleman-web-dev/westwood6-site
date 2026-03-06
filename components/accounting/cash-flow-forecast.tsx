'use client';

import { useState, useEffect } from 'react';
import type { CashFlowRow } from '@/lib/types/accounting';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  communityId: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function CashFlowForecast({ communityId }: Props) {
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/accounting/reports?report=cash-flow&community_id=${communityId}`);
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
  }, [communityId]);

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-48 rounded bg-muted" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-2">
          Cash Flow Forecast
        </h3>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Not enough historical data to generate a forecast. Post journal entries for at least one month.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Cash Flow Forecast (6 months)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-stroke-light dark:border-stroke-dark">
              <th className="text-left py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                Month
              </th>
              <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                Income
              </th>
              <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                Expenses
              </th>
              <th className="text-right py-2 px-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                Net
              </th>
              <th className="text-right py-2 pl-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month}
                className="border-b border-stroke-light/50 dark:border-stroke-dark/50"
              >
                <td className="py-2.5 pr-4 text-text-primary-light dark:text-text-primary-dark font-medium">
                  {row.label}
                </td>
                <td className="py-2.5 px-4 text-right text-mint">
                  {fmt(row.projected_income)}
                </td>
                <td className="py-2.5 px-4 text-right text-warning-dot">
                  {fmt(row.projected_expenses)}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className={`inline-flex items-center gap-1 ${row.net_cash_flow >= 0 ? 'text-mint' : 'text-warning-dot'}`}>
                    {row.net_cash_flow >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {fmt(row.net_cash_flow)}
                  </span>
                </td>
                <td className={`py-2.5 pl-4 text-right font-medium ${row.running_balance >= 0 ? 'text-text-primary-light dark:text-text-primary-dark' : 'text-warning-dot'}`}>
                  {fmt(row.running_balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-meta text-text-muted-light dark:text-text-muted-dark">
        Based on 3-month average activity and pending invoices.
      </p>
    </div>
  );
}
