'use client';

import { useState } from 'react';
import { Folder, FolderPlus, Files, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { toast } from 'sonner';
import type { Document, DocumentFolder } from '@/lib/types/database';

interface FolderSidebarProps {
  folders: DocumentFolder[];
  documents: Document[];
  activeFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onFolderChanged: () => void;
}

export function FolderSidebar({
  folders,
  documents,
  activeFolderId,
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
    const { error } = await supabase.from('document_folders').insert({
      community_id: community.id,
      name: newName.trim(),
      created_by: member.id,
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
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"? Documents inside will be moved to "Unfiled".`
    );
    if (!confirmed) return;

    setDeletingId(folder.id);
    const supabase = createClient();
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
    if (activeFolderId === folder.id) {
      onSelectFolder(null);
    }
    onFolderChanged();
  }

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left transition-colors ${
      active
        ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
    }`;

  return (
    <div className="space-y-1">
      <button
        className={itemClass(activeFolderId === null)}
        onClick={() => onSelectFolder(null)}
      >
        <Files className="h-4 w-4 shrink-0" />
        <span className="text-label flex-1 truncate">All Documents</span>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {getCount(null)}
        </span>
      </button>

      {folders.map((folder) => (
        <div key={folder.id} className="group flex items-center">
          <button
            className={`${itemClass(activeFolderId === folder.id)} flex-1 min-w-0`}
            onClick={() => onSelectFolder(folder.id)}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="text-label flex-1 truncate">{folder.name}</span>
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {getCount(folder.id)}
            </span>
          </button>
          {isBoard && (
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-text-muted-light dark:text-text-muted-dark hover:text-destructive transition-all shrink-0"
              onClick={() => handleDelete(folder)}
              disabled={deletingId === folder.id}
            >
              {deletingId === folder.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      ))}

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
