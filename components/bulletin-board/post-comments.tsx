'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trash2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import type { BulletinComment } from '@/lib/types/database';

interface PostCommentsProps {
  postId: string;
  canComment: boolean;
}

export function PostComments({ postId, canComment }: PostCommentsProps) {
  const { community, member, isBoard } = useCommunity();
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('bulletin_comments')
      .select('*, author:members!posted_by(id, first_name, last_name, member_role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments((data as BulletinComment[]) ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit() {
    if (!body.trim() || !member) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('bulletin_comments').insert({
      post_id: postId,
      community_id: community.id,
      body: body.trim(),
      posted_by: member.id,
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to post comment. Please try again.');
      return;
    }

    setBody('');
    fetchComments();
  }

  async function handleDelete(comment: BulletinComment) {
    const confirmed = window.confirm('Delete this comment?');
    if (!confirmed) return;

    const supabase = createClient();

    const { error } = await supabase
      .from('bulletin_comments')
      .delete()
      .eq('id', comment.id);

    if (error) {
      toast.error('Failed to delete comment.');
      return;
    }

    toast.success('Comment deleted.');
    fetchComments();
  }

  function isAuthor(commentAuthorId: string) {
    return member?.id === commentAuthorId;
  }

  function isBoardMember(role: string | undefined) {
    return role === 'board' || role === 'manager' || role === 'super_admin';
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-10 rounded bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate">
                    {comment.author ? `${comment.author.first_name} ${comment.author.last_name}` : 'Unknown'}
                  </span>
                  {isBoardMember(comment.author?.member_role) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-secondary-400 text-secondary-400">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      Board
                    </Badge>
                  )}
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                {(isBoard || isAuthor(comment.posted_by)) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(comment)}
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="sr-only">Delete comment</span>
                  </Button>
                )}
              </div>
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1 whitespace-pre-line">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <div className="flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="resize-none text-body"
            rows={2}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
            className="shrink-0 self-end"
            size="sm"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      )}

      {!canComment && comments.length === 0 && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          No comments yet.
        </p>
      )}
    </div>
  );
}
