'use client';

import type { Assessment, Invoice } from '@/lib/types/database';

interface AssessmentPerformanceProps {
  assessments: Assessment[];
  invoices: Invoice[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  waived: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
};

export function AssessmentPerformance({ assessments, invoices }: AssessmentPerformanceProps) {
  const activeAssessments = assessments.filter((a) => a.is_active);

  if (activeAssessments.length === 0) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
          Assessment Performance
        </h3>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          No active assessments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-grid-gap">
      {activeAssessments.map((assessment) => {
        const assessmentInvoices = invoices.filter(
          (inv) => inv.assessment_id === assessment.id && inv.status !== 'voided'
        );
        const billed = assessmentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const collected = assessmentInvoices
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount, 0)
          + assessmentInvoices
            .filter((inv) => inv.status === 'partial')
            .reduce((sum, inv) => sum + inv.amount_paid, 0);
        const rate = billed > 0 ? (collected / billed) * 100 : 0;

        const statusCounts: Record<string, number> = {};
        for (const inv of assessmentInvoices) {
          statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
        }

        let barColor = 'bg-red-400 dark:bg-red-500';
        if (rate >= 90) barColor = 'bg-green-500 dark:bg-green-400';
        else if (rate >= 70) barColor = 'bg-amber-400 dark:bg-amber-500';

        return (
          <div
            key={assessment.id}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                {assessment.title}
              </h3>
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {new Date(assessment.fiscal_year_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' - '}
                {new Date(assessment.fiscal_year_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center justify-between text-meta text-text-secondary-light dark:text-text-secondary-dark mb-1.5">
              <span>
                ${formatDollars(collected)} of ${formatDollars(billed)} collected
              </span>
              <span className="font-medium tabular-nums">{rate.toFixed(1)}%</span>
            </div>

            <div className="relative h-2 rounded-full bg-primary-100 dark:bg-primary-800/40 overflow-hidden mb-3">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-pill px-2 py-0.5 text-meta font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  {count} {status}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
