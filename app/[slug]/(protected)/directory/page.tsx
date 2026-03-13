'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { MemberCard } from '@/components/directory/member-card';
import { ExportCsvButton } from '@/components/documents/export-csv-button';
import type { CsvColumn } from '@/lib/utils/export-csv';
import type { Member, DocumentFolder } from '@/lib/types/database';

type DirectoryMember = Member & { unit: { unit_number: string } | null };

const memberColumns: CsvColumn<DirectoryMember>[] = [
  { header: 'First Name', value: (m) => m.first_name },
  { header: 'Last Name', value: (m) => m.last_name },
  { header: 'Role', value: (m) => m.member_role },
  { header: 'System Role', value: (m) => m.system_role },
  { header: 'Unit Number', value: (m) => m.unit?.unit_number ?? '' },
  { header: 'Email', value: (m) => m.email },
  { header: 'Phone', value: (m) => m.phone },
];

export default function DirectoryPage() {
  const { community, member, isBoard } = useCommunity();
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canView = isBoard || community.tenant_permissions?.can_view_directory;

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    async function fetchMembers() {
      const supabase = createClient();

      let query = supabase
        .from('members')
        .select('*, unit:units(unit_number)')
        .eq('community_id', community.id)
        .eq('is_approved', true)
        .order('last_name', { ascending: true });

      if (!isBoard) {
        query = query.eq('show_in_directory', true);
      }

      const { data } = await query;
      setMembers((data as DirectoryMember[]) ?? []);
      setLoading(false);
    }

    fetchMembers();
  }, [community.id, isBoard, canView]);

  const fetchFolders = useCallback(async () => {
    if (!isBoard) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('document_folders')
      .select('*')
      .eq('community_id', community.id)
      .order('name', { ascending: true });
    setFolders((data as DocumentFolder[]) ?? []);
  }, [community.id, isBoard]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => {
      const name = `${m.first_name} ${m.last_name}`.toLowerCase();
      const unitNum = m.unit?.unit_number?.toLowerCase() ?? '';
      return name.includes(q) || unitNum.includes(q);
    });
  }, [members, search]);

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          The member directory is not available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Directory
        </h1>
        {isBoard && members.length > 0 && member && (
          <ExportCsvButton
            filename="member-directory.csv"
            getData={() => members}
            columns={memberColumns}
            saveConfig={{
              communityId: community.id,
              memberId: member.id,
              folders,
            }}
          />
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
        <input
          type="text"
          placeholder="Search by name or unit number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-secondary-400/40"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-grid-gap grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
            >
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-3 w-48 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-8">
          {search ? 'No members match your search.' : 'No members found.'}
        </p>
      ) : (
        <div className="grid gap-grid-gap grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}
