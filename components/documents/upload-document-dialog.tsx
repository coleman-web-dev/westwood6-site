'use client';

import { useRef, useState, useMemo } from 'react';
import { Upload } from 'lucide-react';
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
import type { DocumentFolder } from '@/lib/types/database';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  folders?: DocumentFolder[];
}

const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.ppt,.pptx,.jpg,.jpeg,.png';

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
  const [submitting, setSubmitting] = useState(false);

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
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];

    if (!title.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    const selectedFolder = folderId || defaultFolderId;
    if (!selectedFolder) {
      toast.error('Please select a folder.');
      return;
    }

    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    // Enforce 50 MB file size limit
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 50 MB.');
      return;
    }

    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();

    // Sanitize filename to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    const filePath = `${community.id}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, file);

    if (uploadError) {
      setSubmitting(false);
      toast.error('Failed to upload file. Please try again.');
      return;
    }

    // Insert document row (category set to 'other' for backward compat)
    const { error: insertError } = await supabase.from('documents').insert({
      community_id: community.id,
      title: title.trim(),
      category: 'other',
      folder_id: selectedFolder,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: member.id,
    });

    setSubmitting(false);

    if (insertError) {
      // Attempt to clean up the uploaded file
      await supabase.storage.from('hoa-documents').remove([filePath]);
      toast.error('Failed to save document record. Please try again.');
      return;
    }

    toast.success('Document uploaded.');
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a document for community members to access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title
            </label>
            <Input
              placeholder="Document title"
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
                    {depth > 0 ? `└ ${folder.name}` : folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
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
            disabled={submitting || !title.trim()}
          >
            {submitting ? (
              <>Uploading...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
