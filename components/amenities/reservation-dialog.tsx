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
import { ScrollArea } from '@/components/shared/ui/scroll-area';
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
import { Check, ChevronsUpDown, ChevronLeft, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  buildSystemContext,
  fillAgreementTemplate,
} from '@/lib/utils/agreement-template';
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

  // Agreement flow
  const hasAgreement = amenity.agreement_enabled && !!amenity.agreement_template;
  const [step, setStep] = useState<1 | 2>(1);
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
  const [filledAgreement, setFilledAgreement] = useState('');
  const [signatureName, setSignatureName] = useState('');

  // Reset step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setFieldAnswers({});
      setFilledAgreement('');
      setSignatureName('');
    }
  }, [open]);

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

  // Resolve the member/unit for display and agreement
  function getResolvedMember(): { name: string; unitNumber: string } {
    if (isBoard && selectedMemberId) {
      const m = unitMembers.find((u) => u.id === selectedMemberId);
      const u = allUnits.find((u) => u.id === selectedUnitId);
      return {
        name: m ? `${m.first_name} ${m.last_name}` : '',
        unitNumber: u?.unit_number ?? '',
      };
    }
    return {
      name: member ? `${member.first_name} ${member.last_name}` : '',
      unitNumber: unit?.unit_number ?? '',
    };
  }

  function proceedToAgreement() {
    const reserveUnitId = isBoard ? selectedUnitId : unit?.id;
    const reserveMemberId = isBoard ? selectedMemberId : member?.id;

    if (!reserveUnitId || !reserveMemberId) {
      toast.error('Please select a unit and member.');
      return;
    }

    // Validate required custom fields
    const agreementFields = amenity.agreement_fields ?? [];
    for (const field of agreementFields) {
      if (field.required && !fieldAnswers[field.key]?.trim()) {
        toast.error(`Please answer: ${field.label}`);
        return;
      }
    }

    const resolved = getResolvedMember();
    const systemContext = buildSystemContext({
      memberName: resolved.name,
      unitNumber: resolved.unitNumber,
      amenityName: amenity.name,
      communityName: community.name,
      communityAddress: community.address ?? '',
      reservationDate: format(startDate, 'EEEE, MMMM d, yyyy'),
      startTime: format(startDate, 'h:mm a'),
      endTime: format(endDate, 'h:mm a'),
      fee: fee > 0 ? `$${fee.toFixed(2)}` : '$0.00',
      deposit: deposit > 0 ? `$${deposit.toFixed(2)}` : '$0.00',
      guestCount: guestCount || 'N/A',
      purpose: purpose.trim() || 'N/A',
      signingDate: format(new Date(), 'MMMM d, yyyy'),
    });

    const filled = fillAgreementTemplate(
      amenity.agreement_template!,
      systemContext,
      fieldAnswers,
    );
    setFilledAgreement(filled);
    setStep(2);
  }

  async function handleSubmit() {
    const reserveUnitId = isBoard ? selectedUnitId : unit?.id;
    const reserveMemberId = isBoard ? selectedMemberId : member?.id;

    if (!reserveUnitId || !reserveMemberId) {
      toast.error('Please select a unit and member.');
      return;
    }

    // If agreement required, validate signature
    if (hasAgreement && step === 2 && !signatureName.trim()) {
      toast.error('Please type your name to sign the agreement.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data: reservationData, error } = await supabase
      .from('reservations')
      .insert({
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
      })
      .select('id')
      .single();

    if (error) {
      setSubmitting(false);
      if (error.message.includes('already reserved')) {
        toast.error('This time slot was just reserved by someone else. Please choose a different time.');
      } else {
        toast.error('Failed to create reservation. Please try again.');
      }
      return;
    }

    // Insert signed agreement if applicable
    if (hasAgreement && reservationData) {
      const { error: agreementError } = await supabase
        .from('signed_agreements')
        .insert({
          reservation_id: reservationData.id,
          amenity_id: amenity.id,
          community_id: community.id,
          unit_id: reserveUnitId,
          signer_member_id: reserveMemberId,
          signer_name: signatureName.trim(),
          filled_text: filledAgreement,
          field_answers: fieldAnswers,
          signed_at: new Date().toISOString(),
        });

      if (agreementError) {
        console.error('Agreement insert error:', agreementError);
        // Reservation was created but agreement failed. Don't block.
        toast.warning('Reservation created, but the agreement could not be saved. Please contact the board.');
      } else {
        // Notify board members about the signed agreement
        const resolved = getResolvedMember();
        await supabase.rpc('create_board_notifications', {
          p_community_id: community.id,
          p_type: 'agreement_signed',
          p_title: `${amenity.name} agreement signed`,
          p_body: `${resolved.name} (Unit ${resolved.unitNumber}) signed the ${amenity.name} rental agreement.`,
          p_reference_id: reservationData.id,
          p_reference_type: 'reservation',
        });
      }
    }

    // Notify board members about the new reservation (if no agreement, or in addition)
    if (reservationData) {
      const resolved = getResolvedMember();
      await supabase.rpc('create_board_notifications', {
        p_community_id: community.id,
        p_type: 'reservation_created',
        p_title: `New ${amenity.name} reservation`,
        p_body: `${resolved.name} (Unit ${resolved.unitNumber}) reserved ${amenity.name}.`,
        p_reference_id: reservationData.id,
        p_reference_type: 'reservation',
      });
    }

    setSubmitting(false);

    toast.success(
      amenity.auto_approve
        ? 'Reservation confirmed!'
        : 'Reservation submitted! Awaiting board approval.',
    );

    setPurpose('');
    setGuestCount('');
    setFieldAnswers({});
    setSignatureName('');
    setStep(1);
    onOpenChange(false);
    onSuccess();
  }

  const agreementFields = amenity.agreement_fields ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[85vh] overflow-y-auto ${step === 2 ? 'sm:max-w-lg' : 'sm:max-w-md'}`}>
        <DialogHeader>
          <DialogTitle>
            {step === 2 ? 'Review & Sign Agreement' : `Reserve ${amenity.name}`}
          </DialogTitle>
          <DialogDescription>
            {step === 2 ? (
              'Review the rental agreement below and sign to confirm your reservation.'
            ) : isFullDay ? (
              format(startDate, 'EEEE, MMMM d, yyyy')
            ) : (
              `${format(startDate, 'EEEE, MMMM d')} at ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: Reservation Form ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {/* Status info */}
            <div className="flex items-center gap-2">
              {amenity.auto_approve ? (
                <Badge variant="secondary">Auto-approved</Badge>
              ) : (
                <Badge variant="outline">Requires board approval</Badge>
              )}
              {hasAgreement && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileSignature className="h-3 w-3" />
                  Agreement required
                </Badge>
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
                                    selectedUnitId === u.id ? 'opacity-100' : 'opacity-0',
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

            {/* Custom agreement questions */}
            {hasAgreement && agreementFields.length > 0 && (
              <div className="space-y-3 border-t border-stroke-light dark:border-stroke-dark pt-3">
                <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Agreement Questions
                </p>
                {agreementFields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'text' && (
                      <Input
                        value={fieldAnswers[field.key] ?? ''}
                        onChange={(e) =>
                          setFieldAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === 'number' && (
                      <Input
                        type="number"
                        value={fieldAnswers[field.key] ?? ''}
                        onChange={(e) =>
                          setFieldAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={fieldAnswers[field.key] ?? ''}
                        onChange={(e) =>
                          setFieldAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                    )}
                    {field.type === 'yes_no' && (
                      <Select
                        value={fieldAnswers[field.key] ?? ''}
                        onValueChange={(v) =>
                          setFieldAnswers((prev) => ({ ...prev, [field.key]: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'select' && field.options && (
                      <Select
                        value={fieldAnswers[field.key] ?? ''}
                        onValueChange={(v) =>
                          setFieldAnswers((prev) => ({ ...prev, [field.key]: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
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
        )}

        {/* ── STEP 2: Agreement Review + E-Sign ── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <ScrollArea className="h-[300px] rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4">
              <div className="whitespace-pre-line text-body text-text-primary-light dark:text-text-primary-dark leading-relaxed pr-3">
                {filledAgreement}
              </div>
            </ScrollArea>

            {/* E-Signature */}
            <div className="space-y-1.5">
              <label className="text-label text-text-primary-light dark:text-text-primary-dark">
                Electronic Signature
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Type your full legal name to sign this agreement.
              </p>
              <Input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Full legal name"
                className="text-body"
              />
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 && (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              {hasAgreement ? (
                <Button onClick={proceedToAgreement}>
                  Next: Review Agreement
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Booking...' : 'Confirm Reservation'}
                </Button>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !signatureName.trim()}
              >
                {submitting ? 'Submitting...' : 'Sign & Confirm Reservation'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
