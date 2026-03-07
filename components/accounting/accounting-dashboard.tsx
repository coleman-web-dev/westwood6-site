'use client';

import { useState, useEffect } from 'react';
import { FundSummaryCards } from '@/components/accounting/fund-summary';
import { CashFlowAreaChart } from '@/components/accounting/charts/cash-flow-area-chart';
import { ExpenseBreakdownChart } from '@/components/accounting/charts/expense-breakdown-chart';
import { InterFundTransferDialog } from '@/components/accounting/inter-fund-transfer-dialog';
import { ExportDialog } from '@/components/accounting/export-dialog';
import type { MonthlyFlowPoint, CategoryBreakdown } from '@/lib/types/accounting';

interface AccountingDashboardProps {
  communityId: string;
  refreshKey: number;
  onRefresh: () => void;
}

interface DashboardData {
  monthly_flow: MonthlyFlowPoint[];
  expense_breakdown: CategoryBreakdown[];
}

export function AccountingDashboard({
  communityId,
  refreshKey,
  onRefresh,
}: AccountingDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/accounting/dashboard?community_id=${communityId}`,
        );
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [communityId, refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <InterFundTransferDialog communityId={communityId} onComplete={onRefresh} />
        <ExportDialog communityId={communityId} />
      </div>

      <FundSummaryCards key={`fund-${refreshKey}`} communityId={communityId} />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gap">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
            >
              <div className="animate-pulse h-48 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gap">
            <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
                Cash Flow (12 Months)
              </h3>
              <CashFlowAreaChart data={data.monthly_flow} />
            </div>

            <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
                Top Expense Categories
              </h3>
              <ExpenseBreakdownChart data={data.expense_breakdown} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
