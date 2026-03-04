'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/shared/ui/button';
import type { BalanceSheetReport, BalanceSheetSection } from '@/lib/types/accounting';

interface BalanceSheetProps {
  communityId: string;
}

function Section({ section }: { section: BalanceSheetSection }) {
  const activeRows = section.accounts.filter((r) => r.balance !== 0);

  return (
    <div>
      <div className="px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          {section.label}
        </h3>
      </div>
      <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
        {activeRows.length === 0 ? (
          <div className="px-card-padding py-3">
            <span className="text-body text-text-muted-light dark:text-text-muted-dark">None</span>
          </div>
        ) : (
          activeRows.map((row) => (
            <div key={row.account_id} className="flex items-center justify-between px-card-padding py-2">
              <div className="flex items-center gap-2">
                <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-10">
                  {row.code}
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {row.name}
                </span>
              </div>
              <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
                ${(row.balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))
        )}
        <div className="flex items-center justify-between px-card-padding py-2 bg-surface-light-2 dark:bg-surface-dark-2 font-medium">
          <span className="text-body text-text-primary-light dark:text-text-primary-dark">
            Total {section.label}
          </span>
          <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
            ${(section.total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BalanceSheet({ communityId }: BalanceSheetProps) {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  async function fetchReport(date?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        community_id: communityId,
        report: 'balance-sheet',
      });
      if (date) params.set('as_of_date', date);

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
    fetchReport(asOfDate);
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

      {report && (
        <>
          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            <Section section={report.assets} />
          </div>

          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            <Section section={report.liabilities} />
          </div>

          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
            <Section section={report.equity} />
          </div>

          {/* Balance check */}
          <div className={`rounded-inner-card px-4 py-3 font-medium ${
            report.is_balanced
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className="flex justify-between text-body">
              <span>Total Assets</span>
              <span className="tabular-nums">
                ${(report.total_assets / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-body mt-1">
              <span>Total Liabilities + Equity</span>
              <span className="tabular-nums">
                ${(report.total_liabilities_equity / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2 text-meta">
              {report.is_balanced ? 'Balance sheet is balanced.' : 'Balance sheet is out of balance.'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
