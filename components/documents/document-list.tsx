'use client';

import { useMemo, useRef, useState } from 'react';
import {
  FileText,
  FileSignature,
  Download,
  Trash2,
  Globe,
  Eye,
  FolderInput,
  Folder,
  GripVertical,
  Lock,
  Users,
  Store,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { DocumentViewerDialog } from '@/components/documents/document-viewer-dialog';
import { MoveToFolderDialog } from '@/components/documents/move-to-folder-dialog';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import type { Document, DocumentFolder, DocVisibility } from '@/lib/types/database';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDeleted: () => void;
  folders?: DocumentFolder[];
  isDragEnabled?: boolean;
  searchQuery?: string;
  selectedFolderId?: string | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VISIBILITY_OPTIONS: { value: DocVisibility; label: string; icon: typeof Globe }[] = [
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'community', label: 'Community', icon: Users },
  { value: 'public', label: 'Public', icon: Globe },
];

// ─── Draggable Document Row ─────────────────────────────

function DraggableDocumentRow({
  doc,
  folderName,
  isDragEnabled,
  onView,
  onDownload,
  onDelete,
  onVisibilityChange,
  onMove,
  isBoard,
  isDeleting,
  isDownloading,
  hasFolders,
  isEditing,
  editTitle,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: {
  doc: Document;
  folderName: string | null;
  isDragEnabled: boolean;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onVisibilityChange: (v: DocVisibility) => void;
  onMove: () => void;
  isBoard: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  hasFolders: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `doc-${doc.id}`,
    disabled: !isDragEnabled,
  });

  const editInputRef = useRef<HTMLInputElement>(null);

  // Use a timeout to distinguish single vs double click on the title
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVendorSynced = !!doc.vendor_document_id;
  const isAgreementDoc = !!doc.signed_agreement_id;

  function handleTitleClick(e: React.MouseEvent) {
    if (!isBoard || isVendorSynced) return;
    e.stopPropagation();

    if (clickTimer.current) {
      // Double-click detected, cancel single-click action
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onView();
      return;
    }

    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onEditStart();
    }, 250);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel();
    }
  }

  const visibility = doc.visibility ?? 'community';

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
        {isAgreementDoc ? <FileSignature className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={editInputRef}
                autoFocus
                value={editTitle}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={onEditSave}
                maxLength={200}
                className="h-7 text-body font-medium"
              />
            </div>
          ) : (
            <span
              className={`text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate${
                isBoard && !isVendorSynced ? ' hover:underline hover:decoration-dotted cursor-text' : ''
              }`}
              onClick={isBoard && !isVendorSynced ? handleTitleClick : undefined}
            >
              {doc.title}
            </span>
          )}
          {folderName && !isEditing && (
            <Badge variant="secondary" className="text-meta shrink-0 gap-1">
              <Folder className="h-3 w-3" />
              {folderName}
            </Badge>
          )}
          {visibility === 'public' && !isEditing && (
            <Badge variant="outline" className="text-meta shrink-0 gap-1">
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          )}
          {visibility === 'private' && !isEditing && (
            <Badge variant="outline" className="text-meta shrink-0 gap-1 text-warning-dot">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
          {isVendorSynced && !isEditing && (
            <Badge variant="outline" className="text-meta shrink-0 gap-1 text-text-muted-light dark:text-text-muted-dark">
              <Store className="h-3 w-3" />
              Vendor
            </Badge>
          )}
        </div>
        {!isEditing && (
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
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isBoard && (
          <Select
            value={visibility}
            onValueChange={(v) => onVisibilityChange(v as DocVisibility)}
          >
            <SelectTrigger className="h-7 w-[115px] text-xs gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-1.5">
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isBoard && hasFolders && !isVendorSynced && (
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

        {isBoard && !isVendorSynced && (
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
  searchQuery = '',
  selectedFolderId,
}: DocumentListProps) {
  const { community, member, isBoard } = useCommunity();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [movingDoc, setMovingDoc] = useState<Document | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [viewingAgreementId, setViewingAgreementId] = useState<string | null>(null);

  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  // Search filtering and sorting
  const displayDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;

    const q = searchQuery.toLowerCase();
    const matched = documents.filter((d) =>
      d.title.toLowerCase().includes(q)
    );

    // Sort: current folder matches first, then by title relevance
    if (selectedFolderId) {
      const children = folders.filter((f) => f.parent_id === selectedFolderId);
      const folderIds = new Set([selectedFolderId, ...children.map((c) => c.id)]);

      return matched.sort((a, b) => {
        const aInFolder = a.folder_id ? folderIds.has(a.folder_id) : false;
        const bInFolder = b.folder_id ? folderIds.has(b.folder_id) : false;
        if (aInFolder && !bInFolder) return -1;
        if (!aInFolder && bInFolder) return 1;
        // Within same group, sort by title match position
        const aIdx = a.title.toLowerCase().indexOf(q);
        const bIdx = b.title.toLowerCase().indexOf(q);
        return aIdx - bIdx;
      });
    }

    return matched;
  }, [documents, searchQuery, selectedFolderId, folders]);

  async function handleVisibilityChange(doc: Document, newVisibility: DocVisibility) {
    const supabase = createClient();
    const { error } = await supabase
      .from('documents')
      .update({
        visibility: newVisibility,
        is_public: newVisibility === 'public',
      })
      .eq('id', doc.id);

    if (error) {
      toast.error('Failed to update visibility.');
      return;
    }

    const messages: Record<DocVisibility, string> = {
      private: 'Document is now private (board only).',
      community: 'Document visible to community members.',
      public: 'Document visible on the public site.',
    };
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'document_visibility_changed',
      targetType: 'document',
      targetId: doc.id,
      metadata: { title: doc.title, from: doc.visibility, to: newVisibility },
    });
    toast.success(messages[newVisibility]);
    onDeleted();
  }

  async function handleRename(docId: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('documents')
      .update({ title: trimmed })
      .eq('id', docId);

    setEditingId(null);

    if (error) {
      toast.error('Failed to rename document.');
      return;
    }

    const doc = documents.find((d) => d.id === docId);
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'document_renamed',
      targetType: 'document',
      targetId: docId,
      metadata: { old_title: doc?.title, new_title: trimmed },
    });
    toast.success('Document renamed.');
    onDeleted();
  }

  async function handleDownload(doc: Document) {
    if (!doc.file_path) return; // e-signed agreements have no file
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

    // Only delete from storage if there's a physical file
    if (doc.file_path) {
      const { error: storageError } = await supabase.storage
        .from('hoa-documents')
        .remove([doc.file_path]);

      if (storageError) {
        setDeletingId(null);
        toast.error('Failed to delete the file. Please try again.');
        return;
      }
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

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'document_deleted',
      targetType: 'document',
      targetId: doc.id,
      metadata: { title: doc.title },
    });
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

  if (displayDocuments.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        {searchQuery ? 'No documents match your search.' : 'No documents in this folder.'}
      </p>
    );
  }

  function handleView(doc: Document) {
    if (doc.signed_agreement_id) {
      // E-signed agreement: look up reservation_id via the signed_agreement_id
      // For simplicity, open the agreement viewer using a query
      setViewingAgreementId(doc.signed_agreement_id);
    } else {
      setViewingDoc(doc);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {displayDocuments.map((doc) => (
          <DraggableDocumentRow
            key={doc.id}
            doc={doc}
            folderName={doc.folder_id ? (folderMap.get(doc.folder_id) ?? null) : null}
            isDragEnabled={isDragEnabled && !searchQuery}
            onView={() => handleView(doc)}
            onDownload={() => handleDownload(doc)}
            onDelete={() => handleDelete(doc)}
            onVisibilityChange={(v) => handleVisibilityChange(doc, v)}
            onMove={() => setMovingDoc(doc)}
            isBoard={isBoard}
            isDeleting={deletingId === doc.id}
            isDownloading={downloadingId === doc.id}
            hasFolders={folders.length > 0}
            isEditing={editingId === doc.id}
            editTitle={editingId === doc.id ? editTitle : doc.title}
            onEditStart={() => {
              setEditingId(doc.id);
              setEditTitle(doc.title);
            }}
            onEditChange={setEditTitle}
            onEditSave={() => handleRename(doc.id, editTitle)}
            onEditCancel={() => setEditingId(null)}
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

      {viewingAgreementId && (
        <SignedAgreementViewer
          open={!!viewingAgreementId}
          onOpenChange={(isOpen) => { if (!isOpen) setViewingAgreementId(null); }}
          agreementId={viewingAgreementId}
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
