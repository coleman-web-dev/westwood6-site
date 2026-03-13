'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/shared/ui/dialog';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Users, DollarSign, UserCheck, Loader2 } from 'lucide-react';
import type { Event, EventRsvp } from '@/lib/types/database';

type RsvpWithMember = EventRsvp & {
  members: { first_name: string; last_name: string } | null;
  units: { unit_number: string } | null;
};

interface RsvpListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

export function RsvpListDialog({ open, onOpenChange, event }: RsvpListDialogProps) {
  const { community } = useCommunity();
  const [rsvps, setRsvps] = useState<RsvpWithMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    async function fetchRsvps() {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from('event_rsvps')
        .select('*, members(first_name, last_name), units(unit_number)')
        .eq('event_id', event.id)
        .eq('community_id', community.id)
        .order('created_at', { ascending: true });

      setRsvps((data as RsvpWithMember[]) ?? []);
      setLoading(false);
    }

    fetchRsvps();
  }, [open, event.id, community.id]);

  const confirmed = rsvps.filter((r) => r.status === 'confirmed');
  const cancelled = rsvps.filter((r) => r.status === 'cancelled');
  const pending = rsvps.filter((r) => r.status === 'pending_payment');
  const totalGuests = confirmed.reduce((sum, r) => sum + r.guest_count, 0);
  const totalRevenue = confirmed.reduce((sum, r) => sum + r.total_fee, 0);

  function statusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return <Badge variant="secondary" className="text-[10px]">Confirmed</Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 dark:text-amber-400">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-[10px] text-text-muted-light dark:text-text-muted-dark">Cancelled</Badge>;
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>RSVPs</DialogTitle>
          <DialogDescription>
            {event.title}
          </DialogDescription>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
              <UserCheck className="h-3.5 w-3.5" />
              RSVPs
            </div>
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {confirmed.length}
            </p>
          </div>
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
              <Users className="h-3.5 w-3.5" />
              Guests
            </div>
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {totalGuests}
              {event.rsvp_max_capacity && (
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark font-normal">
                  {' '}/ {event.rsvp_max_capacity}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Revenue
            </div>
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              ${(totalRevenue / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* RSVP list */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : rsvps.length === 0 ? (
            <p className="text-center text-body text-text-muted-light dark:text-text-muted-dark py-8">
              No RSVPs yet.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Pending */}
              {pending.length > 0 && (
                <>
                  <p className="text-label text-amber-600 dark:text-amber-400 font-semibold pt-1">
                    Pending Payment ({pending.length})
                  </p>
                  {pending.map((r) => (
                    <RsvpRow key={r.id} rsvp={r} statusBadge={statusBadge} />
                  ))}
                </>
              )}

              {/* Confirmed */}
              {confirmed.length > 0 && (
                <>
                  <p className="text-label text-text-secondary-light dark:text-text-secondary-dark font-semibold pt-1">
                    Confirmed ({confirmed.length})
                  </p>
                  {confirmed.map((r) => (
                    <RsvpRow key={r.id} rsvp={r} statusBadge={statusBadge} />
                  ))}
                </>
              )}

              {/* Cancelled */}
              {cancelled.length > 0 && (
                <>
                  <p className="text-label text-text-muted-light dark:text-text-muted-dark font-semibold pt-1">
                    Cancelled ({cancelled.length})
                  </p>
                  {cancelled.map((r) => (
                    <RsvpRow key={r.id} rsvp={r} statusBadge={statusBadge} muted />
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RsvpRow({
  rsvp,
  statusBadge,
  muted,
}: {
  rsvp: RsvpWithMember;
  statusBadge: (status: string) => React.ReactNode;
  muted?: boolean;
}) {
  const name = rsvp.members
    ? `${rsvp.members.first_name} ${rsvp.members.last_name}`
    : 'Unknown member';

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark p-2.5 ${
        muted ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
            {name}
          </span>
          {statusBadge(rsvp.status)}
        </div>
        <div className="flex items-center gap-3 text-meta text-text-muted-light dark:text-text-muted-dark">
          {rsvp.units && <span>Unit {rsvp.units.unit_number}</span>}
          <span>{rsvp.guest_count} guest{rsvp.guest_count > 1 ? 's' : ''}</span>
          {rsvp.total_fee > 0 && <span>${(rsvp.total_fee / 100).toFixed(2)}</span>}
          {rsvp.refunded_at && (
            <Badge variant="outline" className="text-[10px]">Refunded</Badge>
          )}
        </div>
      </div>
      <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
        {format(new Date(rsvp.created_at), 'MMM d')}
      </span>
    </div>
  );
}
