'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Wrench } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import type { MaintenanceRequest } from '@/lib/types/database';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  in_progress: 'default',
  resolved: 'secondary',
  closed: 'outline',
};

export function MaintenanceCard() {
  const { unit } = useCommunity();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unit) { setLoading(false); return; }

    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('unit_id', unit!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRequests((data as MaintenanceRequest[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [unit]);

  return (
    <DashboardCardShell title="Maintenance Requests" icon={<Wrench className="h-4 w-4 text-secondary-500" />}>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-body font-medium truncate">{r.title}</p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'} className="text-meta shrink-0">
                {r.status.replace('_', ' ')}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
