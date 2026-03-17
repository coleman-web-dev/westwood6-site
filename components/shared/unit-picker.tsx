'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shared/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnitInfo {
  id: string;
  unit_number: string;
  address: string | null;
  headName: string | null;
}

interface UnitPickerProps {
  communityId: string;
  value: string;
  onValueChange: (unitId: string) => void;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
}

const SYSTEM_ROLE_RANK: Record<string, number> = {
  super_admin: 4,
  manager: 3,
  board: 2,
  resident: 1,
};

export function UnitPicker({
  communityId,
  value,
  onValueChange,
  placeholder = 'Select unit...',
  optional = false,
  disabled = false,
  className,
}: UnitPickerProps) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch units + members to build display data
  useEffect(() => {
    if (!open || units.length > 0) return;

    setLoading(true);
    const supabase = createClient();

    async function loadData() {
      const [unitRes, memberRes] = await Promise.all([
        supabase
          .from('units')
          .select('id, unit_number, address')
          .eq('community_id', communityId)
          .eq('status', 'active')
          .order('unit_number', { ascending: true }),
        supabase
          .from('members')
          .select('unit_id, first_name, last_name, member_role, system_role, parent_member_id')
          .eq('community_id', communityId)
          .eq('is_approved', true),
      ]);

      const unitRows = unitRes.data ?? [];
      const memberRows = (memberRes.data ?? []) as Array<{
        unit_id: string | null;
        first_name: string;
        last_name: string;
        member_role: string;
        system_role: string;
        parent_member_id: string | null;
      }>;

      // Build head of household map
      const headMap: Record<string, { name: string; rank: number }> = {};
      for (const m of memberRows) {
        if (!m.unit_id) continue;
        const name = `${m.first_name} ${m.last_name}`;
        const isOwnerHead = m.member_role === 'owner' && !m.parent_member_id;
        const roleRank = SYSTEM_ROLE_RANK[m.system_role] ?? 0;

        if (isOwnerHead) {
          // Owner with no parent is always head of household
          headMap[m.unit_id] = { name, rank: 100 };
        } else if (!headMap[m.unit_id] || roleRank > headMap[m.unit_id].rank) {
          // Fallback: highest system_role
          headMap[m.unit_id] = { name, rank: roleRank };
        }
      }

      const infos: UnitInfo[] = unitRows.map((u) => ({
        id: u.id,
        unit_number: u.unit_number,
        address: u.address,
        headName: headMap[u.id]?.name ?? null,
      }));

      setUnits(infos);
      setLoading(false);
    }

    loadData();
  }, [open, communityId, units.length]);

  // Selected unit display
  const selectedUnit = useMemo(
    () => units.find((u) => u.id === value),
    [units, value],
  );

  // Build search string for cmdk filtering
  function getSearchValue(u: UnitInfo) {
    return [u.unit_number, u.address ?? '', u.headName ?? ''].join(' ');
  }

  function getAddressLine1(address: string | null): string {
    if (!address) return '';
    // Take everything before the first comma (street address)
    return address.split(',')[0].trim();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-text-muted-light dark:text-text-muted-dark',
            className,
          )}
        >
          {selectedUnit ? (
            <span className="truncate">
              Unit {selectedUnit.unit_number}
              {getAddressLine1(selectedUnit.address)
                ? ` - ${getAddressLine1(selectedUnit.address)}`
                : ''}
              {selectedUnit.headName ? `, ${selectedUnit.headName}` : ''}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name, lot, or address..." />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>
              {loading ? 'Loading units...' : 'No unit found.'}
            </CommandEmpty>
            <CommandGroup>
              {optional && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      !value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="text-text-muted-light dark:text-text-muted-dark">
                    None
                  </span>
                </CommandItem>
              )}
              {units.map((u) => (
                <CommandItem
                  key={u.id}
                  value={getSearchValue(u)}
                  onSelect={() => {
                    onValueChange(u.id);
                    setOpen(false);
                  }}
                  className="flex items-start gap-2 py-2"
                >
                  <Check
                    className={cn(
                      'mr-1 h-4 w-4 shrink-0 mt-0.5',
                      value === u.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-body font-medium truncate">
                      Unit {u.unit_number}
                      {getAddressLine1(u.address)
                        ? ` - ${getAddressLine1(u.address)}`
                        : ''}
                    </span>
                    {u.headName && (
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                        {u.headName}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
