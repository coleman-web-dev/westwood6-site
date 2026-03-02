'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Megaphone } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import type { Announcement } from '@/lib/types/database';

export function AnnouncementsCard() {
  const { community } = useCommunity();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setAnnouncements((data as Announcement[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Announcements" icon={<Megaphone className="h-4 w-4 text-secondary-500" />}>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-5 rounded bg-muted" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              {a.priority !== 'normal' && (
                <Badge variant={a.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-meta mt-0.5 shrink-0">
                  {a.priority}
                </Badge>
              )}
              <div className="min-w-0">
                <p className="text-body font-medium truncate">{a.title}</p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
