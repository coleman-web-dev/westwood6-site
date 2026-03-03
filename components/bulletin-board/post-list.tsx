'use client';

import { useState } from 'react';
import { Pencil, Trash2, Pin, PinOff, ChevronDown, ChevronUp, MessageCircle, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { PostComments } from './post-comments';
import { toast } from 'sonner';
import type { BulletinPost } from '@/lib/types/database';

interface PostListProps {
  posts: BulletinPost[];
  loading: boolean;
  canComment: boolean;
  onEdit: (post: BulletinPost) => void;
  onRefresh: () => void;
}

export function PostList({
  posts,
  loading,
  canComment,
  onEdit,
  onRefresh,
}: PostListProps) {
  const { member, isBoard } = useCommunity();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function isAuthor(postAuthorId: string) {
    return member?.id === postAuthorId;
  }

  function isBoardMember(role: string | undefined) {
    return role === 'board' || role === 'manager' || role === 'super_admin';
  }

  async function handleDelete(post: BulletinPost) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${post.title}"? This will also delete all comments. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(post.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('bulletin_posts')
      .delete()
      .eq('id', post.id);

    setDeletingId(null);

    if (error) {
      toast.error('Failed to delete post. Please try again.');
      return;
    }

    toast.success('Post deleted.');
    onRefresh();
  }

  async function togglePin(post: BulletinPost) {
    const supabase = createClient();

    const { error } = await supabase
      .from('bulletin_posts')
      .update({ is_pinned: !post.is_pinned })
      .eq('id', post.id);

    if (error) {
      toast.error('Failed to update pin status.');
      return;
    }

    toast.success(post.is_pinned ? 'Post unpinned.' : 'Post pinned.');
    onRefresh();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No posts yet. Be the first to share something with the community.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const isExpanded = expandedId === post.id;
        const isDeleting = deletingId === post.id;
        const commentCount = (post as { bulletin_comments?: { count: number }[] }).bulletin_comments?.[0]?.count ?? 0;

        return (
          <div
            key={post.id}
            className={`rounded-panel border bg-surface-light dark:bg-surface-dark p-card-padding ${
              post.is_pinned
                ? 'border-secondary-300 dark:border-secondary-700'
                : 'border-stroke-light dark:border-stroke-dark'
            }`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="flex items-start gap-3 text-left min-w-0 flex-1"
                onClick={() => toggleExpand(post.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.is_pinned && (
                      <Pin className="h-3.5 w-3.5 text-secondary-500 shrink-0" />
                    )}
                    <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                      {post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Unknown'}
                    </span>
                    {isBoardMember(post.author?.member_role) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-secondary-400 text-secondary-400">
                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                        Board
                      </Badge>
                    )}
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                    {commentCount > 0 && (
                      <span className="flex items-center gap-1 text-meta text-text-muted-light dark:text-text-muted-dark">
                        <MessageCircle className="h-3 w-3" />
                        {commentCount}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 mt-1 text-text-muted-light dark:text-text-muted-dark">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {/* Action buttons */}
              {(isBoard || isAuthor(post.posted_by)) && (
                <div className="flex items-center gap-1 shrink-0">
                  {isBoard && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePin(post)}
                      className="h-8 w-8"
                      title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                    >
                      {post.is_pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                      <span className="sr-only">{post.is_pinned ? 'Unpin' : 'Pin'}</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(post)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(post)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Expandable body + comments */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark whitespace-pre-line">
                  {post.body}
                </p>

                <div className="mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                  <h4 className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    Comments
                  </h4>
                  <PostComments postId={post.id} canComment={canComment} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
