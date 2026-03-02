'use client';

import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import type { Announcement } from '@/lib/types/database';

interface AnnouncementListProps {
  announcements: Announcement[];
  loading: boolean;
  onEdit: (announcement: Announcement) => void;
  onDeleted: () => void;
}

export function AnnouncementList({
  announcements,
  loading,
  onEdit,
  onDeleted,
}: AnnouncementListProps) {
  const { isBoard } = useCommunity();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDelete(announcement: Announcement) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${announcement.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(announcement.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcement.id);

    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete announcement. Please try again.');
      return;
    }

    toast.success('Announcement deleted.');
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
            <div className="animate-pulse h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No announcements yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const isExpanded = expandedId === announcement.id;
        const isDeleting = deletingId === announcement.id;

        return (
          <div
            key={announcement.id}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="flex items-start gap-3 text-left min-w-0 flex-1"
                onClick={() => toggleExpand(announcement.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                      {announcement.title}
                    </h3>
                    {announcement.priority === 'important' && (
                      <Badge variant="secondary" className="text-meta shrink-0">
                        Important
                      </Badge>
                    )}
                    {announcement.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-meta shrink-0">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                    {new Date(announcement.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="shrink-0 mt-1 text-text-muted-light dark:text-text-muted-dark">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {/* Board action buttons */}
              {isBoard && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(announcement)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(announcement)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Expandable body */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark whitespace-pre-line">
                  {announcement.body}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
