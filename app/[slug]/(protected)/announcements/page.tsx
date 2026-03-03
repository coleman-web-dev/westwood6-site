'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { AnnouncementList } from '@/components/announcements/announcement-list';
import { CreateAnnouncementDialog } from '@/components/announcements/create-announcement-dialog';
import type { Announcement } from '@/lib/types/database';

export default function AnnouncementsPage() {
  const { community, isBoard } = useCommunity();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    setAnnouncements((data as Announcement[]) ?? []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function handleCreate() {
    setEditingAnnouncement(null);
    setDialogOpen(true);
  }

  function handleEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setDialogOpen(true);
  }

  function handleDialogSuccess() {
    fetchAnnouncements();
  }

  function handleDeleted() {
    fetchAnnouncements();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Announcements
        </h1>
        {isBoard && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      <AnnouncementList
        announcements={announcements}
        loading={loading}
        onEdit={handleEdit}
        onDeleted={handleDeleted}
      />

      <CreateAnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        editingAnnouncement={editingAnnouncement}
      />
    </div>
  );
}
