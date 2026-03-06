'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadSignature, deleteSignature, getSignature } from '@/lib/actions/check-actions';
import { Button } from '@/components/shared/ui/button';
import { Loader2, Upload, Trash2, PenLine } from 'lucide-react';
import { toast } from 'sonner';

interface SignatureUploadProps {
  communityId: string;
  memberId: string;
  memberName: string;
}

export function SignatureUpload({ communityId, memberId, memberName }: SignatureUploadProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSignature() {
      setLoading(true);
      const sig = await getSignature(communityId, memberId);
      if (sig?.file_path) {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from('hoa-documents')
          .createSignedUrl(sig.file_path, 3600);
        setSignatureUrl(data?.signedUrl || null);
      } else {
        setSignatureUrl(null);
      }
      setLoading(false);
    }
    fetchSignature();
  }, [communityId, memberId]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be under 2MB.');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${communityId}/signatures/${memberId}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload signature.');
      setUploading(false);
      return;
    }

    // Save to database
    const result = await uploadSignature(communityId, memberId, filePath);
    setUploading(false);

    if (result.success) {
      // Get signed URL for display
      const { data } = await supabase.storage
        .from('hoa-documents')
        .createSignedUrl(filePath, 3600);
      setSignatureUrl(data?.signedUrl || null);
      toast.success('Signature uploaded.');
    } else {
      toast.error(result.error || 'Failed to save signature.');
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSignature(communityId, memberId);
    setDeleting(false);

    if (result.success) {
      setSignatureUrl(null);
      toast.success('Signature removed.');
    } else {
      toast.error(result.error || 'Failed to remove signature.');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  if (loading) {
    return (
      <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4">
        <div className="animate-pulse h-20 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
          <span className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            {memberName}&apos;s Signature
          </span>
        </div>
        {signatureUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-600"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {signatureUrl ? (
        <div className="flex items-center justify-center bg-white rounded-lg p-4 border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signatureUrl}
            alt="Signature"
            className="max-h-16 object-contain"
          />
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center border-2 border-dashed border-stroke-light dark:border-stroke-dark rounded-lg p-6 cursor-pointer hover:border-primary-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-text-muted-light dark:text-text-muted-dark mb-2" />
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                Drop signature image or click to upload
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                PNG or JPG, max 2MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />

      {signatureUrl && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1" />
          )}
          Replace Signature
        </Button>
      )}
    </div>
  );
}
