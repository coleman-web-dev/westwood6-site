'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { MemberList } from '@/components/household/member-list';
import { AddMemberDialog } from '@/components/household/add-member-dialog';
import { MoveOutDialog } from '@/components/household/move-out-dialog';
import { SignedAgreementsSection } from '@/components/household/signed-agreements-section';
import { Home, FileSignature } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import type { Member, Unit } from '@/lib/types/database';

export default function HouseholdPage() {
  const { community, member, unit, householdMembers, isHeadOfHousehold, isBoard } =
    useCommunity();

  // Board: all units + selected unit
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unit?.id ?? '');
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(unit ?? undefined);

  const [members, setMembers] = useState<Member[]>(householdMembers);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [moveOutOpen, setMoveOutOpen] = useState(false);

  const canManage = isHeadOfHousehold || isBoard;

  // Fetch all units for board
  useEffect(() => {
    if (!isBoard) return;

    const supabase = createClient();
    async function loadUnits() {
      const { data } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active')
        .order('unit_number', { ascending: true });

      const units = (data as Unit[]) ?? [];
      setAllUnits(units);

      // Default to first unit if no unit from context
      if (!selectedUnitId && units.length > 0) {
        setSelectedUnitId(units[0].id);
        setSelectedUnit(units[0]);
      }
    }
    loadUnits();
  }, [isBoard, community.id, selectedUnitId]);

  // Update selectedUnit when selection changes
  useEffect(() => {
    if (isBoard) {
      const found = allUnits.find((u) => u.id === selectedUnitId);
      setSelectedUnit(found);
    } else {
      setSelectedUnit(unit ?? undefined);
    }
  }, [isBoard, selectedUnitId, allUnits, unit]);

  const fetchMembers = useCallback(async () => {
    const targetUnitId = isBoard ? selectedUnitId : unit?.id;
    if (!targetUnitId) return;

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('unit_id', targetUnitId)
      .eq('community_id', community.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMembers(data as Member[]);
    }

    setLoading(false);
  }, [isBoard, selectedUnitId, unit, community.id]);

  // Fetch members when selected unit changes (board)
  useEffect(() => {
    if (isBoard && selectedUnitId) {
      fetchMembers();
    }
  }, [isBoard, selectedUnitId, fetchMembers]);

  // Sync from context on mount (resident)
  useEffect(() => {
    if (!isBoard) {
      setMembers(householdMembers);
    }
  }, [householdMembers, isBoard]);

  function handleMemberAdded() {
    fetchMembers();
  }

  function handleMemberRemoved() {
    fetchMembers();
  }

  function handleMoveOutComplete() {
    fetchMembers();
  }

  const activeUnit = isBoard ? selectedUnit : unit;

  // No unit assigned (resident only)
  if (!isBoard && !unit) {
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
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Household
        </h1>
        {isBoard && members.length > 0 && selectedUnit && (
          <Button
            variant="outline"
            onClick={() => setMoveOutOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            Move Out
          </Button>
        )}
      </div>

      {/* Board: unit selector */}
      {isBoard && allUnits.length > 0 && (
        <div className="max-w-xs">
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {allUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  Unit {u.unit_number}
                  {u.address ? ` - ${u.address}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Unit info card */}
      {activeUnit && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary-100 dark:bg-primary-900/30 p-2.5 shrink-0">
              <Home className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                Unit {activeUnit.unit_number}
              </h2>
              {activeUnit.address && (
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                  {activeUnit.address}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member list */}
      <MemberList
        members={members}
        loading={loading}
        canManage={canManage}
        currentMemberId={member?.id ?? ''}
        onAddClick={() => setAddDialogOpen(true)}
        onMemberRemoved={handleMemberRemoved}
      />

      {/* Signed agreements */}
      {activeUnit && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-secondary-500" />
            <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              Signed Agreements
            </h2>
          </div>
          <SignedAgreementsSection unitId={activeUnit.id} />
        </div>
      )}

      {/* Add member dialog */}
      {canManage && (
        <AddMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleMemberAdded}
          unitOverride={isBoard ? selectedUnit : undefined}
        />
      )}

      {/* Move-out dialog (board only) */}
      {isBoard && selectedUnit && (
        <MoveOutDialog
          unit={selectedUnit}
          members={members}
          open={moveOutOpen}
          onOpenChange={setMoveOutOpen}
          onSuccess={handleMoveOutComplete}
        />
      )}
    </div>
  );
}
