'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { getAmenityIcon } from '@/lib/amenity-icons';
import type { Amenity } from '@/lib/types/database';

interface AmenitySelectorProps {
  selectedId: string | null;
  onSelect: (amenity: Amenity) => void;
}

export function AmenitySelector({ selectedId, onSelect }: AmenitySelectorProps) {
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

      const list = (data as Amenity[]) ?? [];
      setAmenities(list);
      setLoading(false);

      if (list.length > 0 && !selectedId) {
        onSelect(list[0]);
      }
    }

    fetch();
  }, [community.id, selectedId, onSelect]);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-9 w-24 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  if (amenities.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No amenities available.
      </p>
    );
  }

  return (
    <>
      {/* Desktop: pill tabs */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {amenities.map((amenity) => {
          const Icon = getAmenityIcon(amenity.icon);
          return (
            <button
              key={amenity.id}
              onClick={() => onSelect(amenity)}
              className={`
                px-4 h-9 rounded-pill text-label transition-colors flex items-center gap-1.5
                ${
                  selectedId === amenity.id
                    ? 'bg-secondary-400/15 text-secondary-500 dark:text-secondary-400'
                    : 'bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark text-text-secondary-light dark:text-text-secondary-dark hover:border-secondary-400/50'
                }
              `}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {amenity.name}
            </button>
          );
        })}
      </div>

      {/* Mobile: select dropdown */}
      <div className="sm:hidden">
        <Select
          value={selectedId ?? undefined}
          onValueChange={(id) => {
            const amenity = amenities.find((a) => a.id === id);
            if (amenity) onSelect(amenity);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an amenity" />
          </SelectTrigger>
          <SelectContent>
            {amenities.map((amenity) => {
              const Icon = getAmenityIcon(amenity.icon);
              return (
                <SelectItem key={amenity.id} value={amenity.id}>
                  <span className="flex items-center gap-1.5">
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {amenity.name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
