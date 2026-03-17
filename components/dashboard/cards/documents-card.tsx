'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { FileText } from 'lucide-react';
import type { Document } from '@/lib/types/database';

export function DocumentsCard() {
  const { community } = useCommunity();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setDocuments((data as Document[]) ?? []);
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Documents">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <FileText className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No documents yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {documents.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/${community.slug}/documents`}
                  className="flex items-start justify-between gap-2 group"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium truncate group-hover:text-secondary-500 dark:group-hover:text-secondary-400 transition-colors">{d.title}</p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-meta shrink-0 capitalize">
                    {d.category.replace('_', ' ')}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/${community.slug}/documents`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View all documents
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
