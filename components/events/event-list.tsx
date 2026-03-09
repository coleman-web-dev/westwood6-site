'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, MapPin, Clock, Calendar as CalendarIcon, Pin, Megaphone, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { toast } from 'sonner';
import type { Event } from '@/lib/types/database';

interface EventListProps {
  events: Event[];
  loading: boolean;
  onEdit: (event: Event) => void;
  onDeleted: () => void;
}

export function EventList({ events, loading, onEdit, onDeleted }: EventListProps) {
  const { isBoard } = useCommunity();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
                onEdit={onEdit}
                onDelete={handleDelete}
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
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EventCard({
  event,
  isBoard,
  isDeleting,
  onEdit,
  onDelete,
}: {
  event: Event;
  isBoard: boolean;
  isDeleting: boolean;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}) {
  const startDate = new Date(event.start_datetime);
  const endDate = new Date(event.end_datetime);

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
