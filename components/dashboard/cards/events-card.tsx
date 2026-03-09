'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { Pin } from 'lucide-react';
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
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No upcoming events.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <div className="flex items-center gap-1.5">
                {e.is_pinned && (
                  <Pin className="h-3 w-3 text-secondary-500 shrink-0" />
                )}
                <p className="text-body font-medium truncate">{e.title}</p>
              </div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {new Date(e.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {e.location ? ` · ${e.location}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
