'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { FileText, Upload, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HouseholdDocument } from '@/lib/types/database';

interface HouseholdDocumentsProps {
  unitId: string;
}

export function HouseholdDocuments({ unitId }: HouseholdDocumentsProps) {
  const { community, member, isBoard } = useCommunity();
  const [documents, setDocuments] = useState<HouseholdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('household_documents')
      .select('*')
      .eq('unit_id', unitId)
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocuments((data as HouseholdDocument[]) ?? []);
        setLoading(false);
      });
  }, [unitId, community.id]);

  async function handleUpload() {
    if (!file || !title.trim() || !member) return;

    setUploading(true);
    const supabase = createClient();

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${community.id}/household/${unitId}/${timestamp}_${safeName}`;

    const { error: storageError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, file);

    if (storageError) {
      setUploading(false);
      toast.error('Failed to upload file.');
      return;
    }

    const { data, error } = await supabase
      .from('household_documents')
      .insert({
        community_id: community.id,
        unit_id: unitId,
        title: title.trim(),
        file_path: filePath,
        file_type: file.type,
        uploaded_by: member.id,
      })
      .select()
      .single();

    setUploading(false);

    if (error) {
      toast.error('Failed to save document record.');
      return;
    }

    setDocuments((prev) => [data as HouseholdDocument, ...prev]);
    setTitle('');
    setFile(null);
    setUploadOpen(false);
    toast.success('Document uploaded.');
  }

  async function handleDelete(doc: HouseholdDocument) {
    const supabase = createClient();
    // Delete storage file
    await supabase.storage.from('hoa-documents').remove([doc.file_path]);
    // Delete record
    const { error } = await supabase
      .from('household_documents')
      .delete()
      .eq('id', doc.id);

    if (error) {
      toast.error('Failed to delete document.');
      return;
    }

    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success('Document deleted.');
  }

  async function handleView(doc: HouseholdDocument) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(doc.file_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to open document.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Household Documents
        </h3>
        {isBoard && (
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-10 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No documents uploaded for this household.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-3 py-2 px-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark"
            >
              <FileText className="h-4 w-4 shrink-0 text-text-muted-light dark:text-text-muted-dark" />
              <div className="flex-1 min-w-0">
                <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                  {doc.title}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {format(new Date(doc.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleView(doc)}
                  className="p-1.5 rounded text-text-secondary-light dark:text-text-secondary-dark hover:text-secondary-500 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                {isBoard && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-1.5 rounded text-text-muted-light dark:text-text-muted-dark hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Title *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                File *
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-meta text-text-secondary-light dark:text-text-secondary-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-inner-card file:border-0 file:text-meta file:bg-surface-light-2 dark:file:bg-surface-dark-2 file:text-text-primary-light dark:file:text-text-primary-dark hover:file:bg-surface-light dark:hover:file:bg-surface-dark file:cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpload} disabled={uploading || !title.trim() || !file}>
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
