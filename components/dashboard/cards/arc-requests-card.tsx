'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { ClipboardEdit, Plus } from 'lucide-react';
import type { ArcStatus } from '@/lib/types/database';

const STATUS_LABELS: Record<ArcStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  approved_with_conditions: 'Conditions',
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

interface ArcRow {
  id: string;
  title: string;
  status: ArcStatus;
  created_at: string;
}

export function ArcRequestsCard() {
  const { community, unit, isBoard } = useCommunity();
  const [requests, setRequests] = useState<ArcRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      let query = supabase
        .from('arc_requests')
        .select('id, title, status, created_at')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Residents see only their unit's requests
      if (!isBoard && unit) {
        query = query.eq('unit_id', unit.id);
      }

      const { data } = await query;
      setRequests((data as ArcRow[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id, unit, isBoard]);

  const arcHref = `/${community.slug}/arc-requests`;

  return (
    <DashboardCardShell title="ARC Requests">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <ClipboardEdit className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No ARC requests yet.</p>
          <Link
            href={arcHref}
            className="inline-flex items-center gap-1.5 text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Submit a request
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={arcHref}
                  className="flex items-center justify-between gap-2 group"
                >
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">
                    {r.title}
                  </span>
                  <Badge variant={STATUS_VARIANT[r.status]} className="text-meta shrink-0">
                    {STATUS_LABELS[r.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={arcHref}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all requests
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
