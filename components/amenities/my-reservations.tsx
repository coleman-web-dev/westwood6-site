'use client';

import { useEffect, useState } from 'react';
import { format, isFuture } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import type { Reservation, ReservationStatus } from '@/lib/types/database';

interface MyReservationsProps {
  amenityId?: string;
  refreshKey: number;
}

type ReservationWithAmenity = Reservation & { amenities: { name: string } };

const STATUS_BADGE: Record<ReservationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  approved: { variant: 'secondary', label: 'Approved' },
  denied: { variant: 'destructive', label: 'Denied' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

export function MyReservations({ amenityId, refreshKey }: MyReservationsProps) {
  const { community, unit, isBoard } = useCommunity();
  const [reservations, setReservations] = useState<ReservationWithAmenity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unit && !isBoard) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetch() {
      let query = supabase
        .from('reservations')
        .select('*, amenities(name)')
        .order('start_datetime', { ascending: false })
        .limit(20);

      if (isBoard) {
        query = query.eq('community_id', community.id);
      } else if (unit) {
        query = query.eq('unit_id', unit.id);
      }

      if (amenityId) {
        query = query.eq('amenity_id', amenityId);
      }

      const { data } = await query;
      setReservations((data as ReservationWithAmenity[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id, unit, isBoard, amenityId, refreshKey]);

  async function handleCancel(reservationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' as ReservationStatus })
      .eq('id', reservationId);

    if (error) {
      toast.error('Failed to cancel reservation.');
      return;
    }

    toast.success('Reservation cancelled.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'cancelled' as ReservationStatus } : r
      )
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-14 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No reservations yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((r) => {
        const isFullDay =
          new Date(r.end_datetime).getTime() - new Date(r.start_datetime).getTime() >= 23 * 60 * 60 * 1000;
        const canCancel =
          (r.status === 'pending' || r.status === 'approved') &&
          isFuture(new Date(r.start_datetime));
        const badge = STATUS_BADGE[r.status];

        return (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 py-dense-row-y px-dense-row-x rounded-inner-card bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!amenityId && r.amenities && (
                  <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate">
                    {r.amenities.name}
                  </span>
                )}
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                {isFullDay
                  ? format(new Date(r.start_datetime), 'MMM d, yyyy')
                  : `${format(new Date(r.start_datetime), 'MMM d, h:mm a')} - ${format(new Date(r.end_datetime), 'h:mm a')}`}
                {r.fee_amount > 0 && (
                  <span className="ml-2 tabular-nums">
                    ${(r.fee_amount / 100).toFixed(2)}
                  </span>
                )}
              </p>
            </div>

            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancel(r.id)}
                className="shrink-0"
              >
                Cancel
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
