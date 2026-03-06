'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  ShieldCheck,
  ScrollText,
  Award,
  File,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { VendorDocument, VendorDocumentType } from '@/lib/types/database';

const DOC_TYPE_LABELS: Record<VendorDocumentType, string> = {
  contract: 'Contract',
  insurance_cert: 'Insurance Certificate',
  license: 'License',
  w9: 'W-9',
  check_image: 'Check Image',
  other: 'Other',
};

const DOC_TYPE_ICONS: Record<VendorDocumentType, React.ReactNode> = {
  contract: <ScrollText className="h-4 w-4" />,
  insurance_cert: <ShieldCheck className="h-4 w-4" />,
  license: <Award className="h-4 w-4" />,
  w9: <FileText className="h-4 w-4" />,
  check_image: <ImageIcon className="h-4 w-4" />,
  other: <File className="h-4 w-4" />,
};

interface VendorDocumentsSectionProps {
  vendorId: string;
  communityId: string;
  memberId: string;
  isBoard: boolean;
}

export function VendorDocumentsSection({
  vendorId,
  communityId,
  memberId,
  isBoard,
}: VendorDocumentsSectionProps) {
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<VendorDocumentType>('contract');
  const [uploadTitle, setUploadTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [vendorId]);

  async function loadDocuments() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vendor_documents')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load vendor documents:', error);
    }
    setDocuments(data ?? []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadTitle.trim()) {
      toast.error('Please enter a document title.');
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    const path = `${communityId}/vendor-docs/${vendorId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(path, file, { upsert: false });

    if (uploadError) {
      toast.error('Failed to upload file.');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const { error: insertError } = await supabase.from('vendor_documents').insert({
      vendor_id: vendorId,
      community_id: communityId,
      document_type: uploadType,
      title: uploadTitle.trim(),
      file_path: path,
      file_size: file.size,
      uploaded_by: memberId,
    });

    if (insertError) {
      toast.error('Failed to save document record.');
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    toast.success('Document uploaded.');
    setUploading(false);
    setShowUpload(false);
    setUploadTitle('');
    setUploadType('contract');
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadDocuments();
  }

  async function handleDownload(doc: VendorDocument) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(doc.file_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to generate download link.');
    }
  }

  async function handleDelete(doc: VendorDocument) {
    setDeleting(doc.id);
    const supabase = createClient();

    const { error: storageError } = await supabase.storage
      .from('hoa-documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('Failed to remove file from storage:', storageError);
    }

    const { error: dbError } = await supabase
      .from('vendor_documents')
      .delete()
      .eq('id', doc.id);

    if (dbError) {
      toast.error('Failed to delete document.');
      setDeleting(null);
      return;
    }

    toast.success('Document deleted.');
    setDeleting(null);
    loadDocuments();
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark cursor-pointer">
          Documents ({documents.length})
        </Label>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {loading ? (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-lg border border-stroke-light dark:border-stroke-dark p-2"
                >
                  <span className="text-text-secondary-light dark:text-text-secondary-dark shrink-0">
                    {DOC_TYPE_ICONS[doc.document_type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {doc.title}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {DOC_TYPE_LABELS[doc.document_type]}
                      {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                      {' · '}
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {isBoard && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-600"
                      disabled={deleting === doc.id}
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isBoard && !showUpload && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload Document
            </Button>
          )}

          {isBoard && showUpload && (
            <div className="space-y-2 rounded-lg border border-stroke-light dark:border-stroke-dark p-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    Type
                  </Label>
                  <Select
                    value={uploadType}
                    onValueChange={(v) => setUploadType(v as VendorDocumentType)}
                  >
                    <SelectTrigger className="h-8 text-body">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    Title
                  </Label>
                  <Input
                    className="h-8 text-body"
                    placeholder="Document title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !uploadTitle.trim()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? 'Uploading...' : 'Choose File'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowUpload(false);
                    setUploadTitle('');
                    setUploadType('contract');
                  }}
                >
                  Cancel
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
