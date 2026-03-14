'use client';

import { useState } from 'react';
import { FileText, Download, Trash2, Globe, Eye, FolderInput, Folder, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { DocumentViewerDialog } from '@/components/documents/document-viewer-dialog';
import { MoveToFolderDialog } from '@/components/documents/move-to-folder-dialog';
import type { Document, DocumentFolder } from '@/lib/types/database';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDeleted: () => void;
  folders?: DocumentFolder[];
  isDragEnabled?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Draggable Document Row ─────────────────────────────

function DraggableDocumentRow({
  doc,
  folderName,
  isDragEnabled,
  onView,
  onDownload,
  onDelete,
  onTogglePublic,
  onMove,
  isBoard,
  isDeleting,
  isDownloading,
  hasFolders,
}: {
  doc: Document;
  folderName: string | null;
  isDragEnabled: boolean;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onTogglePublic: () => void;
  onMove: () => void;
  isBoard: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  hasFolders: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `doc-${doc.id}`,
    disabled: !isDragEnabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4 cursor-pointer hover:border-secondary-300 dark:hover:border-secondary-700 transition-colors${
        isDragging ? ' opacity-50' : ''
      }`}
      onClick={onView}
    >
      {/* Drag handle (board only) */}
      {isDragEnabled && (
        <button
          type="button"
          className="cursor-grab text-text-muted-light dark:text-text-muted-dark hover:text-text-secondary-light dark:hover:text-text-secondary-dark touch-none shrink-0"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* File icon */}
      <div className="shrink-0 text-text-muted-light dark:text-text-muted-dark">
        <FileText className="h-5 w-5" />
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
            {doc.title}
          </span>
          {folderName && (
            <Badge variant="secondary" className="text-meta shrink-0 gap-1">
              <Folder className="h-3 w-3" />
              {folderName}
            </Badge>
          )}
          {doc.is_public && (
            <Badge variant="outline" className="text-meta shrink-0 gap-1">
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {new Date(doc.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {doc.file_size != null && doc.file_size > 0 && (
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {formatFileSize(doc.file_size)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isBoard && (
          <div className="flex items-center gap-1.5 mr-1" title={doc.is_public ? 'Public' : 'Private'}>
            <Globe className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
            <Switch
              checked={doc.is_public}
              onCheckedChange={onTogglePublic}
            />
          </div>
        )}

        {isBoard && hasFolders && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMove}
            className="h-8 w-8"
            title="Move to folder"
          >
            <FolderInput className="h-4 w-4" />
            <span className="sr-only">Move to folder</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
          className="h-8 w-8"
          title="View"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          disabled={isDownloading}
          className="h-8 w-8"
          title="Download"
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Download</span>
        </Button>

        {isBoard && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Document List ─────────────────────────────────

export function DocumentList({
  documents,
  loading,
  onDeleted,
  folders = [],
  isDragEnabled = false,
}: DocumentListProps) {
  const { isBoard } = useCommunity();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [movingDoc, setMovingDoc] = useState<Document | null>(null);

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  async function handleTogglePublic(doc: Document) {
    const supabase = createClient();
    const { error } = await supabase
      .from('documents')
      .update({ is_public: !doc.is_public })
      .eq('id', doc.id);

    if (error) {
      toast.error('Failed to update visibility.');
      return;
    }

    toast.success(
      doc.is_public
        ? 'Document is now private.'
        : 'Document is now visible on the landing page.'
    );
    onDeleted();
  }

  async function handleDownload(doc: Document) {
    setDownloadingId(doc.id);
    const supabase = createClient();

    const { data, error } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(doc.file_path, 3600);

    setDownloadingId(null);

    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link. Please try again.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  }

  async function handleDelete(doc: Document) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${doc.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(doc.id);
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from('hoa-documents')
      .remove([doc.file_path]);

    if (storageError) {
      setDeletingId(null);
      toast.error('Failed to delete the file. Please try again.');
      return;
    }

    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    setDeletingId(null);

    if (dbError) {
      toast.error('Failed to delete document record. Please try again.');
      return;
    }

    toast.success('Document deleted.');
    onDeleted();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
          >
            <div className="animate-pulse h-9 w-9 rounded bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="animate-pulse h-4 w-2/3 rounded bg-muted" />
              <div className="animate-pulse h-3 w-1/3 rounded bg-muted" />
            </div>
            <div className="animate-pulse h-8 w-8 rounded bg-muted shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No documents in this folder.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <DraggableDocumentRow
            key={doc.id}
            doc={doc}
            folderName={doc.folder_id ? (folderMap.get(doc.folder_id) ?? null) : null}
            isDragEnabled={isDragEnabled}
            onView={() => setViewingDoc(doc)}
            onDownload={() => handleDownload(doc)}
            onDelete={() => handleDelete(doc)}
            onTogglePublic={() => handleTogglePublic(doc)}
            onMove={() => setMovingDoc(doc)}
            isBoard={isBoard}
            isDeleting={deletingId === doc.id}
            isDownloading={downloadingId === doc.id}
            hasFolders={folders.length > 0}
          />
        ))}
      </div>

      {viewingDoc && (
        <DocumentViewerDialog
          open={!!viewingDoc}
          onOpenChange={(isOpen) => { if (!isOpen) setViewingDoc(null); }}
          document={viewingDoc}
        />
      )}

      {movingDoc && (
        <MoveToFolderDialog
          open={!!movingDoc}
          onOpenChange={(isOpen) => { if (!isOpen) setMovingDoc(null); }}
          document={movingDoc}
          folders={folders}
          onSuccess={onDeleted}
        />
      )}
    </>
  );
}
