'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Pin,
  Megaphone,
  Users,
  UserCheck,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { RsvpDialog } from '@/components/events/rsvp-dialog';
import { RsvpListDialog } from '@/components/events/rsvp-list-dialog';
import { toast } from 'sonner';
import type { Event, EventRsvp } from '@/lib/types/database';

/** RSVP summary for a single event */
export interface EventRsvpSummary {
  rsvpCount: number;
  totalGuests: number;
  myRsvp: EventRsvp | null;
}

interface EventListProps {
  events: Event[];
  loading: boolean;
  rsvpMap: Record<string, EventRsvpSummary>;
  onEdit: (event: Event) => void;
  onDeleted: () => void;
  onRsvpChanged: () => void;
}

export function EventList({ events, loading, rsvpMap, onEdit, onDeleted, onRsvpChanged }: EventListProps) {
  const { isBoard, community, member } = useCommunity();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const [viewRsvpsEvent, setViewRsvpsEvent] = useState<Event | null>(null);

  const now = new Date().toISOString();

  const upcoming = events
    .filter((e) => e.end_datetime >= now)
    .sort((a, b) => {
      // Pinned first, then by start date ascending
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return a.start_datetime.localeCompare(b.start_datetime);
    });

  const past = events
    .filter((e) => e.end_datetime < now)
    .sort((a, b) => b.start_datetime.localeCompare(a.start_datetime));

  async function handleDelete(event: Event) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(event.id);
    const supabase = createClient();

    const { error } = await supabase.from('events').delete().eq('id', event.id);

    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete event. Please try again.');
      return;
    }

    toast.success('Event deleted.');
    onDeleted();
  }

  async function handleCancelRsvp(event: Event) {
    if (!member) return;
    const confirm = window.confirm(
      'Are you sure you want to cancel your RSVP?'
    );
    if (!confirm) return;

    setCancellingId(event.id);

    try {
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel RSVP.');
      } else {
        toast.success(data.message || 'RSVP cancelled.');
        onRsvpChanged();
      }
    } catch {
      toast.error('Something went wrong.');
    }

    setCancellingId(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <p className="text-body text-text-muted-light dark:text-text-muted-dark py-4">
              No upcoming events.
            </p>
          ) : (
            <div className="space-y-4">
              {upcoming.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isBoard={isBoard}
                  isDeleting={deletingId === event.id}
                  isCancelling={cancellingId === event.id}
                  rsvpSummary={rsvpMap[event.id]}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onRsvp={() => setRsvpEvent(event)}
                  onCancelRsvp={() => handleCancelRsvp(event)}
                  onViewRsvps={() => setViewRsvpsEvent(event)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {past.length === 0 ? (
            <p className="text-body text-text-muted-light dark:text-text-muted-dark py-4">
              No past events.
            </p>
          ) : (
            <div className="space-y-4">
              {past.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isBoard={isBoard}
                  isDeleting={deletingId === event.id}
                  isCancelling={cancellingId === event.id}
                  rsvpSummary={rsvpMap[event.id]}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onRsvp={() => setRsvpEvent(event)}
                  onCancelRsvp={() => handleCancelRsvp(event)}
                  onViewRsvps={() => setViewRsvpsEvent(event)}
                  isPast
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* RSVP Dialog */}
      {rsvpEvent && (
        <RsvpDialog
          open={rsvpEvent !== null}
          onOpenChange={(open) => { if (!open) setRsvpEvent(null); }}
          event={rsvpEvent}
          spotsRemaining={
            rsvpEvent.rsvp_max_capacity
              ? rsvpEvent.rsvp_max_capacity - (rsvpMap[rsvpEvent.id]?.totalGuests ?? 0)
              : null
          }
          onSuccess={() => {
            setRsvpEvent(null);
            onRsvpChanged();
          }}
        />
      )}

      {/* RSVP List Dialog (board) */}
      {viewRsvpsEvent && (
        <RsvpListDialog
          open={viewRsvpsEvent !== null}
          onOpenChange={(open) => { if (!open) setViewRsvpsEvent(null); }}
          event={viewRsvpsEvent}
        />
      )}
    </>
  );
}

function EventCard({
  event,
  isBoard,
  isDeleting,
  isCancelling,
  rsvpSummary,
  onEdit,
  onDelete,
  onRsvp,
  onCancelRsvp,
  onViewRsvps,
  isPast,
}: {
  event: Event;
  isBoard: boolean;
  isDeleting: boolean;
  isCancelling: boolean;
  rsvpSummary?: EventRsvpSummary;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onRsvp: () => void;
  onCancelRsvp: () => void;
  onViewRsvps: () => void;
  isPast?: boolean;
}) {
  const startDate = new Date(event.start_datetime);
  const endDate = new Date(event.end_datetime);
  const myRsvp = rsvpSummary?.myRsvp;
  const isUpcoming = !isPast;

  // RSVP button state for members
  const showRsvpSection = event.rsvp_enabled && isUpcoming;
  const hasConfirmedRsvp = myRsvp?.status === 'confirmed';
  const hasPendingRsvp = myRsvp?.status === 'pending_payment';
  const isFull =
    event.rsvp_max_capacity !== null &&
    (rsvpSummary?.totalGuests ?? 0) >= event.rsvp_max_capacity;
  const eventStarted = new Date(event.start_datetime) <= new Date();

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {event.is_pinned && (
              <Pin className="h-3.5 w-3.5 text-secondary-500 shrink-0" />
            )}
            <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {event.title}
            </h3>
            <Badge
              variant={event.visibility === 'public' ? 'secondary' : 'outline'}
              className="text-meta shrink-0"
            >
              {event.visibility === 'public' ? 'Public' : 'Private'}
            </Badge>
            {event.show_on_announcements && (
              <Badge variant="outline" className="text-meta shrink-0 gap-1">
                <Megaphone className="h-3 w-3" />
                Announcements
              </Badge>
            )}
            {event.rsvp_enabled && (
              <Badge variant="outline" className="text-meta shrink-0 gap-1">
                <UserCheck className="h-3 w-3" />
                RSVP
                {event.rsvp_fee > 0 && ` · $${(event.rsvp_fee / 100).toFixed(2)}${event.rsvp_fee_type === 'per_person' ? '/person' : ''}`}
              </Badge>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark whitespace-pre-line">
              {event.description}
            </p>
          )}

          {/* Date and time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-text-muted-light dark:text-text-muted-dark">
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(startDate, 'MMM d, yyyy')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(startDate, 'h:mm a')} to {format(endDate, 'h:mm a')}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <p className="inline-flex items-center gap-1.5 text-meta text-text-muted-light dark:text-text-muted-dark">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {event.location}
            </p>
          )}

          {/* RSVP section */}
          {event.rsvp_enabled && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {/* Board: RSVP count summary + view button */}
              {isBoard && rsvpSummary && (
                <>
                  <Badge variant="outline" className="text-meta gap-1">
                    <Users className="h-3 w-3" />
                    {rsvpSummary.rsvpCount} RSVP{rsvpSummary.rsvpCount !== 1 ? 's' : ''}
                    {' '}({rsvpSummary.totalGuests} guest{rsvpSummary.totalGuests !== 1 ? 's' : ''})
                    {event.rsvp_max_capacity && (
                      <span className="text-text-muted-light dark:text-text-muted-dark">
                        {' '}/ {event.rsvp_max_capacity}
                      </span>
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onViewRsvps}
                    className="h-7 text-meta"
                  >
                    View RSVPs
                  </Button>
                </>
              )}

              {/* Member: RSVP action buttons */}
              {showRsvpSection && !isBoard && (
                <>
                  {hasConfirmedRsvp ? (
                    <>
                      <Badge className="text-meta bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        RSVPd ({myRsvp.guest_count} guest{myRsvp.guest_count > 1 ? 's' : ''})
                      </Badge>
                      {event.rsvp_allow_cancellation && !eventStarted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onCancelRsvp}
                          disabled={isCancelling}
                          className="h-7 text-meta text-destructive hover:text-destructive"
                        >
                          {isCancelling ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          Cancel RSVP
                        </Button>
                      )}
                    </>
                  ) : hasPendingRsvp ? (
                    <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400 gap-1">
                      <Clock className="h-3 w-3" />
                      Payment pending
                    </Badge>
                  ) : isFull ? (
                    <Badge variant="outline" className="text-meta text-text-muted-light dark:text-text-muted-dark gap-1">
                      <Users className="h-3 w-3" />
                      Event full
                    </Badge>
                  ) : eventStarted ? (
                    <Badge variant="outline" className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      RSVP closed
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRsvp}
                      className="h-7 text-meta"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      RSVP
                      {event.rsvp_fee > 0 && ` · $${(event.rsvp_fee / 100).toFixed(2)}${event.rsvp_fee_type === 'per_person' ? '/person' : ''}`}
                    </Button>
                  )}
                </>
              )}

              {/* Capacity indicator */}
              {event.rsvp_max_capacity && rsvpSummary && !isBoard && (
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {Math.max(0, event.rsvp_max_capacity - rsvpSummary.totalGuests)} spots left
                </span>
              )}
            </div>
          )}
        </div>

        {/* Board action buttons */}
        {isBoard && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(event)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(event)}
              disabled={isDeleting}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
