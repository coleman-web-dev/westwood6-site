'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { EventList } from '@/components/events/event-list';
import { CreateEventDialog } from '@/components/events/create-event-dialog';
import type { Event } from '@/lib/types/database';

export default function EventsPage() {
  const { community, isBoard } = useCommunity();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('community_id', community.id)
      .order('start_datetime', { ascending: true });

    setEvents((data as Event[]) ?? []);
    setLoading(false);
  }, [community.id]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        onEdit={handleEdit}
        onDeleted={handleDeleted}
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
