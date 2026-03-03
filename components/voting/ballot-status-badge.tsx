'use client';

import { Badge } from '@/components/shared/ui/badge';
import type { BallotStatus } from '@/lib/types/database';

const STATUS_CONFIG: Record<BallotStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-primary-100 text-primary-600 dark:bg-primary-800/40 dark:text-primary-300',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  open: {
    label: 'Open',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  },
  closed: {
    label: 'Closed',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  certified: {
    label: 'Certified',
    className: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
};

interface BallotStatusBadgeProps {
  status: BallotStatus;
  className?: string;
}

export function BallotStatusBadge({ status, className }: BallotStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${config.className} border-0 ${className ?? ''}`}>
      {config.label}
    </Badge>
  );
}
