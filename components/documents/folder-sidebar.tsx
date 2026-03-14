'use client';

import { useState } from 'react';
import { Folder, FolderPlus, Files, Trash2, Loader2, GripVertical } from 'lucide-react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { toast } from 'sonner';
import type { Document, DocumentFolder } from '@/lib/types/database';

interface FolderSidebarProps {
  folders: DocumentFolder[];
  documents: Document[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onFolderChanged: () => void;
}

// ─── Sortable + Droppable Folder Item (board) ───────────

function SortableFolderItem({
  folder,
  count,
  isActive,
  isDeletingId,
  onSelect,
  onDelete,
}: {
  folder: DocumentFolder;
  count: number;
  isActive: boolean;
  isDeletingId: string | null;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `folder-${folder.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center${isDragging ? ' opacity-50' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-inner-card text-left transition-colors flex-1 min-w-0 ${
          isActive
            ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }${isOver ? ' ring-2 ring-secondary-400 bg-secondary-400/10' : ''}`}
        onClick={onSelect}
      >
        <Folder className="h-4 w-4 shrink-0" />
        <span className="text-label flex-1 truncate">{folder.name}</span>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {count}
        </span>
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted-light dark:text-text-muted-dark hover:text-destructive transition-all shrink-0"
        onClick={onDelete}
        disabled={isDeletingId === folder.id}
      >
        {isDeletingId === folder.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// ─── Read-only Droppable Folder Item (non-board) ────────

function DroppableFolderItem({
  folder,
  count,
  isActive,
  onSelect,
}: {
  folder: DocumentFolder;
  count: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}` });

  return (
    <button
      ref={setNodeRef}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left transition-colors ${
        isActive
          ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
          : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
      }${isOver ? ' ring-2 ring-secondary-400 bg-secondary-400/10' : ''}`}
      onClick={onSelect}
    >
      <Folder className="h-4 w-4 shrink-0" />
      <span className="text-label flex-1 truncate">{folder.name}</span>
      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
        {count}
      </span>
    </button>
  );
}

// ─── Main Sidebar ──────────────────────────────────────

export function FolderSidebar({
  folders,
  documents,
  selectedFolderId,
  onSelectFolder,
  onFolderChanged,
}: FolderSidebarProps) {
  const { community, member, isBoard } = useCommunity();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function getCount(folderId: string | null): number {
    if (folderId === null) return documents.length;
    return documents.filter((d) => d.folder_id === folderId).length;
  }

  async function handleCreate() {
    if (!newName.trim() || !member) return;

    setSubmitting(true);
    const supabase = createClient();

    const maxOrder = folders.length > 0 ? Math.max(...folders.map((f) => f.sort_order)) : -1;

    const { error } = await supabase.from('document_folders').insert({
      community_id: community.id,
      name: newName.trim(),
      created_by: member.id,
      sort_order: maxOrder + 1,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A folder with that name already exists.');
      } else {
        toast.error('Failed to create folder.');
      }
      return;
    }

    toast.success('Folder created.');
    setNewName('');
    setCreating(false);
    onFolderChanged();
  }

  async function handleDelete(folder: DocumentFolder) {
    const count = getCount(folder.id);
    const msg = count > 0
      ? `Delete folder "${folder.name}"? The ${count} document${count > 1 ? 's' : ''} inside will be moved to "Other".`
      : `Delete folder "${folder.name}"?`;

    const confirmed = window.confirm(msg);
    if (!confirmed) return;

    setDeletingId(folder.id);
    const supabase = createClient();

    // Move documents to "Other" folder if they exist
    if (count > 0) {
      const otherFolder = folders.find((f) => f.name === 'Other' && f.id !== folder.id);
      if (otherFolder) {
        await supabase
          .from('documents')
          .update({ folder_id: otherFolder.id })
          .eq('folder_id', folder.id);
      }
    }

    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folder.id);

    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete folder.');
      return;
    }

    toast.success('Folder deleted.');
    if (selectedFolderId === folder.id) {
      onSelectFolder(null);
    }
    onFolderChanged();
  }

  return (
    <div className="space-y-1">
      {/* All Documents button */}
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left transition-colors ${
          selectedFolderId === null
            ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Files className="h-4 w-4 shrink-0" />
        <span className="text-label flex-1 truncate">All Documents</span>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {getCount(null)}
        </span>
      </button>

      {/* Folder list - sortable for board, droppable for all */}
      {isBoard ? (
        <SortableContext
          items={folders.map((f) => `folder-${f.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="pl-3 space-y-0.5">
            {folders.map((folder) => (
              <SortableFolderItem
                key={folder.id}
                folder={folder}
                count={getCount(folder.id)}
                isActive={selectedFolderId === folder.id}
                isDeletingId={deletingId}
                onSelect={() => onSelectFolder(folder.id)}
                onDelete={() => handleDelete(folder)}
              />
            ))}
          </div>
        </SortableContext>
      ) : (
        <div className="pl-3 space-y-0.5">
          {folders.map((folder) => (
            <DroppableFolderItem
              key={folder.id}
              folder={folder}
              count={getCount(folder.id)}
              isActive={selectedFolderId === folder.id}
              onSelect={() => onSelectFolder(folder.id)}
            />
          ))}
        </div>
      )}

      {/* New Folder button (board only) */}
      {isBoard && (
        <>
          {creating ? (
            <div className="flex items-center gap-1.5 px-1 mt-1">
              <Input
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
                className="h-8 text-sm"
                autoFocus
                maxLength={100}
                disabled={submitting}
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={submitting || !newName.trim()}
                className="h-8 px-2 shrink-0"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
              </Button>
            </div>
          ) : (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left text-text-muted-light dark:text-text-muted-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
              onClick={() => setCreating(true)}
            >
              <FolderPlus className="h-4 w-4 shrink-0" />
              <span className="text-label">New Folder</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
