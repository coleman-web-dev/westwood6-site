'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2, Shield, ImagePlus, Paperclip, FileText, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import {
  postViolationResponse,
  deleteViolationResponse,
} from '@/lib/actions/violation-response-actions';
import type { ViolationResponse } from '@/lib/types/database';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

interface ViolationResponseThreadProps {
  violationId: string;
  communityId: string;
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
}

function getFileName(url: string): string {
  try {
    const parts = url.split('/');
    const raw = parts[parts.length - 1];
    // Strip timestamp prefix (e.g., "1710000000000_invoice.pdf" → "invoice.pdf")
    const match = raw.match(/^\d+_(.+)$/);
    return decodeURIComponent(match ? match[1] : raw);
  } catch {
    return 'attachment';
  }
}

export function ViolationResponseThread({
  violationId,
  communityId,
}: ViolationResponseThreadProps) {
  const { community, member, isBoard } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [responses, setResponses] = useState<ViolationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchResponses = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('violation_responses')
      .select(
        '*, author:members!posted_by(id, first_name, last_name, member_role, system_role)',
      )
      .eq('violation_id', violationId)
      .order('created_at', { ascending: true });

    setResponses((data as ViolationResponse[]) ?? []);
    setLoading(false);
  }, [violationId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10 MB limit.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_FILES);
      if (prev.length + valid.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed.`);
      }
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return [];

    const supabase = createClient();
    const urls: string[] = [];

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const filePath = `${communityId}/violations/responses/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage
        .from('hoa-documents')
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}.`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('hoa-documents')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  async function handleSubmit() {
    if (!body.trim() && files.length === 0) return;
    if (!member) return;

    setSubmitting(true);

    // Upload attachments first
    const attachmentUrls = await uploadFiles();

    const result = await postViolationResponse(
      communityId,
      violationId,
      body.trim() || (attachmentUrls.length > 0 ? '(attachment)' : ''),
      attachmentUrls,
    );

    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member.user_id,
      actorEmail: member.email,
      action: 'violation_response_created',
      targetType: 'violation',
      targetId: violationId,
    });

    setBody('');
    setFiles([]);
    fetchResponses();
  }

  async function handleDelete(response: ViolationResponse) {
    const confirmed = window.confirm('Delete this response?');
    if (!confirmed) return;

    const result = await deleteViolationResponse(communityId, response.id);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Response deleted.');
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'violation_response_deleted',
      targetType: 'violation',
      targetId: violationId,
      metadata: { response_id: response.id },
    });
    fetchResponses();
  }

  function isAuthor(authorId: string) {
    return member?.id === authorId;
  }

  function isBoardMember(role: string | undefined) {
    return role === 'board' || role === 'manager' || role === 'super_admin';
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-10 rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
        Responses{' '}
        {responses.length > 0 && (
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark font-normal">
            ({responses.length})
          </span>
        )}
      </h4>

      {responses.length > 0 && (
        <div className="space-y-2">
          {responses.map((response) => (
            <div
              key={response.id}
              className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate">
                    {response.author
                      ? `${response.author.first_name} ${response.author.last_name}`
                      : 'Unknown'}
                  </span>
                  {isBoardMember(response.author?.system_role) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 shrink-0 border-secondary-400 text-secondary-400"
                    >
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      Board
                    </Badge>
                  )}
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
                    {formatDistanceToNow(new Date(response.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {(isBoard || isAuthor(response.posted_by)) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(response)}
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Delete response</span>
                  </Button>
                )}
              </div>

              {response.body && response.body !== '(attachment)' && (
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1 whitespace-pre-line">
                  {response.body}
                </p>
              )}

              {/* Attachments */}
              {response.attachment_urls && response.attachment_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {response.attachment_urls.map((url, i) =>
                    isImageUrl(url) ? (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-16 w-16 rounded-lg overflow-hidden border border-stroke-light dark:border-stroke-dark hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-stroke-light dark:border-stroke-dark text-body text-text-secondary-light dark:text-text-secondary-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">
                          {getFileName(url)}
                        </span>
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {responses.length === 0 && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          No responses yet.
        </p>
      )}

      {/* Compose area */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write a response..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="resize-none text-body"
          rows={2}
        />

        {/* File preview strip */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-light-2 dark:bg-surface-dark-2 border border-stroke-light dark:border-stroke-dark"
              >
                {file.type.startsWith('image/')
                  ? <ImagePlus className="h-3 w-3 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                  : <FileText className="h-3 w-3 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                }
                <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark truncate max-w-[100px]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-text-muted-light dark:text-text-muted-dark hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_FILES}
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach file</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark flex-1">
            Images, PDFs, or documents (max {MAX_FILES}, 10 MB each)
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (!body.trim() && files.length === 0)}
            size="sm"
          >
            {submitting ? 'Posting...' : 'Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
