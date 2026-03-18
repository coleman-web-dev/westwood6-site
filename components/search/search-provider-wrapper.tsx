'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterActions } from '@shipixen/kbar';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { searchLinks } from '@/data/config/searchLinks';
import type { Announcement, Document as DocType } from '@/lib/types/database';

interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  member_role: string;
  system_role: string;
  units: { unit_number: string; address: string | null } | null;
}

interface UnitRow {
  id: string;
  unit_number: string;
  address: string | null;
  status: string;
}

export function SearchProviderWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { community, isBoard } = useCommunity();
  const basePath = `/${community.slug}`;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);

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

    // Fetch members with their unit info
    supabase
      .from('members')
      .select('id, first_name, last_name, email, phone, member_role, system_role, units(unit_number, address)')
      .eq('community_id', community.id)
      .eq('is_approved', true)
      .order('last_name', { ascending: true })
      .then(({ data }) => setMembers((data as MemberRow[]) || []));

    // Fetch units
    supabase
      .from('units')
      .select('id, unit_number, address, status')
      .eq('community_id', community.id)
      .order('unit_number', { ascending: true })
      .then(({ data }) => setUnits((data as UnitRow[]) || []));
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

    // Member actions - searchable by name, email, unit number, address
    const memberActions = members.map((m) => {
      const name = `${m.first_name} ${m.last_name}`;
      const unitInfo = m.units ? `Lot ${m.units.unit_number}` : '';
      const keywords = [
        'member resident',
        m.email ?? '',
        m.phone ?? '',
        m.units?.unit_number ?? '',
        m.units?.address ?? '',
        m.member_role,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        id: `member-${m.id}`,
        name: unitInfo ? `${name} (${unitInfo})` : name,
        keywords,
        section: 'Members',
        subtitle: m.email ?? undefined,
        perform: () => router.push(`${basePath}/household`),
      };
    });

    // Unit / lot actions - searchable by lot number and address
    const unitActions = units.map((u) => {
      const name = u.address
        ? `Lot ${u.unit_number} - ${u.address}`
        : `Lot ${u.unit_number}`;
      const keywords = [
        'lot unit address home',
        u.unit_number,
        u.address ?? '',
        u.status,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        id: `unit-${u.id}`,
        name,
        keywords,
        section: 'Lots',
        perform: () =>
          isBoard
            ? router.push(`${basePath}/household?unit=${u.unit_number}`)
            : router.push(`${basePath}/household`),
      };
    });

    return [
      ...navActions,
      ...memberActions,
      ...unitActions,
      ...announcementActions,
      ...documentActions,
    ];
  }, [basePath, router, announcements, documents, members, units, isBoard]);

  useRegisterActions(actions, [actions]);

  return <>{children}</>;
}
