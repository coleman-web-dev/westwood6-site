'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { EventList } from '@/components/events/event-list';
import type { EventRsvpSummary } from '@/components/events/event-list';
import { CreateEventDialog } from '@/components/events/create-event-dialog';
import { toast } from 'sonner';
import type { Event, EventRsvp } from '@/lib/types/database';

export default function EventsPage() {
  const { community, member, isBoard } = useCommunity();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvpMap, setRsvpMap] = useState<Record<string, EventRsvpSummary>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Show toast for RSVP success/cancelled from Stripe redirect
  useEffect(() => {
    const rsvpParam = searchParams.get('rsvp');
    if (rsvpParam === 'success') {
      toast.success('RSVP confirmed! Payment successful.');
    } else if (rsvpParam === 'cancelled') {
      toast.info('RSVP payment was cancelled.');
    }
  }, [searchParams]);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();

    // Fetch events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', community.id)
      .order('start_datetime', { ascending: true });

    const eventsList = (eventsData as Event[]) ?? [];
    setEvents(eventsList);

    // Fetch RSVP data for all events that have RSVP enabled
    const rsvpEnabledIds = eventsList
      .filter((e) => e.rsvp_enabled)
      .map((e) => e.id);

    if (rsvpEnabledIds.length > 0) {
      const { data: rsvpsData } = await supabase
        .from('event_rsvps')
        .select('*')
        .in('event_id', rsvpEnabledIds)
        .in('status', ['confirmed', 'pending_payment']);

      const rsvps = (rsvpsData as EventRsvp[]) ?? [];

      // Build summary map
      const map: Record<string, EventRsvpSummary> = {};

      for (const eventId of rsvpEnabledIds) {
        const eventRsvps = rsvps.filter((r) => r.event_id === eventId);
        const confirmed = eventRsvps.filter((r) => r.status === 'confirmed');
        const myRsvp = member
          ? eventRsvps.find((r) => r.member_id === member.id) ?? null
          : null;

        map[eventId] = {
          rsvpCount: confirmed.length,
          totalGuests: confirmed.reduce((sum, r) => sum + r.guest_count, 0),
          myRsvp,
        };
      }

      setRsvpMap(map);
    } else {
      setRsvpMap({});
    }

    setLoading(false);
  }, [community.id, member]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function handleCreate() {
    setEditingEvent(null);
    setDialogOpen(true);
  }

  function handleEdit(event: Event) {
    setEditingEvent(event);
    setDialogOpen(true);
  }

  function handleDialogSuccess() {
    fetchEvents();
  }

  function handleDeleted() {
    fetchEvents();
  }

  function handleRsvpChanged() {
    fetchEvents();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Events
        </h1>
        {isBoard && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        )}
      </div>

      <EventList
        events={events}
        loading={loading}
        rsvpMap={rsvpMap}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
        onRsvpChanged={handleRsvpChanged}
      />

      <CreateEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        editingEvent={editingEvent}
      />
    </div>
  );
}
