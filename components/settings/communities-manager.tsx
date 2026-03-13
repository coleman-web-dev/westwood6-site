'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import { CreateCommunityDialog } from './create-community-dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Archive, RotateCcw, Users, Globe } from 'lucide-react';

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  archived_at: string | null;
  member_count: number;
}

interface EditForm {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
}

export function CommunitiesManager() {
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Edit state
  const [editingCommunity, setEditingCommunity] = useState<CommunityRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', slug: '', address: '', phone: '', email: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Archive state
  const [archivingCommunity, setArchivingCommunity] = useState<CommunityRow | null>(null);
  const [archiveSaving, setArchiveSaving] = useState(false);

  const fetchCommunities = useCallback(async () => {
    try {
      const res = await fetch('/api/communities');
      const data = await res.json();
      if (res.ok) {
        setCommunities(data.communities);
      }
    } catch {
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  function openEdit(c: CommunityRow) {
    setEditingCommunity(c);
    setEditForm({
      name: c.name,
      slug: c.slug,
      address: c.address ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    });
    setEditError('');
  }

  async function handleEditSave() {
    if (!editingCommunity) return;
    if (!editForm.name.trim()) {
      setEditError('Community name is required');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      const res = await fetch(`/api/communities/${editingCommunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          slug: editForm.slug.trim(),
          address: editForm.address.trim() || null,
          phone: editForm.phone.trim() || null,
          email: editForm.email.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || 'Failed to update');
        return;
      }

      toast.success(`Updated ${data.community.name}`);
      setEditingCommunity(null);
      fetchCommunities();
    } catch {
      setEditError('Something went wrong');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleArchive(c: CommunityRow) {
    setArchiveSaving(true);
    try {
      const res = await fetch(`/api/communities/${c.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to archive');
        return;
      }

      toast.success(`Archived ${c.name}`);
      setArchivingCommunity(null);
      fetchCommunities();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setArchiveSaving(false);
    }
  }

  async function handleRestore(c: CommunityRow) {
    try {
      const res = await fetch(`/api/communities/${c.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to restore');
        return;
      }

      toast.success(`Restored ${c.name}`);
      fetchCommunities();
    } catch {
      toast.error('Something went wrong');
    }
  }

  const active = communities.filter((c) => !c.archived_at);
  const archived = communities.filter((c) => c.archived_at);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Communities
          </h2>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
            Manage all communities on the platform.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-pill bg-secondary-400 text-primary-900 hover:bg-secondary-400/90 text-meta"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Community
        </Button>
      </div>

      {/* Active communities */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-card-title text-text-secondary-light dark:text-text-secondary-dark">
            Active
          </h3>
          <div className="space-y-2">
            {active.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                onEdit={() => openEdit(c)}
                onArchive={() => setArchivingCommunity(c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Archived communities */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-card-title text-text-secondary-light dark:text-text-secondary-dark">
            Archived
          </h3>
          <div className="space-y-2 opacity-60">
            {archived.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                archived
                onEdit={() => openEdit(c)}
                onRestore={() => handleRestore(c)}
              />
            ))}
          </div>
        </div>
      )}

      {communities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No communities yet. Create your first one to get started.
          </p>
        </div>
      )}

      {/* Create dialog */}
      <CreateCommunityDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Edit dialog */}
      <Dialog open={!!editingCommunity} onOpenChange={(open) => !open && setEditingCommunity(null)}>
        <DialogContent className="sm:max-w-md bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark">
          <DialogHeader>
            <DialogTitle className="text-page-title text-text-primary-light dark:text-text-primary-dark">
              Edit Community
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-label text-text-primary-light dark:text-text-primary-dark">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => { setEditForm((f) => ({ ...f, name: e.target.value })); setEditError(''); }}
                className="rounded-pill"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-label text-text-primary-light dark:text-text-primary-dark">Slug</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => { setEditForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })); setEditError(''); }}
                className="rounded-pill"
              />
              {editForm.slug && (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  duesiq.com/{editForm.slug}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-label text-text-primary-light dark:text-text-primary-dark">Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St"
                className="rounded-pill"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-label text-text-primary-light dark:text-text-primary-dark">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="rounded-pill"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-label text-text-primary-light dark:text-text-primary-dark">Email</Label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="info@community.com"
                  className="rounded-pill"
                />
              </div>
            </div>
            {editError && (
              <p className="text-meta text-[#FF5A5A]">{editError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCommunity(null)} disabled={editSaving} className="rounded-pill">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving || !editForm.name.trim()}
              className="rounded-pill bg-secondary-400 text-primary-900 hover:bg-secondary-400/90"
            >
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!archivingCommunity} onOpenChange={(open) => !open && setArchivingCommunity(null)}>
        <AlertDialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-page-title text-text-primary-light dark:text-text-primary-dark">
              Archive {archivingCommunity?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Members will no longer be able to access this community. All data will be preserved and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-pill" disabled={archiveSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (archivingCommunity) handleArchive(archivingCommunity);
              }}
              disabled={archiveSaving}
              className="rounded-pill bg-[#FF5A5A] text-white hover:bg-[#FF5A5A]/90"
            >
              {archiveSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CommunityCard({
  community,
  archived,
  onEdit,
  onArchive,
  onRestore,
}: {
  community: CommunityRow;
  archived?: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  const created = new Date(community.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between p-card-padding bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark truncate">
            {community.name}
          </h4>
          {archived && (
            <span className="shrink-0 px-2 py-0.5 rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 text-[10px] font-medium text-text-muted-light dark:text-text-muted-dark">
              Archived
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-meta text-text-muted-light dark:text-text-muted-dark">
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            /{community.slug}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {community.member_count} {community.member_count === 1 ? 'member' : 'members'}
          </span>
          <span>Created {created}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-4">
        <button
          onClick={onEdit}
          className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        {!archived && onArchive && (
          <button
            onClick={onArchive}
            className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
        {archived && onRestore && (
          <button
            onClick={onRestore}
            className="p-2 rounded-inner-card text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
            title="Restore"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
