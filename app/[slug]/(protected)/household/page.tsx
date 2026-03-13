'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { MemberList } from '@/components/household/member-list';
import { AddMemberDialog } from '@/components/household/add-member-dialog';
import { MoveOutDialog } from '@/components/household/move-out-dialog';
import { SignedAgreementsSection } from '@/components/household/signed-agreements-section';
import { Home, FileSignature, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/shared/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/shared/ui/command';
import { cn } from '@/lib/utils';
import type { Member, Unit } from '@/lib/types/database';

export default function HouseholdPage() {
  const { community, member, unit, householdMembers, isHeadOfHousehold, isBoard } =
    useCommunity();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read unit from URL param (board only)
  const unitParam = searchParams.get('unit');

  // Board: all units + selected unit
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [unitMembersMap, setUnitMembersMap] = useState<Map<string, string[]>>(new Map());
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitParam || unit?.id || '');
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(unit ?? undefined);
  const [comboOpen, setComboOpen] = useState(false);

  const [members, setMembers] = useState<Member[]>(householdMembers);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [moveOutOpen, setMoveOutOpen] = useState(false);

  const canManage = isHeadOfHousehold || isBoard;

  // Back navigation support (e.g., from amenities reservation approval)
  const backParam = searchParams.get('back');
  const backLabel = backParam === 'amenities' ? 'Back to Reservations' : null;
  const backHref = backParam === 'amenities' ? `/${community.slug}/amenities` : null;

  // Persist unit selection to URL
  function selectUnit(unitId: string) {
    setSelectedUnitId(unitId);
    if (isBoard) {
      router.replace(`${pathname}?unit=${unitId}`, { scroll: false });
    }
  }

  // Fetch all units for board
  useEffect(() => {
    if (!isBoard) return;

    const supabase = createClient();
    async function loadUnits() {
      const [{ data }, { data: membersData }] = await Promise.all([
        supabase
          .from('units')
          .select('*')
          .eq('community_id', community.id)
          .eq('status', 'active')
          .order('unit_number', { ascending: true }),
        supabase
          .from('members')
          .select('unit_id, first_name, last_name')
          .eq('community_id', community.id)
          .eq('is_approved', true),
      ]);

      const units = (data as Unit[]) ?? [];
      setAllUnits(units);

      // Build unit → member names map for search
      const namesMap = new Map<string, string[]>();
      (membersData ?? []).forEach((m: { unit_id: string | null; first_name: string; last_name: string }) => {
        if (!m.unit_id) return;
        const names = namesMap.get(m.unit_id) || [];
        names.push(`${m.first_name} ${m.last_name}`);
        namesMap.set(m.unit_id, names);
      });
      setUnitMembersMap(namesMap);

      // If URL param exists and matches a unit, use it
      if (unitParam) {
        const found = units.find((u) => u.id === unitParam);
        if (found) {
          setSelectedUnitId(unitParam);
          setSelectedUnit(found);
          return;
        }
      }

      // Default to context unit or first unit
      if (!selectedUnitId && units.length > 0) {
        const fallback = unit?.id || units[0].id;
        selectUnit(fallback);
      }
    }
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoard, community.id]);

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
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="inline-flex items-center gap-1.5 text-body font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Board: searchable unit selector */}
      {isBoard && allUnits.length > 0 && (
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={comboOpen}
              className="w-full max-w-md justify-between font-normal"
            >
              <span className="truncate">
                {selectedUnit
                  ? `Unit ${selectedUnit.unit_number}${selectedUnit.address ? ` - ${selectedUnit.address}` : ''}`
                  : 'Select a unit'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search units..." />
              <CommandList>
                <CommandEmpty>No units found.</CommandEmpty>
                <CommandGroup>
                  {allUnits.map((u) => {
                    const label = `Unit ${u.unit_number}${u.address ? ` - ${u.address}` : ''}`;
                    const memberNames = unitMembersMap.get(u.id) ?? [];
                    const searchValue = `${label} ${memberNames.join(' ')}`;
                    return (
                      <CommandItem
                        key={u.id}
                        value={searchValue}
                        onSelect={() => {
                          selectUnit(u.id);
                          setComboOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedUnitId === u.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate">{label}</div>
                          {memberNames.length > 0 && (
                            <div className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                              {memberNames.join(', ')}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
