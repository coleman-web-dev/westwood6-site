'use client';

import { Badge } from '@/components/shared/ui/badge';
import { CalendarClock } from 'lucide-react';
import type { ViolationStatus, ViolationSeverity } from '@/lib/types/database';
import type { ViolationWithUnit } from '@/app/[slug]/(protected)/violations/page';

const STATUS_LABELS: Record<ViolationStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  notice_sent: 'Notice Sent',
  in_compliance: 'In Compliance',
  escalated: 'Escalated',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const STATUS_VARIANT: Record<ViolationStatus, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  reported: 'destructive',
  under_review: 'default',
  notice_sent: 'default',
  in_compliance: 'secondary',
  escalated: 'destructive',
  resolved: 'secondary',
  dismissed: 'outline',
};

const SEVERITY_COLORS: Record<ViolationSeverity, string> = {
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  minor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  major: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const CATEGORY_LABELS: Record<string, string> = {
  architectural: 'Architectural',
  noise: 'Noise',
  parking: 'Parking',
  maintenance: 'Maintenance',
  pets: 'Pets',
  trash: 'Trash',
  other: 'Other',
};

interface ViolationListProps {
  violations: ViolationWithUnit[];
  loading: boolean;
  onSelect: (v: ViolationWithUnit) => void;
}

export function ViolationList({ violations, loading, onSelect }: ViolationListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No violations found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {violations.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v)}
          className="w-full text-left rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding hover:border-secondary-400/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                  {v.title}
                </h3>
                <Badge variant={STATUS_VARIANT[v.status]} className="text-meta shrink-0">
                  {STATUS_LABELS[v.status]}
                </Badge>
                <span className={`text-meta px-2 py-0.5 rounded-pill ${SEVERITY_COLORS[v.severity]}`}>
                  {v.severity.charAt(0).toUpperCase() + v.severity.slice(1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {v.units?.unit_number && (
                  <p className="text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Unit {v.units.unit_number}
                  </p>
                )}
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {CATEGORY_LABELS[v.category] || v.category}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(v.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                {v.compliance_deadline && !['resolved', 'dismissed'].includes(v.status) && (() => {
                  const deadline = new Date(v.compliance_deadline + 'T00:00:00');
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isPastDue = daysLeft < 0;
                  const isApproaching = daysLeft >= 0 && daysLeft <= 3;
                  return (
                    <span className={`text-meta inline-flex items-center gap-1 ${
                      isPastDue ? 'text-red-600 dark:text-red-400 font-semibold' :
                      isApproaching ? 'text-amber-600 dark:text-amber-400' :
                      'text-text-muted-light dark:text-text-muted-dark'
                    }`}>
                      <CalendarClock className="h-3 w-3" />
                      {isPastDue ? 'Overdue' : `Due ${deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
