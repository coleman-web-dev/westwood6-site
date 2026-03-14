'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  Files,
  Trash2,
  Loader2,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
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

// ─── Folder Row (pure visual) ─────────────────────────

interface FolderRowProps {
  folder: DocumentFolder;
  count: number;
  isActive: boolean;
  isOver: boolean;
  isBoard: boolean;
  isDeletingId: string | null;
  onSelect: () => void;
  onDelete: () => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onAddChild?: () => void;
  gripProps?: Record<string, unknown>;
}

function FolderRow({
  folder,
  count,
  isActive,
  isOver,
  isBoard,
  isDeletingId,
  onSelect,
  onDelete,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onAddChild,
  gripProps,
}: FolderRowProps) {
  return (
    <div className="group flex items-center">
      {/* Grip handle (board root only) */}
      {gripProps && (
        <button
          type="button"
          className="cursor-grab text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5"
          onClick={(e) => e.stopPropagation()}
          {...gripProps}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Chevron toggle (folders with children) */}
      {hasChildren !== undefined && (
        hasChildren ? (
          <button
            type="button"
            className="shrink-0 p-0.5 text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )
      )}

      {/* Main folder button */}
      <button
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-inner-card text-left transition-colors flex-1 min-w-0 ${
          isActive
            ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }${isOver ? ' ring-2 ring-secondary-400 bg-secondary-400/10' : ''}`}
        onClick={onSelect}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" />
        <span className="text-label flex-1 truncate">{folder.name}</span>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {count}
        </span>
      </button>

      {/* Add subfolder button (board only, root folders) */}
      {isBoard && onAddChild && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted-light dark:text-text-muted-dark hover:text-secondary-500 transition-all shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild();
          }}
          title="Add subfolder"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Delete button (board only) */}
      {isBoard && (
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted-light dark:text-text-muted-dark hover:text-destructive transition-all shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeletingId === folder.id}
        >
          {isDeletingId === folder.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Sortable Root Folder (board only) ────────────────

function SortableRootFolder(props: Omit<FolderRowProps, 'isOver' | 'gripProps'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: `folder-${props.folder.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <FolderRow
        {...props}
        isOver={isOver}
        gripProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── Droppable Folder (non-board root or any child) ───

function DroppableFolder(props: Omit<FolderRowProps, 'isOver' | 'gripProps'>) {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${props.folder.id}` });

  return (
    <div ref={setNodeRef}>
      <FolderRow {...props} isOver={isOver} />
    </div>
  );
}

// ─── Inline Create Input ──────────────────────────────

function InlineCreateInput({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <div className="flex items-center gap-1.5">
      <Input
        placeholder="Folder name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) onSubmit(name.trim());
          if (e.key === 'Escape') onCancel();
        }}
        className="h-7 text-sm"
        autoFocus
        maxLength={100}
        disabled={submitting}
      />
      <Button
        size="sm"
        onClick={() => name.trim() && onSubmit(name.trim())}
        disabled={submitting || !name.trim()}
        className="h-7 px-2 shrink-0"
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
      </Button>
      <button
        type="button"
        className="p-1 text-text-muted-light dark:text-text-muted-dark hover:text-destructive transition-colors shrink-0"
        onClick={onCancel}
        title="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────

export function FolderSidebar({
  folders,
  documents,
  selectedFolderId,
  onSelectFolder,
  onFolderChanged,
}: FolderSidebarProps) {
  const { community, member, isBoard } = useCommunity();
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Build tree structure
  const rootFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [folders]
  );

  // Default all folders to collapsed on first load
  useEffect(() => {
    if (!initializedRef.current && rootFolders.length > 0) {
      initializedRef.current = true;
      setCollapsedFolders(new Set(rootFolders.map((f) => f.id)));
    }
  }, [rootFolders]);

  const childMap = useMemo(() => {
    const map = new Map<string, DocumentFolder[]>();
    for (const folder of folders) {
      if (folder.parent_id) {
        const children = map.get(folder.parent_id) ?? [];
        children.push(folder);
        map.set(
          folder.parent_id,
          children.sort((a, b) => a.sort_order - b.sort_order)
        );
      }
    }
    return map;
  }, [folders]);

  function getChildren(folderId: string): DocumentFolder[] {
    return childMap.get(folderId) ?? [];
  }

  function isExpanded(folderId: string): boolean {
    return !collapsedFolders.has(folderId);
  }

  function toggleExpanded(folderId: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  // Auto-collapse: when a folder is selected, collapse all other root folders
  function selectAndCollapse(folderId: string | null) {
    // Determine which root folder should stay expanded
    let activeRootId: string | null = null;
    if (folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        activeRootId = folder.parent_id === null ? folder.id : folder.parent_id;
      }
    }

    // Collapse all root folders except the active one
    setCollapsedFolders(() => {
      const next = new Set<string>();
      for (const root of rootFolders) {
        if (root.id !== activeRootId) {
          next.add(root.id);
        }
      }
      return next;
    });

    onSelectFolder(folderId);
  }

  // Count: folder docs + all children docs
  function getCount(folderId: string | null): number {
    if (folderId === null) return documents.length;
    let count = documents.filter((d) => d.folder_id === folderId).length;
    for (const child of getChildren(folderId)) {
      count += documents.filter((d) => d.folder_id === child.id).length;
    }
    return count;
  }

  // Direct count (only this folder, not children)
  function getDirectCount(folderId: string): number {
    return documents.filter((d) => d.folder_id === folderId).length;
  }

  function startCreating(parentId: string | null) {
    setCreateParentId(parentId);
    setShowCreateInput(true);
    // Auto-expand parent if creating subfolder
    if (parentId) {
      setCollapsedFolders((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  }

  function cancelCreating() {
    setShowCreateInput(false);
    setCreateParentId(null);
  }

  async function handleCreate(name: string) {
    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();

    // Get max sort_order among siblings
    const siblings = createParentId
      ? folders.filter((f) => f.parent_id === createParentId)
      : folders.filter((f) => f.parent_id === null);
    const maxOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((f) => f.sort_order))
        : -1;

    const { error } = await supabase.from('document_folders').insert({
      community_id: community.id,
      name,
      parent_id: createParentId,
      created_by: member.id,
      sort_order: maxOrder + 1,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A folder with that name already exists here.');
      } else {
        toast.error('Failed to create folder.');
      }
      return;
    }

    toast.success('Folder created.');
    cancelCreating();
    onFolderChanged();
  }

  async function handleDelete(folder: DocumentFolder) {
    const children = getChildren(folder.id);
    const allIds = [folder.id, ...children.map((c) => c.id)];
    const docCount = documents.filter(
      (d) => d.folder_id && allIds.includes(d.folder_id)
    ).length;
    const childCount = children.length;

    let msg = `Delete folder "${folder.name}"?`;
    if (childCount > 0 && docCount > 0) {
      msg = `Delete "${folder.name}" and its ${childCount} subfolder${childCount > 1 ? 's' : ''}? ${docCount} document${docCount > 1 ? 's' : ''} will be moved to "Other".`;
    } else if (childCount > 0) {
      msg = `Delete "${folder.name}" and its ${childCount} subfolder${childCount > 1 ? 's' : ''}?`;
    } else if (docCount > 0) {
      msg = `Delete "${folder.name}"? ${docCount} document${docCount > 1 ? 's' : ''} will be moved to "Other".`;
    }

    if (!window.confirm(msg)) return;

    setDeletingId(folder.id);
    const supabase = createClient();

    // Move documents to "Other" root folder before deleting
    if (docCount > 0) {
      const otherFolder =
        folders.find(
          (f) => f.name === 'Other' && f.parent_id === null && f.id !== folder.id
        ) ??
        folders.find((f) => f.parent_id === null && f.id !== folder.id);

      if (otherFolder) {
        for (const fid of allIds) {
          await supabase
            .from('documents')
            .update({ folder_id: otherFolder.id })
            .eq('folder_id', fid);
        }
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
    if (selectedFolderId && allIds.includes(selectedFolderId)) {
      onSelectFolder(null);
    }
    onFolderChanged();
  }

  // ─── Render ──────────────────────────────────────────

  function renderFolderTree() {
    const items = rootFolders.map((f) => `folder-${f.id}`);

    const content = rootFolders.map((root) => {
      const children = getChildren(root.id);
      const expanded = isExpanded(root.id) && children.length > 0;

      return (
        <div key={root.id}>
          {/* Root folder item */}
          {isBoard ? (
            <SortableRootFolder
              folder={root}
              count={getCount(root.id)}
              isActive={selectedFolderId === root.id}
              isBoard={isBoard}
              isDeletingId={deletingId}
              onSelect={() => selectAndCollapse(root.id)}
              onDelete={() => handleDelete(root)}
              hasChildren={children.length > 0}
              isExpanded={isExpanded(root.id)}
              onToggleExpand={() => toggleExpanded(root.id)}
              onAddChild={() => startCreating(root.id)}
            />
          ) : (
            <DroppableFolder
              folder={root}
              count={getCount(root.id)}
              isActive={selectedFolderId === root.id}
              isBoard={false}
              isDeletingId={null}
              onSelect={() => selectAndCollapse(root.id)}
              onDelete={() => {}}
              hasChildren={children.length > 0}
              isExpanded={isExpanded(root.id)}
              onToggleExpand={() => toggleExpanded(root.id)}
            />
          )}

          {/* Sub-folders (expanded) */}
          {expanded && (
            <div className="pl-6 space-y-0.5 mt-0.5">
              {children.map((child) => (
                <DroppableFolder
                  key={child.id}
                  folder={child}
                  count={getDirectCount(child.id)}
                  isActive={selectedFolderId === child.id}
                  isBoard={isBoard}
                  isDeletingId={deletingId}
                  onSelect={() => selectAndCollapse(child.id)}
                  onDelete={() => handleDelete(child)}
                />
              ))}
            </div>
          )}

          {/* Inline subfolder creation */}
          {showCreateInput && createParentId === root.id && (
            <div className="pl-6 mt-1">
              <InlineCreateInput
                onSubmit={handleCreate}
                onCancel={cancelCreating}
                submitting={submitting}
              />
            </div>
          )}
        </div>
      );
    });

    if (isBoard) {
      return (
        <SortableContext
          items={items}
          strategy={verticalListSortingStrategy}
        >
          <div className="pl-3 space-y-0.5">{content}</div>
        </SortableContext>
      );
    }

    return <div className="pl-3 space-y-0.5">{content}</div>;
  }

  return (
    <div className="space-y-1">
      {/* All Documents */}
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left transition-colors ${
          selectedFolderId === null
            ? 'bg-secondary-100 dark:bg-secondary-900/30 text-text-primary-light dark:text-text-primary-dark'
            : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
        }`}
        onClick={() => selectAndCollapse(null)}
      >
        <Files className="h-4 w-4 shrink-0" />
        <span className="text-label flex-1 truncate">All Documents</span>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {getCount(null)}
        </span>
      </button>

      {/* Folder tree */}
      {renderFolderTree()}

      {/* New Folder at root (board only) */}
      {isBoard && (
        <>
          {showCreateInput && createParentId === null ? (
            <div className="px-1 mt-1">
              <InlineCreateInput
                onSubmit={handleCreate}
                onCancel={cancelCreating}
                submitting={submitting}
              />
            </div>
          ) : !showCreateInput ? (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-inner-card text-left text-text-muted-light dark:text-text-muted-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
              onClick={() => startCreating(null)}
            >
              <FolderPlus className="h-4 w-4 shrink-0" />
              <span className="text-label">New Folder</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
