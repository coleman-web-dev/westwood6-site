'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import type { Document } from '@/lib/types/database';

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
}

type ViewerType = 'pdf' | 'image' | 'text' | 'unsupported';

function getViewerType(filePath: string): ViewerType {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['txt', 'csv', 'md', 'rtf'].includes(ext)) return 'text';
  return 'unsupported';
}

export function DocumentViewerDialog({ open, onOpenChange, document: doc }: DocumentViewerDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const viewerType = getViewerType(doc.file_path);

  useEffect(() => {
    if (!open) {
      // Revoke blob URL to free memory
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setSignedUrl(null);
      setBlobUrl(null);
      setTextContent(null);
      setError(null);
      setLoading(true);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: urlError } = await supabase.storage
        .from('hoa-documents')
        .createSignedUrl(doc.file_path, 3600);

      if (urlError || !data?.signedUrl) {
        setError('Failed to load document.');
        setLoading(false);
        return;
      }

      setSignedUrl(data.signedUrl);

      // For PDFs, fetch as blob to avoid cross-origin iframe blocking
      if (viewerType === 'pdf') {
        try {
          const res = await fetch(data.signedUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        } catch {
          setError('Failed to load PDF.');
        }
      }

      // For text files, fetch the content
      if (viewerType === 'text') {
        try {
          const res = await fetch(data.signedUrl);
          const text = await res.text();
          setTextContent(text);
        } catch {
          setError('Failed to load file contents.');
        }
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doc.file_path, viewerType]);

  function handleDownload() {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden rounded-inner-card border border-stroke-light dark:border-stroke-dark">
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <FileText className="h-12 w-12 text-text-muted-light dark:text-text-muted-dark" />
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">{error}</p>
            </div>
          ) : viewerType === 'pdf' && blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-[60vh] border-0"
              title={doc.title}
            />
          ) : viewerType === 'image' && signedUrl ? (
            <div className="flex items-center justify-center h-[60vh] bg-black/5 dark:bg-white/5 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={doc.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : viewerType === 'text' && textContent != null ? (
            <ScrollArea className="h-[60vh]">
              <pre className="text-xs font-mono whitespace-pre-wrap p-4 text-text-primary-light dark:text-text-primary-dark">
                {textContent}
              </pre>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
              <FileText className="h-12 w-12 text-text-muted-light dark:text-text-muted-dark" />
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                Preview not available for this file type.
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {signedUrl && viewerType !== 'unsupported' && (
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
