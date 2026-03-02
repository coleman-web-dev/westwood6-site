'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { MemberList } from '@/components/household/member-list';
import { AddMemberDialog } from '@/components/household/add-member-dialog';
import { Home } from 'lucide-react';
import type { Member } from '@/lib/types/database';

export default function HouseholdPage() {
  const { community, member, unit, householdMembers, isHeadOfHousehold, isBoard } =
    useCommunity();

  const [members, setMembers] = useState<Member[]>(householdMembers);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const canManage = isHeadOfHousehold || isBoard;

  const fetchMembers = useCallback(async () => {
    if (!unit) return;

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('unit_id', unit.id)
      .eq('community_id', community.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMembers(data as Member[]);
    }

    setLoading(false);
  }, [unit, community.id]);

  // Sync from context on mount
  useEffect(() => {
    setMembers(householdMembers);
  }, [householdMembers]);

  function handleMemberAdded() {
    fetchMembers();
  }

  function handleMemberRemoved() {
    fetchMembers();
  }

  // No unit assigned
  if (!unit) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Household
        </h1>
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-12">
          <Home className="h-10 w-10 mx-auto mb-3 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            You are not assigned to a unit yet.
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
            Please contact your community manager to get assigned to a unit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
        Household
      </h1>

      {/* Unit info card */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-100 dark:bg-primary-900/30 p-2.5 shrink-0">
            <Home className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              Unit {unit.unit_number}
            </h2>
            {unit.address && (
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                {unit.address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Member list */}
      <MemberList
        members={members}
        loading={loading}
        canManage={canManage}
        currentMemberId={member?.id ?? ''}
        onAddClick={() => setAddDialogOpen(true)}
        onMemberRemoved={handleMemberRemoved}
      />

      {/* Add member dialog */}
      {canManage && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleMemberAdded}
        />
      )}
    </div>
  );
}
