'use client';

import { Badge } from '@/components/shared/ui/badge';
import type { ArcRequest, ArcStatus, ArcProjectType } from '@/lib/types/database';

const STATUS_LABELS: Record<ArcStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  approved_with_conditions: 'Approved (Conditions)',
  denied: 'Denied',
};

const STATUS_VARIANT: Record<ArcStatus, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  submitted: 'default',
  under_review: 'default',
  approved: 'secondary',
  approved_with_conditions: 'secondary',
  denied: 'destructive',
};

const PROJECT_LABELS: Record<ArcProjectType, string> = {
  fence: 'Fence',
  landscaping: 'Landscaping',
  paint: 'Paint',
  addition: 'Addition',
  deck: 'Deck/Patio',
  roof: 'Roof',
  solar: 'Solar',
  other: 'Other',
};

interface ArcRequestListProps {
  requests: ArcRequest[];
  loading: boolean;
  onSelect: (r: ArcRequest) => void;
}

export function ArcRequestList({ requests, loading, onSelect }: ArcRequestListProps) {
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

  if (requests.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No ARC requests found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="w-full text-left rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding hover:border-secondary-400/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                  {r.title}
                </h3>
                <Badge variant={STATUS_VARIANT[r.status]} className="text-meta shrink-0">
                  {STATUS_LABELS[r.status]}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {PROJECT_LABELS[r.project_type] || r.project_type}
                </p>
                {r.estimated_cost !== null && r.estimated_cost > 0 && (
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Est. ${(r.estimated_cost / 100).toLocaleString()}
                  </p>
                )}
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
