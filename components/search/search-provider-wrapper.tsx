'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterActions } from '@shipixen/kbar';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { searchLinks } from '@/data/config/searchLinks';
import type { Announcement, Document as DocType } from '@/lib/types/database';

interface MemberRow {
  id: string;
  unit_id: string | null;
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
  const { community, actualIsBoard, viewMode, isTenant } = useCommunity();
  const isAdminView = actualIsBoard && viewMode === 'admin';
  const basePath = `/${community.slug}`;

  // KBar's execute() calls query.toggle() immediately after perform(),
  // which triggers a React state update that can cancel pending navigation.
  // setTimeout ensures navigation runs after KBar's re-render completes.
  const navigate = useCallback((path: string) => {
    setTimeout(() => {
      router.push(path);
    }, 10);
  }, [router]);

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

    // Fetch members with their unit info (exclude platform admins with no unit)
    supabase
      .from('members')
      .select('id, unit_id, first_name, last_name, email, phone, member_role, system_role, units(unit_number, address)')
      .eq('community_id', community.id)
      .eq('is_approved', true)
      .not('unit_id', 'is', null)
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
    // IDs hidden from tenants (financial + voting features)
    const TENANT_HIDDEN = new Set(['payments', 'voting', 'budget', 'reports', 'import-ledger']);

    // Static nav actions with community slug prefix
    const navActions = searchLinks
      .filter((link) => !(isTenant && TENANT_HIDDEN.has(link.id)))
      .map((link) => ({
        id: `nav-${link.id}`,
        name: link.name,
        keywords: link.keywords,
        section: link.section,
        perform: () => navigate(`${basePath}${link.href}`),
      }));

    // Dynamic announcement actions
    const announcementActions = announcements.map((a) => ({
      id: `announcement-${a.id}`,
      name: a.title,
      keywords: 'announcement news',
      section: 'Announcements',
      perform: () => navigate(`${basePath}/announcements`),
    }));

    // Dynamic document actions
    const documentActions = documents.map((d) => ({
      id: `document-${d.id}`,
      name: d.title,
      keywords: 'document file',
      section: 'Documents',
      perform: () => navigate(`${basePath}/documents`),
    }));

    // Member actions - only visible to board in admin view
    const memberActions = !isAdminView ? [] : members.map((m) => {
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
        perform: () => {
          if (actualIsBoard && m.unit_id) {
            navigate(`${basePath}/household?unit=${m.unit_id}`);
          } else {
            navigate(`${basePath}/directory`);
          }
        },
      };
    });

    // Unit / lot actions - only visible to board in admin view
    const unitActions = !isAdminView ? [] : units.map((u) => {
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
          actualIsBoard
            ? navigate(`${basePath}/household?unit=${u.id}`)
            : navigate(`${basePath}/household`),
      };
    });

    return [
      ...navActions,
      ...memberActions,
      ...unitActions,
      ...announcementActions,
      ...documentActions,
    ];
  }, [basePath, navigate, announcements, documents, members, units, actualIsBoard, isAdminView, isTenant]);

  useRegisterActions(actions, [actions]);

  return <>{children}</>;
}
