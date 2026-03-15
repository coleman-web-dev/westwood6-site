'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, FolderPlus, Loader2, X, Search } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { DocumentList } from '@/components/documents/document-list';
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog';
import { FolderSidebar } from '@/components/documents/folder-sidebar';
import { DroppableTab } from '@/components/documents/droppable-tab';
import { toast } from 'sonner';
import type { Document, DocumentFolder } from '@/lib/types/database';

export default function DocumentsPage() {
  const { community, member, isBoard, canRead, canWrite } = useCommunity();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Unified state: selected folder ID (null = "All Documents")
  const [selectedFolderId, setSelectedFolderIdRaw] = useState<string | null>(null);
  function setSelectedFolderId(id: string | null) {
    setSelectedFolderIdRaw(id);
    // Reset subfolder creation when switching folders
    setShowSubfolderCreate(false);
    setSubfolderName('');
  }

  // Active drag state for DragOverlay
  const [activeDragDoc, setActiveDragDoc] = useState<Document | null>(null);

  // Inline subfolder creation in main area
  const [showSubfolderCreate, setShowSubfolderCreate] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');
  const [subfolderSubmitting, setSubfolderSubmitting] = useState(false);

  // Document search
  const [searchQuery, setSearchQuery] = useState('');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchDocuments = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    setDocuments((data as Document[]) ?? []);
    setLoading(false);
  }, [community.id]);

  const fetchFolders = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('document_folders')
      .select('*')
      .eq('community_id', community.id)
      .order('sort_order', { ascending: true });

    setFolders((data as DocumentFolder[]) ?? []);
  }, [community.id]);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, [fetchDocuments, fetchFolders]);

  function handleRefresh() {
    fetchDocuments();
    fetchFolders();
  }

  // Check if the selected folder is a root folder (can have subfolders)
  const selectedIsRoot = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.parent_id === null
    : false;

  async function handleCreateSubfolder() {
    if (!subfolderName.trim() || !member || !selectedFolderId) return;

    setSubfolderSubmitting(true);
    const supabase = createClient();

    const siblings = folders.filter((f) => f.parent_id === selectedFolderId);
    const maxOrder =
      siblings.length > 0 ? Math.max(...siblings.map((f) => f.sort_order)) : -1;

    const { error } = await supabase.from('document_folders').insert({
      community_id: community.id,
      name: subfolderName.trim(),
      parent_id: selectedFolderId,
      created_by: member.id,
      sort_order: maxOrder + 1,
    });

    setSubfolderSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('A folder with that name already exists here.');
      } else {
        toast.error('Failed to create folder.');
      }
      return;
    }

    toast.success('Folder created.');
    setSubfolderName('');
    setShowSubfolderCreate(false);
    handleRefresh();
  }

  // ─── Tree helpers ────────────────────────────────────────

  // Root-level folders only (for tabs)
  const rootFolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order),
    [folders]
  );

  // Determine which root folder tab should be active
  // (highlights parent tab when a sub-folder is selected)
  const activeRootFolderId = useMemo(() => {
    if (!selectedFolderId) return null;
    const selected = folders.find((f) => f.id === selectedFolderId);
    if (!selected) return null;
    return selected.parent_id ?? selected.id;
  }, [selectedFolderId, folders]);

  // Filter documents: include selected folder + all its children
  const filteredDocuments = useMemo(() => {
    if (!selectedFolderId) return documents;
    const children = folders.filter((f) => f.parent_id === selectedFolderId);
    const folderIds = [selectedFolderId, ...children.map((c) => c.id)];
    return documents.filter((d) => d.folder_id && folderIds.includes(d.folder_id));
  }, [selectedFolderId, folders, documents]);

  // ─── Drag-and-Drop Handlers ───────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    if (activeId.startsWith('doc-')) {
      const docId = activeId.replace('doc-', '');
      const doc = documents.find((d) => d.id === docId);
      if (doc) setActiveDragDoc(doc);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragDoc(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Document dropped on a folder (sidebar or tab)
    if (activeId.startsWith('doc-') && (overId.startsWith('folder-') || overId.startsWith('tab-'))) {
      const docId = activeId.replace('doc-', '');
      const folderId = overId.replace('folder-', '').replace('tab-', '');

      const doc = documents.find((d) => d.id === docId);
      if (!doc || doc.folder_id === folderId) return;

      // Optimistic update
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, folder_id: folderId } : d))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('documents')
        .update({ folder_id: folderId })
        .eq('id', docId);

      if (error) {
        toast.error('Failed to move document.');
        fetchDocuments();
      } else {
        toast.success('Document moved.');
      }
      return;
    }

    // Folder reorder (only among siblings with the same parent_id)
    if (activeId.startsWith('folder-') && overId.startsWith('folder-')) {
      const activeFolderIdStr = activeId.replace('folder-', '');
      const overFolderIdStr = overId.replace('folder-', '');

      const activeFolder = folders.find((f) => f.id === activeFolderIdStr);
      const overFolder = folders.find((f) => f.id === overFolderIdStr);
      if (!activeFolder || !overFolder) return;

      // Only reorder siblings (same parent)
      if (activeFolder.parent_id !== overFolder.parent_id) return;

      const siblings = folders
        .filter((f) => f.parent_id === activeFolder.parent_id)
        .sort((a, b) => a.sort_order - b.sort_order);

      const oldIndex = siblings.findIndex((f) => f.id === activeFolderIdStr);
      const newIndex = siblings.findIndex((f) => f.id === overFolderIdStr);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Optimistic update: apply new sort_order to siblings
      const updatedFolders = folders.map((f) => {
        const idx = reordered.findIndex((r) => r.id === f.id);
        return idx !== -1 ? { ...f, sort_order: idx } : f;
      });
      setFolders(updatedFolders);

      const supabase = createClient();
      for (const [i, folder] of reordered.entries()) {
        const { error } = await supabase
          .from('document_folders')
          .update({ sort_order: i })
          .eq('id', folder.id);

        if (error) {
          toast.error('Failed to reorder folders.');
          fetchFolders();
          return;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Documents
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48 sm:w-56 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {canWrite('documents') && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Folder sidebar */}
          <div className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-20">
              <h2 className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2 px-1">
                Folders
              </h2>
              <FolderSidebar
                folders={folders}
                documents={documents}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onFolderChanged={handleRefresh}
              />
            </div>
          </div>

          {/* Document list with dynamic folder tabs */}
          <div className="flex-1 min-w-0">
            {/* Dynamic tabs from root-level folders */}
            <div className="flex items-center gap-1 flex-wrap mb-4 border-b border-stroke-light dark:border-stroke-dark pb-2">
              <DroppableTab
                id="all"
                label="All"
                isActive={selectedFolderId === null}
                onClick={() => setSelectedFolderId(null)}
              />
              {rootFolders.map((folder) => (
                <DroppableTab
                  key={folder.id}
                  id={`tab-${folder.id}`}
                  label={folder.name}
                  isActive={activeRootFolderId === folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                />
              ))}
            </div>

            <div className="space-y-6">
              <DocumentList
                documents={searchQuery ? documents : filteredDocuments}
                loading={loading}
                onDeleted={handleRefresh}
                folders={folders}
                isDragEnabled={isBoard}
                searchQuery={searchQuery}
                selectedFolderId={selectedFolderId}
              />

              {/* New Folder button in main area (board, when viewing a root folder) */}
              {isBoard && selectedFolderId && selectedIsRoot && (
                <div>
                  {showSubfolderCreate ? (
                    <div className="flex items-center gap-2 max-w-sm">
                      <Input
                        placeholder="Subfolder name"
                        value={subfolderName}
                        onChange={(e) => setSubfolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && subfolderName.trim()) handleCreateSubfolder();
                          if (e.key === 'Escape') {
                            setShowSubfolderCreate(false);
                            setSubfolderName('');
                          }
                        }}
                        className="h-8 text-sm"
                        autoFocus
                        maxLength={100}
                        disabled={subfolderSubmitting}
                      />
                      <Button
                        size="sm"
                        onClick={handleCreateSubfolder}
                        disabled={subfolderSubmitting || !subfolderName.trim()}
                        className="h-8 shrink-0"
                      >
                        {subfolderSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Add'
                        )}
                      </Button>
                      <button
                        type="button"
                        className="p-1 text-text-muted-light dark:text-text-muted-dark hover:text-destructive transition-colors shrink-0"
                        onClick={() => {
                          setShowSubfolderCreate(false);
                          setSubfolderName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubfolderCreate(true)}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      New Folder
                    </Button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Drag overlay - shows document title while dragging */}
        <DragOverlay>
          {activeDragDoc ? (
            <div className="rounded-panel border border-secondary-400 bg-surface-light dark:bg-surface-dark p-3 shadow-lg opacity-90 max-w-xs">
              <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate block">
                {activeDragDoc.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <UploadDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleRefresh}
        folders={folders}
      />

    </div>
  );
}
