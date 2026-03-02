'use client';

import { Badge } from '@/components/shared/ui/badge';
import type { MaintenanceRequest, RequestStatus } from '@/lib/types/database';

const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_VARIANTS: Record<
  RequestStatus,
  'destructive' | 'default' | 'secondary' | 'outline'
> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'outline',
};

interface RequestListProps {
  requests: MaintenanceRequest[];
  loading: boolean;
  emptyMessage?: string;
  onSelect: (request: MaintenanceRequest) => void;
}

export function RequestList({
  requests,
  loading,
  emptyMessage = 'No maintenance requests.',
  onSelect,
}: RequestListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/4 rounded bg-muted" />
            <div className="animate-pulse h-4 w-full rounded bg-muted" />
            <div className="animate-pulse h-4 w-5/6 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <button
          key={request.id}
          type="button"
          className="w-full text-left rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding transition-colors hover:bg-muted/50"
          onClick={() => onSelect(request)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {request.title}
            </h3>
            <Badge
              variant={STATUS_VARIANTS[request.status]}
              className="text-meta shrink-0"
            >
              {STATUS_LABELS[request.status]}
            </Badge>
          </div>

          <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-2 line-clamp-2">
            {request.description}
          </p>

          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
            {new Date(request.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </button>
      ))}
    </div>
  );
}
