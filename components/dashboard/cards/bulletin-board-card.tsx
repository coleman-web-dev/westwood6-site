'use client';

import { useEffect, useState } from 'react';
import { Pin, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import type { BulletinPost } from '@/lib/types/database';

export function BulletinBoardCard() {
  const { community } = useCommunity();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('bulletin_posts')
        .select('*, author:members!posted_by(id, first_name, last_name, member_role), bulletin_comments(count)')
        .eq('community_id', community.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      setPosts((data as BulletinPost[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Bulletin Board">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-5 rounded bg-muted" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => {
            const commentCount = (post as { bulletin_comments?: { count: number }[] }).bulletin_comments?.[0]?.count ?? 0;

            return (
              <li key={post.id} className="flex items-start gap-2">
                {post.is_pinned && (
                  <Pin className="h-3.5 w-3.5 text-secondary-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium truncate">{post.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Unknown'}
                    </p>
                    {commentCount > 0 && (
                      <span className="flex items-center gap-0.5 text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {commentCount}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCardShell>
  );
}
