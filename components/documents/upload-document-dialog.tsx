'use client';

import { useRef, useState, useMemo } from 'react';
import { Upload, Lock, Users, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { DocumentFolder, DocVisibility } from '@/lib/types/database';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  folders?: DocumentFolder[];
}

const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.ppt,.pptx,.jpg,.jpeg,.png';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function titleFromFilename(filename: string): string {
  // Remove extension and replace separators with spaces
  const name = filename.replace(/\.[^.]+$/, '');
  return name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  folders = [],
}: UploadDocumentDialogProps) {
  const { community, member } = useCommunity();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [visibility, setVisibility] = useState<DocVisibility>('community');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [fileCount, setFileCount] = useState(0);

  // Default to "Other" root folder if available
  const defaultFolderId =
    folders.find((f) => f.name === 'Other' && f.parent_id === null)?.id ??
    folders.find((f) => f.parent_id === null)?.id ??
    '';

  // Build tree-ordered list for the folder selector
  const treeOrderedFolders = useMemo(() => {
    const root = folders
      .filter((f) => f.parent_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    const result: { folder: DocumentFolder; depth: number }[] = [];
    for (const r of root) {
      result.push({ folder: r, depth: 0 });
      const children = folders
        .filter((f) => f.parent_id === r.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const c of children) {
        result.push({ folder: c, depth: 1 });
      }
    }
    return result;
  }, [folders]);

  function resetForm() {
    setTitle('');
    setFolderId('');
    setVisibility('community');
    setFileCount(0);
    setProgress('');
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  function handleFileChange() {
    const files = fileRef.current?.files;
    setFileCount(files?.length ?? 0);
  }

  async function handleSubmit() {
    const files = fileRef.current?.files;

    if (!files || files.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }

    const selectedFolder = folderId || defaultFolderId;
    if (!selectedFolder) {
      toast.error('Please select a folder.');
      return;
    }

    // For single file, require a title
    if (files.length === 1 && !title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    // Check all file sizes up front
    const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(
        `${oversized.length} file${oversized.length > 1 ? 's exceed' : ' exceeds'} the 50 MB limit.`
      );
      return;
    }

    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();
    const totalFiles = files.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      setProgress(totalFiles > 1 ? `Uploading ${i + 1} of ${totalFiles}...` : 'Uploading...');

      // Sanitize filename to prevent path traversal
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
      const filePath = `${community.id}/${Date.now()}_${safeName}`;

      // Determine title: use provided title for single file, filename-derived for batch
      const docTitle =
        totalFiles === 1 && title.trim()
          ? title.trim()
          : titleFromFilename(file.name);

      const { error: uploadError } = await supabase.storage
        .from('hoa-documents')
        .upload(filePath, file);

      if (uploadError) {
        failCount++;
        continue;
      }

      const { error: insertError } = await supabase.from('documents').insert({
        community_id: community.id,
        title: docTitle,
        category: 'other',
        folder_id: selectedFolder,
        file_path: filePath,
        file_size: file.size,
        visibility,
        is_public: visibility === 'public',
        uploaded_by: member.id,
      });

      if (insertError) {
        // Attempt to clean up the uploaded file
        await supabase.storage.from('hoa-documents').remove([filePath]);
        failCount++;
        continue;
      }

      successCount++;
    }

    setSubmitting(false);
    setProgress('');

    if (failCount > 0 && successCount > 0) {
      toast.warning(
        `${successCount} document${successCount > 1 ? 's' : ''} uploaded. ${failCount} failed.`
      );
    } else if (failCount > 0 && successCount === 0) {
      toast.error('Failed to upload. Please try again.');
      return;
    } else {
      toast.success(
        totalFiles === 1
          ? 'Document uploaded.'
          : `${successCount} documents uploaded.`
      );
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  const isMultiple = fileCount > 1;
  const canSubmit = submitting
    ? false
    : fileCount > 0 && (isMultiple || title.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document{isMultiple ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Add document{isMultiple ? 's' : ''} for community members to access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title{isMultiple ? ' (optional for multiple files)' : ''}
            </label>
            <Input
              placeholder={isMultiple ? 'Leave blank to use file names' : 'Document title'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Folder
            </label>
            <Select
              value={folderId || defaultFolderId}
              onValueChange={setFolderId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                {treeOrderedFolders.map(({ folder, depth }) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {depth > 0 ? `\u2514 ${folder.name}` : folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Visibility
            </label>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(v as DocVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Private (board only)
                  </span>
                </SelectItem>
                <SelectItem value="community">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Community members
                  </span>
                </SelectItem>
                <SelectItem value="public">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Public (landing page)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              File{isMultiple ? `s (${fileCount} selected)` : ''}
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              className="block w-full text-sm text-text-secondary-light dark:text-text-secondary-dark file:mr-3 file:rounded-md file:border-0 file:bg-primary-300 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary-300/80 dark:file:bg-primary-700 dark:hover:file:bg-primary-700/80 cursor-pointer"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <>{progress || 'Uploading...'}</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload{isMultiple ? ` ${fileCount} Files` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
