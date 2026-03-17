'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { Pin, CalendarDays } from 'lucide-react';
import type { Event } from '@/lib/types/database';

export function EventsCard() {
  const { community } = useCommunity();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('community_id', community.id)
        .gte('end_datetime', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('start_datetime', { ascending: true })
        .limit(5);

      setEvents((data as Event[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Upcoming Events">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CalendarDays className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/${community.slug}/events`}
                  className="block group"
                >
                  <div className="flex items-center gap-1.5">
                    {e.is_pinned && (
                      <Pin className="h-3 w-3 text-secondary-500 shrink-0" />
                    )}
                    <p className="text-body font-medium truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">{e.title}</p>
                  </div>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {new Date(e.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/${community.slug}/events`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all events
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
