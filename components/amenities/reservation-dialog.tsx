'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/shared/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Amenity, Member, Unit } from '@/lib/types/database';

interface ReservationDialogProps {
  amenity: Amenity;
  startDate: Date;
  endDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bookingMode?: 'full_day' | 'time_slot';
}

export function ReservationDialog({
  amenity,
  startDate,
  endDate,
  open,
  onOpenChange,
  onSuccess,
  bookingMode,
}: ReservationDialogProps) {
  const { community, member, unit, isBoard } = useCommunity();
  const [purpose, setPurpose] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Board: reserve on behalf of another unit/member
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [unitMembers, setUnitMembers] = useState<Member[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [unitOwnerMap, setUnitOwnerMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !isBoard) return;
    const supabase = createClient();
    async function loadUnits() {
      const { data: unitData } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active')
        .order('unit_number', { ascending: true });

      const units = (unitData as Unit[]) ?? [];
      setAllUnits(units);

      const { data: owners } = await supabase
        .from('members')
        .select('unit_id, first_name, last_name')
        .eq('community_id', community.id)
        .eq('member_role', 'owner')
        .is('parent_member_id', null);

      const ownerMap: Record<string, string> = {};
      for (const o of (owners ?? []) as { unit_id: string | null; first_name: string; last_name: string }[]) {
        if (o.unit_id) ownerMap[o.unit_id] = `${o.first_name} ${o.last_name}`;
      }
      setUnitOwnerMap(ownerMap);

      // Default to own unit if available
      if (unit) {
        setSelectedUnitId(unit.id);
      }
    }
    loadUnits();
  }, [open, isBoard, community.id, unit]);

  // Fetch members for selected unit (board mode)
  useEffect(() => {
    if (!isBoard || !selectedUnitId) {
      setUnitMembers([]);
      setSelectedMemberId('');
      return;
    }
    const supabase = createClient();
    async function loadMembers() {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('unit_id', selectedUnitId)
        .order('first_name');
      const members = (data as Member[]) ?? [];
      setUnitMembers(members);
      // Auto-select first member
      if (members.length > 0) {
        setSelectedMemberId(members[0].id);
      } else {
        setSelectedMemberId('');
      }
    }
    loadMembers();
  }, [isBoard, selectedUnitId]);

  const isFullDay = bookingMode ? bookingMode === 'full_day' : amenity.booking_type === 'full_day';
  const fee = amenity.fee / 100;
  const deposit = amenity.deposit / 100;
  const total = fee + deposit;

  async function handleSubmit() {
    const reserveUnitId = isBoard ? selectedUnitId : unit?.id;
    const reserveMemberId = isBoard ? selectedMemberId : member?.id;

    if (!reserveUnitId || !reserveMemberId) {
      toast.error('Please select a unit and member.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('reservations').insert({
      amenity_id: amenity.id,
      community_id: community.id,
      unit_id: reserveUnitId,
      reserved_by: reserveMemberId,
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      status: amenity.auto_approve ? 'approved' : 'pending',
      purpose: purpose.trim() || null,
      guest_count: guestCount ? parseInt(guestCount, 10) : null,
      fee_amount: amenity.fee,
      deposit_amount: amenity.deposit,
    });

    setSubmitting(false);

    if (error) {
      if (error.message.includes('already reserved')) {
        toast.error('This time slot was just reserved by someone else. Please choose a different time.');
      } else {
        toast.error('Failed to create reservation. Please try again.');
      }
      return;
    }

    toast.success(
      amenity.auto_approve
        ? 'Reservation confirmed!'
        : 'Reservation submitted! Awaiting board approval.'
    );

    setPurpose('');
    setGuestCount('');
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve {amenity.name}</DialogTitle>
          <DialogDescription>
            {isFullDay
              ? format(startDate, 'EEEE, MMMM d, yyyy')
              : `${format(startDate, 'EEEE, MMMM d')} at ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status info */}
          <div className="flex items-center gap-2">
            {amenity.auto_approve ? (
              <Badge variant="secondary">Auto-approved</Badge>
            ) : (
              <Badge variant="outline">Requires board approval</Badge>
            )}
          </div>

          {/* Board: Reserve on behalf */}
          {isBoard && allUnits.length > 0 && (
            <>
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Unit
                </label>
                <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unitSearchOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedUnitId
                        ? (() => {
                            const u = allUnits.find((u) => u.id === selectedUnitId);
                            return u
                              ? `Unit ${u.unit_number}${unitOwnerMap[u.id] ? ` - ${unitOwnerMap[u.id]}` : ''}`
                              : 'Select a unit';
                          })()
                        : 'Select a unit'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search units..." />
                      <CommandList>
                        <CommandEmpty>No unit found.</CommandEmpty>
                        <CommandGroup>
                          {allUnits.map((u) => (
                            <CommandItem
                              key={u.id}
                              value={`Unit ${u.unit_number} ${unitOwnerMap[u.id] ?? ''}`}
                              onSelect={() => {
                                setSelectedUnitId(u.id);
                                setUnitSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedUnitId === u.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              Unit {u.unit_number}
                              {unitOwnerMap[u.id] ? ` - ${unitOwnerMap[u.id]}` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {unitMembers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Member
                  </label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Purpose (optional)
            </label>
            <Textarea
              placeholder="What is this reservation for?"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={500}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Guest count */}
          {amenity.capacity && (
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Expected guests
              </label>
              <Input
                type="number"
                placeholder="Number of guests"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                min={1}
                max={amenity.capacity}
              />
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Max capacity: {amenity.capacity}
              </p>
            </div>
          )}

          {/* Fee summary */}
          {amenity.requires_payment && total > 0 && (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
              {fee > 0 && (
                <div className="flex justify-between text-body">
                  <span className="text-text-secondary-light dark:text-text-secondary-dark">Reservation fee</span>
                  <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${fee.toFixed(2)}</span>
                </div>
              )}
              {deposit > 0 && (
                <div className="flex justify-between text-body">
                  <span className="text-text-secondary-light dark:text-text-secondary-dark">Refundable deposit</span>
                  <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${deposit.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-label pt-1 border-t border-stroke-light dark:border-stroke-dark">
                <span className="text-text-primary-light dark:text-text-primary-dark">Total</span>
                <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${total.toFixed(2)}</span>
              </div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark pt-1">
                Payment will be collected separately.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Booking...' : 'Confirm Reservation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
