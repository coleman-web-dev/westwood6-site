'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Calendar } from 'lucide-react';
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
        .order('start_datetime', { ascending: true })
        .limit(5);

      setEvents((data as Event[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Upcoming Events" icon={<Calendar className="h-4 w-4 text-secondary-500" />}>
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
              <p className="text-body font-medium">{e.title}</p>
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
