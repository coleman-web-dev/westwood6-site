'use client';

import { useState } from 'react';
import { Folder } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { toast } from 'sonner';
import type { Document, DocumentFolder } from '@/lib/types/database';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  folders: DocumentFolder[];
  onSuccess: () => void;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  document: doc,
  folders,
  onSuccess,
}: MoveToFolderDialogProps) {
  const [selected, setSelected] = useState<string>(doc.folder_id ?? folders[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  // Sort folders by sort_order
  const sorted = [...folders].sort((a, b) => a.sort_order - b.sort_order);

  async function handleSave() {
    if (selected === doc.folder_id) {
      onOpenChange(false);
      return;
    }

    if (!selected) {
      toast.error('Please select a folder.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('documents')
      .update({ folder_id: selected })
      .eq('id', doc.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to move document.');
      return;
    }

    const folderName = folders.find((f) => f.id === selected)?.name ?? 'folder';
    toast.success(`Document moved to ${folderName}.`);
    onOpenChange(false);
    onSuccess();
  }

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-inner-card text-left transition-colors ${
      active
        ? 'bg-secondary-100 dark:bg-secondary-900/30 ring-1 ring-secondary-400'
        : 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {sorted.map((folder) => (
            <button
              key={folder.id}
              className={itemClass(selected === folder.id)}
              onClick={() => setSelected(folder.id)}
            >
              <Folder className="h-4 w-4 text-secondary-500 shrink-0" />
              <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                {folder.name}
              </span>
            </button>
          ))}

          {sorted.length === 0 && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark px-3 py-2">
              No folders created yet. Create a folder from the sidebar first.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving || !selected}>
            {saving ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
