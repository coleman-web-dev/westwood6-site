'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pin, MessageCircle, MessagesSquare } from 'lucide-react';
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
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <MessagesSquare className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No posts yet.</p>
          <Link
            href={`/${community.slug}/bulletin-board`}
            className="text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            Start a conversation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {posts.map((post) => {
              const commentCount = (post as { bulletin_comments?: { count: number }[] }).bulletin_comments?.[0]?.count ?? 0;

              return (
                <li key={post.id}>
                  <Link
                    href={`/${community.slug}/bulletin-board`}
                    className="flex items-start gap-2 group"
                  >
                    {post.is_pinned && (
                      <Pin className="h-3.5 w-3.5 text-secondary-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">{post.title}</p>
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
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/${community.slug}/bulletin-board`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all posts
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
