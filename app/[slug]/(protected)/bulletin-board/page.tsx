'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { PostList } from '@/components/bulletin-board/post-list';
import { CreatePostDialog } from '@/components/bulletin-board/create-post-dialog';
import type { BulletinPost } from '@/lib/types/database';

export default function BulletinBoardPage() {
  const { community, isBoard } = useCommunity();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BulletinPost | null>(null);

  const bulletinSettings = community.theme?.bulletin_settings;
  const canPost = isBoard || bulletinSettings?.posting === 'all_households';
  const canComment = isBoard || bulletinSettings?.commenting === 'all_households';

  const fetchPosts = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('bulletin_posts')
      .select('*, author:members!posted_by(id, first_name, last_name, member_role), bulletin_comments(count)')
      .eq('community_id', community.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    setPosts((data as BulletinPost[]) ?? []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  function handleCreate() {
    setEditingPost(null);
    setDialogOpen(true);
  }

  function handleEdit(post: BulletinPost) {
    setEditingPost(post);
    setDialogOpen(true);
  }

  function handleDialogSuccess() {
    fetchPosts();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Bulletin Board
        </h1>
        {canPost && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        )}
      </div>

      <PostList
        posts={posts}
        loading={loading}
        canComment={canComment}
        onEdit={handleEdit}
        onRefresh={fetchPosts}
      />

      <CreatePostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
        editPost={editingPost}
      />
    </div>
  );
}
