'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/shared/ui/alert-dialog';
import { AmenityDialog } from '@/components/amenities/amenity-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Amenity } from '@/lib/types/database';

interface AmenityListProps {
  communityId: string;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AmenityList({ communityId }: AmenityListProps) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Amenity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAmenities = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('amenities')
      .select('*')
      .eq('community_id', communityId)
      .order('name');

    setAmenities((data as Amenity[]) ?? []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  function handleAdd() {
    setEditingAmenity(null);
    setDialogOpen(true);
  }

  function handleEdit(amenity: Amenity) {
    setEditingAmenity(amenity);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const supabase = createClient();

    // Try hard delete first
    const { error } = await supabase
      .from('amenities')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      // FK constraint likely means reservations exist, soft-delete instead
      const { error: updateError } = await supabase
        .from('amenities')
        .update({ active: false })
        .eq('id', deleteTarget.id);

      setDeleting(false);
      setDeleteTarget(null);

      if (updateError) {
        toast.error('Failed to remove amenity. Please try again.');
        return;
      }

      toast.success('Amenity has existing reservations and was deactivated instead of deleted.');
      fetchAmenities();
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    toast.success('Amenity deleted.');
    fetchAmenities();
  }

  if (loading) {
    return (
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark py-2">
        Loading amenities...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark font-semibold">
          Manage amenities
        </p>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Amenity
        </Button>
      </div>

      {amenities.length === 0 ? (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark py-4 text-center">
          No amenities yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-1">
          {amenities.map((amenity) => (
            <div
              key={amenity.id}
              className="flex items-center justify-between gap-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark px-dense-row-x py-dense-row-y"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                  {amenity.name}
                </span>
                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                  {amenity.booking_type === 'full_day' ? 'Full Day' : 'Time Slot'}
                </Badge>
                {amenity.fee > 0 && (
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
                    {formatDollars(amenity.fee)}
                  </span>
                )}
                {!amenity.active && (
                  <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                    Inactive
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleEdit(amenity)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit {amenity.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(amenity)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete {amenity.name}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <AmenityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchAmenities}
        editingAmenity={editingAmenity}
        communityId={communityId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete amenity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? If this
              amenity has existing reservations it will be deactivated instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
