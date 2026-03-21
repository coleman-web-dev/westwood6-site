'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { ClipboardCheck, CalendarCheck, CheckCircle2, UserPlus } from 'lucide-react';

interface TaskCounts {
  pendingReservations: number;
  pendingInspections: number;
  pendingSignups: number;
}

export function BoardTasksCard() {
  const { community, isBoard } = useCommunity();
  const basePath = `/${community.slug}`;
  const [counts, setCounts] = useState<TaskCounts>({ pendingReservations: 0, pendingInspections: 0, pendingSignups: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isBoard) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetch() {
      // Count pending reservations
      const { count: pendingReservations } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .eq('status', 'pending');

      // Count pending post-event inspections (signed agreements where post_event_completed is false and event has passed)
      const { count: pendingInspections } = await supabase
        .from('signed_agreements')
        .select('id, reservations!inner(community_id, end_datetime)', { count: 'exact', head: true })
        .eq('reservations.community_id', community.id)
        .eq('post_event_completed', false)
        .lt('reservations.end_datetime', new Date().toISOString());

      // Count pending signup requests
      const { count: pendingSignups } = await supabase
        .from('signup_requests')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', community.id)
        .eq('status', 'pending');

      setCounts({
        pendingReservations: pendingReservations ?? 0,
        pendingInspections: pendingInspections ?? 0,
        pendingSignups: pendingSignups ?? 0,
      });
      setLoading(false);
    }

    fetch();
  }, [community.id, isBoard]);

  // Don't render at all for non-board members
  if (!isBoard) return null;

  const totalTasks = counts.pendingReservations + counts.pendingInspections + counts.pendingSignups;

  return (
    <DashboardCardShell title="Board Tasks">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-10 rounded-inner-card bg-muted" />
          ))}
        </div>
      ) : totalTasks === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-mint mb-2" />
          <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
            All caught up!
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
            No pending tasks right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {counts.pendingReservations > 0 && (
            <li>
              <Link
                href={`${basePath}/amenities`}
                className="flex items-center gap-3 rounded-inner-card px-3 py-2.5 bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark hover:border-secondary-400/50 transition-colors group"
              >
                <CalendarCheck className="h-4 w-4 text-secondary-400 shrink-0" />
                <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 group-hover:text-secondary-500 transition-colors">
                  {counts.pendingReservations} reservation{counts.pendingReservations !== 1 ? 's' : ''} awaiting approval
                </span>
                <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400 shrink-0">
                  {counts.pendingReservations}
                </Badge>
              </Link>
            </li>
          )}
          {counts.pendingInspections > 0 && (
            <li>
              <Link
                href={`${basePath}/amenities`}
                className="flex items-center gap-3 rounded-inner-card px-3 py-2.5 bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark hover:border-secondary-400/50 transition-colors group"
              >
                <ClipboardCheck className="h-4 w-4 text-secondary-400 shrink-0" />
                <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 group-hover:text-secondary-500 transition-colors">
                  {counts.pendingInspections} post-event inspection{counts.pendingInspections !== 1 ? 's' : ''} pending
                </span>
                <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400 shrink-0">
                  {counts.pendingInspections}
                </Badge>
              </Link>
            </li>
          )}
          {counts.pendingSignups > 0 && (
            <li>
              <Link
                href={`${basePath}/settings?tab=requests`}
                className="flex items-center gap-3 rounded-inner-card px-3 py-2.5 bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark hover:border-secondary-400/50 transition-colors group"
              >
                <UserPlus className="h-4 w-4 text-secondary-400 shrink-0" />
                <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 group-hover:text-secondary-500 transition-colors">
                  {counts.pendingSignups} access request{counts.pendingSignups !== 1 ? 's' : ''} awaiting review
                </span>
                <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400 shrink-0">
                  {counts.pendingSignups}
                </Badge>
              </Link>
            </li>
          )}
        </ul>
      )}
    </DashboardCardShell>
  );
}
