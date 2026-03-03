'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterActions } from '@shipixen/kbar';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { searchLinks } from '@/data/config/searchLinks';
import type { Announcement, Document as DocType } from '@/lib/types/database';

export function SearchProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { community, isBoard, member } = useCommunity();
  const basePath = `/${community.slug}`;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);

  // Fetch community data for dynamic actions
  useEffect(() => {
    const supabase = createClient();

    supabase
      .from('announcements')
      .select('id, title')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setAnnouncements((data as Announcement[]) || []));

    supabase
      .from('documents')
      .select('id, title')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setDocuments((data as DocType[]) || []));
  }, [community.id]);

  // Build actions
  const actions = useMemo(() => {
    // Static nav actions with community slug prefix
    const navActions = searchLinks.map((link) => ({
      id: `nav-${link.id}`,
      name: link.name,
      keywords: link.keywords,
      section: link.section,
      perform: () => router.push(`${basePath}${link.href}`),
    }));

    // Dynamic announcement actions
    const announcementActions = announcements.map((a) => ({
      id: `announcement-${a.id}`,
      name: a.title,
      keywords: 'announcement news',
      section: 'Announcements',
      perform: () => router.push(`${basePath}/announcements`),
    }));

    // Dynamic document actions
    const documentActions = documents.map((d) => ({
      id: `document-${d.id}`,
      name: d.title,
      keywords: 'document file',
      section: 'Documents',
      perform: () => router.push(`${basePath}/documents`),
    }));

    return [...navActions, ...announcementActions, ...documentActions];
  }, [basePath, router, announcements, documents]);

  useRegisterActions(actions, [actions]);

  return <>{children}</>;
}
