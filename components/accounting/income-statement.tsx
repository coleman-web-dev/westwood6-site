'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import type { IncomeStatementReport } from '@/lib/types/accounting';

interface IncomeStatementProps {
  communityId: string;
}

export function IncomeStatement({ communityId }: IncomeStatementProps) {
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Default to current year
  const year = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${year}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        community_id: communityId,
        report: 'income-statement',
        start_date: startDate,
        end_date: endDate,
      });

      const res = await fetch(`/api/accounting/reports?${params}`);
      if (res.ok) {
        setReport(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReport();
  }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-32 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-meta text-text-muted-light dark:text-text-muted-dark">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-meta text-text-muted-light dark:text-text-muted-dark">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <Button size="sm" variant="outline" onClick={fetchReport}>
          Generate
        </Button>
      </div>

      {report && (
        <>
          {/* Revenue */}
          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">Revenue</h3>
            </div>
            <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
              {report.revenue.accounts.filter((r) => r.balance !== 0).map((row) => (
                <div key={row.account_id} className="flex items-center justify-between px-card-padding py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-10">{row.code}</span>
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark">{row.name}</span>
                  </div>
                  <span className="text-body tabular-nums text-green-600 dark:text-green-400">
                    ${(row.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 font-medium">
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">Total Revenue</span>
                <span className="text-body tabular-nums text-green-600 dark:text-green-400">
                  ${(report.revenue.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">Expenses</h3>
            </div>
            <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
              {report.expenses.accounts.filter((r) => r.balance !== 0).map((row) => (
                <div key={row.account_id} className="flex items-center justify-between px-card-padding py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-10">{row.code}</span>
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark">{row.name}</span>
                  </div>
                  <span className="text-body tabular-nums text-red-600 dark:text-red-400">
                    ${(row.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 font-medium">
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">Total Expenses</span>
                <span className="text-body tabular-nums text-red-600 dark:text-red-400">
                  ${(report.expenses.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className={`rounded-inner-card px-4 py-3 font-medium ${
            report.net_income >= 0
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className="flex justify-between text-body">
              <span>Net Income</span>
              <span className="tabular-nums">
                {report.net_income < 0 ? '-' : ''}${(Math.abs(report.net_income) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
