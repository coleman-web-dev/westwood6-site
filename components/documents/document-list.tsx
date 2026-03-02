'use client';

import { useState } from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import type { Document, DocCategory } from '@/lib/types/database';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDeleted: () => void;
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  rules: 'Rules',
  financial: 'Financial',
  meeting_minutes: 'Meeting Minutes',
  forms: 'Forms',
  other: 'Other',
};

const CATEGORY_BADGE_VARIANT: Record<DocCategory, 'default' | 'secondary' | 'outline'> = {
  rules: 'secondary',
  financial: 'default',
  meeting_minutes: 'outline',
  forms: 'secondary',
  other: 'outline',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, loading, onDeleted }: DocumentListProps) {
  const { isBoard } = useCommunity();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('hoa-documents')
      .remove([doc.file_path]);

    if (storageError) {
      setDeletingId(null);
      toast.error('Failed to delete the file. Please try again.');
      return;
    }

    // Delete row from database
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
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const isDeleting = deletingId === doc.id;
        const isDownloading = downloadingId === doc.id;

        return (
          <div
            key={doc.id}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
          >
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
                <Badge
                  variant={CATEGORY_BADGE_VARIANT[doc.category]}
                  className="text-meta shrink-0"
                >
                  {CATEGORY_LABELS[doc.category]}
                </Badge>
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
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(doc)}
                disabled={isDownloading}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </Button>

              {isBoard && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc)}
                  disabled={isDeleting}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
