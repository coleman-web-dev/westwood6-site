'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Building2 } from 'lucide-react';
import type { Amenity } from '@/lib/types/database';

export function AmenitiesCard() {
  const { community } = useCommunity();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('amenities')
        .select('*')
        .eq('community_id', community.id)
        .eq('active', true)
        .order('name', { ascending: true });

      setAmenities((data as Amenity[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Amenities" icon={<Building2 className="h-4 w-4 text-secondary-500" />}>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : amenities.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No amenities available.</p>
      ) : (
        <ul className="space-y-2">
          {amenities.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span className="text-body">{a.name}</span>
              {a.fee > 0 && (
                <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark tabular-nums">
                  ${(a.fee / 100).toFixed(2)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
