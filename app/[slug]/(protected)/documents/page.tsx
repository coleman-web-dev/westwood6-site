'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Plus, FileSignature, Eye } from 'lucide-react';
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
import { DocumentList } from '@/components/documents/document-list';
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog';
import { FolderSidebar } from '@/components/documents/folder-sidebar';
import { DroppableTab } from '@/components/documents/droppable-tab';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import { toast } from 'sonner';
import type { Document, DocumentFolder, SignedAgreement } from '@/lib/types/database';

interface AgreementRow extends SignedAgreement {
  amenities?: { name: string };
  units?: { unit_number: string };
}

export default function DocumentsPage() {
  const { community, isBoard, canRead, canWrite } = useCommunity();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Unified state: selected folder ID (null = "All Documents")
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Active drag state for DragOverlay
  const [activeDragDoc, setActiveDragDoc] = useState<Document | null>(null);

  // Signed agreements state (for board/admin)
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [agreementsLoading, setAgreementsLoading] = useState(true);
  const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);

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

  const canReadDocuments = canRead('documents');

  const fetchAgreements = useCallback(async () => {
    if (!canReadDocuments) {
      setAgreementsLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('signed_agreements')
      .select('*, amenities(name), units(unit_number)')
      .eq('community_id', community.id)
      .order('signed_at', { ascending: false });

    setAgreements((data as AgreementRow[]) ?? []);
    setAgreementsLoading(false);
  }, [community.id, canReadDocuments]);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
    fetchAgreements();
  }, [fetchDocuments, fetchFolders, fetchAgreements]);

  function handleRefresh() {
    fetchDocuments();
    fetchFolders();
  }

  // Filter documents by selected folder
  const filteredDocuments = selectedFolderId
    ? documents.filter((d) => d.folder_id === selectedFolderId)
    : documents;

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

    // Folder reorder (folder dropped on folder)
    if (activeId.startsWith('folder-') && overId.startsWith('folder-')) {
      const oldIndex = folders.findIndex((f) => `folder-${f.id}` === activeId);
      const newIndex = folders.findIndex((f) => `folder-${f.id}` === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...folders];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      const updated = reordered.map((f, i) => ({ ...f, sort_order: i }));

      // Optimistic update
      setFolders(updated);

      const supabase = createClient();
      for (const folder of updated) {
        const { error } = await supabase
          .from('document_folders')
          .update({ sort_order: folder.sort_order })
          .eq('id', folder.id);

        if (error) {
          toast.error('Failed to reorder folders.');
          fetchFolders();
          return;
        }
      }
    }
  }

  // Determine if we should show the Forms-related signed agreements section
  const showAgreements =
    canReadDocuments &&
    (selectedFolderId === null ||
      folders.find((f) => f.id === selectedFolderId)?.name === 'Forms');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Documents
        </h1>
        {canWrite('documents') && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
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
            {/* Dynamic tabs from folders */}
            <div className="flex items-center gap-1 flex-wrap mb-4 border-b border-stroke-light dark:border-stroke-dark pb-2">
              <DroppableTab
                id="all"
                label="All"
                isActive={selectedFolderId === null}
                onClick={() => setSelectedFolderId(null)}
              />
              {folders.map((folder) => (
                <DroppableTab
                  key={folder.id}
                  id={`tab-${folder.id}`}
                  label={folder.name}
                  isActive={selectedFolderId === folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                />
              ))}
            </div>

            <div className="space-y-6">
              <DocumentList
                documents={filteredDocuments}
                loading={loading}
                onDeleted={handleRefresh}
                folders={folders}
                isDragEnabled={isBoard}
              />

              {/* Signed agreements section */}
              {showAgreements && (
                <SignedAgreementsDocSection
                  agreements={agreements}
                  loading={agreementsLoading}
                  onView={(reservationId) => setViewingReservationId(reservationId)}
                />
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

      {/* Agreement viewer */}
      {viewingReservationId && (
        <SignedAgreementViewer
          open={!!viewingReservationId}
          onOpenChange={(isOpen) => { if (!isOpen) setViewingReservationId(null); }}
          reservationId={viewingReservationId}
        />
      )}
    </div>
  );
}

// ─── Signed Agreements Sub-Section ──────────────────────
function SignedAgreementsDocSection({
  agreements,
  loading,
  onView,
}: {
  agreements: AgreementRow[];
  loading: boolean;
  onView: (reservationId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <FileSignature className="h-5 w-5 text-secondary-500" />
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Signed Agreements
          </h2>
        </div>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
          >
            <div className="animate-pulse h-9 w-9 rounded bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="animate-pulse h-4 w-2/3 rounded bg-muted" />
              <div className="animate-pulse h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agreements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Signed Agreements
        </h2>
      </div>

      {agreements.map((a) => (
        <div
          key={a.id}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
        >
          <div className="shrink-0 text-secondary-500">
            <FileSignature className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                {a.amenities?.name ?? 'Agreement'} - Unit {a.units?.unit_number ?? '?'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Signed by {a.signer_name}
              </span>
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {format(new Date(a.signed_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(a.reservation_id)}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View agreement</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
