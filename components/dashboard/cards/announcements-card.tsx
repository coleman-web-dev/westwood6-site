'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { CalendarDays, Megaphone } from 'lucide-react';
import type { Announcement, Event } from '@/lib/types/database';

type FeedItem =
  | { type: 'announcement'; data: Announcement; sortDate: string; pinned: false }
  | { type: 'event'; data: Event; sortDate: string; pinned: boolean };

export function AnnouncementsCard() {
  const { community } = useCommunity();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const [{ data: announcements }, { data: events }] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('community_id', community.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('events')
          .select('*')
          .eq('community_id', community.id)
          .eq('show_on_announcements', true)
          .gte('end_datetime', new Date().toISOString())
          .order('start_datetime', { ascending: true })
          .limit(3),
      ]);

      const feed: FeedItem[] = [];

      for (const a of (announcements as Announcement[]) ?? []) {
        feed.push({ type: 'announcement', data: a, sortDate: a.created_at, pinned: false });
      }

      for (const e of (events as Event[]) ?? []) {
        feed.push({ type: 'event', data: e, sortDate: e.created_at, pinned: e.is_pinned });
      }

      // Sort: pinned first, then by date descending
      feed.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.sortDate.localeCompare(a.sortDate);
      });

      setItems(feed.slice(0, 6));
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Announcements">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-5 rounded bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Megaphone className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {items.map((item) => {
              if (item.type === 'announcement') {
                const a = item.data;
                return (
                  <li key={`a-${a.id}`}>
                    <Link
                      href={`/${community.slug}/announcements`}
                      className="flex items-start gap-2 group"
                    >
                      {a.priority !== 'normal' && (
                        <Badge variant={a.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-meta mt-0.5 shrink-0">
                          {a.priority}
                        </Badge>
                      )}
                      <div className="min-w-0">
                        <p className="text-body font-medium truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">{a.title}</p>
                        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              }

              const e = item.data;
              return (
                <li key={`e-${e.id}`}>
                  <Link
                    href={`/${community.slug}/events`}
                    className="flex items-start gap-2 group"
                  >
                    <Badge variant="outline" className="text-meta mt-0.5 shrink-0 gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Event
                    </Badge>
                    {item.pinned && (
                      <Badge variant="secondary" className="text-meta mt-0.5 shrink-0">
                        Pinned
                      </Badge>
                    )}
                    <div className="min-w-0">
                      <p className="text-body font-medium truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">{e.title}</p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        {new Date(e.start_datetime).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/${community.slug}/announcements`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all announcements
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
