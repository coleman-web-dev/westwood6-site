'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import type { TrialBalanceRow } from '@/lib/types/accounting';

interface TrialBalanceProps {
  communityId: string;
}

export function TrialBalance({ communityId }: TrialBalanceProps) {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  async function fetchReport(date?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        community_id: communityId,
        report: 'trial-balance',
      });
      if (date) params.set('as_of_date', date);

      const res = await fetch(`/api/accounting/reports?${params}`);
      if (res.ok) {
        setRows(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReport(asOfDate);
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDebits = rows.reduce((sum, r) => sum + r.debit_total, 0);
  const totalCredits = rows.reduce((sum, r) => sum + r.credit_total, 0);
  const isBalanced = totalDebits === totalCredits;
  const activeRows = rows.filter((r) => r.debit_total > 0 || r.credit_total > 0);

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-32 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <label className="text-meta text-text-muted-light dark:text-text-muted-dark">As of Date</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => fetchReport(asOfDate)}>
          Generate
        </Button>
      </div>

      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
              <th className="text-left px-card-padding py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">Code</th>
              <th className="text-left px-3 py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">Account</th>
              <th className="text-right px-card-padding py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium w-28">Debit</th>
              <th className="text-right px-card-padding py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium w-28">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-card-padding py-4 text-body text-text-muted-light dark:text-text-muted-dark text-center">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              activeRows.map((row) => (
                <tr key={row.account_id}>
                  <td className="px-card-padding py-2 text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark">
                    {row.code}
                  </td>
                  <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                    {row.name}
                  </td>
                  <td className="px-card-padding py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                    {row.debit_total > 0 ? `$${(row.debit_total / 100).toFixed(2)}` : ''}
                  </td>
                  <td className="px-card-padding py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                    {row.credit_total > 0 ? `$${(row.credit_total / 100).toFixed(2)}` : ''}
                  </td>
                </tr>
              ))
            )}
            {activeRows.length > 0 && (
              <tr className="bg-surface-light-2 dark:bg-surface-dark-2 font-medium">
                <td className="px-card-padding py-2" />
                <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                  Total
                </td>
                <td className="px-card-padding py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                  ${(totalDebits / 100).toFixed(2)}
                </td>
                <td className="px-card-padding py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                  ${(totalCredits / 100).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeRows.length > 0 && (
        <div className={`rounded-inner-card px-4 py-2 text-body font-medium ${
          isBalanced
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {isBalanced ? 'Trial balance is balanced.' : `Trial balance is off by $${(Math.abs(totalDebits - totalCredits) / 100).toFixed(2)}.`}
        </div>
      )}
    </div>
  );
}
