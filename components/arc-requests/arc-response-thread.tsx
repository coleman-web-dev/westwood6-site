'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Trash2, Shield, Paperclip, FileText, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import {
  postArcResponse,
  deleteArcResponse,
} from '@/lib/actions/arc-response-actions';
import type { ArcResponse } from '@/lib/types/database';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

interface ArcResponseThreadProps {
  arcRequestId: string;
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
    const match = raw.match(/^\d+_(.+)$/);
    return decodeURIComponent(match ? match[1] : raw);
  } catch {
    return 'attachment';
  }
}

export function ArcResponseThread({
  arcRequestId,
  communityId,
}: ArcResponseThreadProps) {
  const { community, member, isBoard } = useCommunity();
  const [responses, setResponses] = useState<ArcResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResponses = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('arc_responses')
      .select('*, author:members!arc_responses_posted_by_fkey(id, first_name, last_name, member_role, system_role)')
      .eq('arc_request_id', arcRequestId)
      .eq('community_id', communityId)
      .order('created_at', { ascending: true });

    setResponses((data as ArcResponse[]) ?? []);
    setLoading(false);
  }, [arcRequestId, communityId]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 10MB limit.`);
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

  async function uploadFiles(): Promise<string[]> {
    if (files.length === 0) return [];
    const supabase = createClient();
    const urls: string[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${communityId}/arc-requests/responses/${timestamp}_${safeName}`;

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

  async function handlePost() {
    if (!body.trim() && files.length === 0) return;
    setPosting(true);

    const attachmentUrls = await uploadFiles();

    const result = await postArcResponse(
      communityId,
      arcRequestId,
      body.trim() || (attachmentUrls.length > 0 ? '(attachment)' : ''),
      attachmentUrls,
    );

    setPosting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    logAuditEvent({
      communityId,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'arc_response_posted',
      targetType: 'arc_request',
      targetId: arcRequestId,
    });

    setBody('');
    setFiles([]);
    fetchResponses();
  }

  async function handleDelete(responseId: string) {
    const result = await deleteArcResponse(communityId, responseId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setResponses((prev) => prev.filter((r) => r.id !== responseId));
  }

  const isBoardRole = (role?: string) =>
    role === 'board' || role === 'manager' || role === 'super_admin';

  return (
    <div className="space-y-4">
      <h4 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
        Discussion
      </h4>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-12 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
          ))}
        </div>
      ) : responses.length === 0 ? (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          No responses yet. Start the conversation below.
        </p>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => {
            const authorIsBoard = isBoardRole(r.author?.system_role);
            const canDelete =
              isBoard || r.author?.id === member?.id;

            return (
              <div
                key={r.id}
                className="group rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-label font-medium text-text-primary-light dark:text-text-primary-dark">
                      {r.author
                        ? `${r.author.first_name} ${r.author.last_name}`
                        : 'Unknown'}
                    </span>
                    {authorIsBoard && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5 py-0">
                        <Shield className="h-2.5 w-2.5" />
                        Board
                      </Badge>
                    )}
                    <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted-light dark:text-text-muted-dark hover:text-red-500 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <p className="text-body text-text-primary-light dark:text-text-primary-dark mt-1 whitespace-pre-wrap break-words">
                  {r.body}
                </p>

                {r.attachment_urls && r.attachment_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.attachment_urls.map((url, i) =>
                      isImageUrl(url) ? (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded border border-stroke-light dark:border-stroke-dark overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={url}
                            alt="Attachment"
                            className="h-20 w-20 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 rounded border border-stroke-light dark:border-stroke-dark text-meta text-secondary-500 hover:text-secondary-400 transition-colors"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          {getFileName(url)}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Compose */}
      <div className="space-y-2 pt-2 border-t border-stroke-light dark:border-stroke-dark">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a response..."
          rows={3}
          className="resize-none"
        />

        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 text-meta text-text-secondary-light dark:text-text-secondary-dark bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card px-2 py-1"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-0.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_FILES}
          >
            <Paperclip className="h-3.5 w-3.5 mr-1" />
            Attach
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={handlePost}
            disabled={posting || (!body.trim() && files.length === 0)}
          >
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}
