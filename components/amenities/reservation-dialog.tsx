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
import { useDialogUnsavedChanges } from '@/lib/hooks/use-dialog-unsaved-changes';
import { DialogUnsavedChangesAlert } from '@/components/shared/dialog-unsaved-changes-alert';
import { Check, ChevronsUpDown, ChevronLeft, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  buildSystemContext,
  fillAgreementForReservation,
  fillAgreementForReservationHtml,
  partitionFieldsByPhase,
} from '@/lib/utils/agreement-template';
import { formatAgreementHtml } from '@/lib/utils/format-agreement';
import { generateAgreementPdf, agreementPdfFilename } from '@/lib/utils/generate-agreement-pdf';
import type { Amenity, Member, Unit } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Sync e-signed agreement to Documents > Agreements > {amenity name}
async function syncESignedAgreementToFolder(opts: {
  supabase: SupabaseClient;
  communityId: string;
  memberId: string;
  amenityName: string;
  signerName: string;
  reservationDate: string;
  signedAgreementId: string;
  communityName: string;
  communityAddress: string;
  filledText: string;
  signedAt: string;
}) {
  const { supabase } = opts;

  // 1. Find or create "Agreements" root folder
  let rootId: string | null = null;
  {
    const { data } = await supabase
      .from('document_folders')
      .select('id')
      .eq('community_id', opts.communityId)
      .eq('name', 'Agreements')
      .is('parent_id', null)
      .single();

    if (data) {
      rootId = data.id;
    } else {
      const { data: created } = await supabase
        .from('document_folders')
        .insert({
          community_id: opts.communityId,
          name: 'Agreements',
          parent_id: null,
          sort_order: 6,
          created_by: opts.memberId,
        })
        .select('id')
        .single();
      rootId = created?.id ?? null;
    }
  }

  if (!rootId) return;

  // 2. Find or create amenity subfolder
  let subfolderId: string | null = null;
  {
    const { data } = await supabase
      .from('document_folders')
      .select('id')
      .eq('community_id', opts.communityId)
      .eq('parent_id', rootId)
      .eq('name', opts.amenityName)
      .single();

    if (data) {
      subfolderId = data.id;
    } else {
      const { data: created } = await supabase
        .from('document_folders')
        .insert({
          community_id: opts.communityId,
          name: opts.amenityName,
          parent_id: rootId,
          sort_order: 0,
          created_by: opts.memberId,
        })
        .select('id')
        .single();
      subfolderId = created?.id ?? null;
    }
  }

  if (!subfolderId) return;

  // 3. Generate PDF and upload to Storage
  let filePath: string | null = null;
  let fileSize: number | null = null;
  try {
    const pdfBlob = generateAgreementPdf({
      communityName: opts.communityName,
      communityAddress: opts.communityAddress,
      amenityName: opts.amenityName,
      filledText: opts.filledText,
      signerName: opts.signerName,
      signedAt: opts.signedAt,
    });

    const filename = agreementPdfFilename({
      amenityName: opts.amenityName,
      signerName: opts.signerName,
    });
    filePath = `${opts.communityId}/agreements/${Date.now()}_${filename}`;
    fileSize = pdfBlob.size;

    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

    if (uploadError) {
      console.error('Agreement PDF upload failed:', uploadError);
      filePath = null;
      fileSize = null;
    }
  } catch (err) {
    console.error('Agreement PDF generation failed:', err);
  }

  // 4. Insert document row (with file_path if PDF was generated, null otherwise)
  await supabase.from('documents').insert({
    community_id: opts.communityId,
    title: `${opts.amenityName} Agreement - ${opts.signerName} - ${opts.reservationDate}`,
    category: 'other',
    folder_id: subfolderId,
    file_path: filePath,
    file_size: fileSize,
    visibility: 'private',
    is_public: false,
    uploaded_by: opts.memberId,
    signed_agreement_id: opts.signedAgreementId,
  });
}

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
  const [filledAgreementHtml, setFilledAgreementHtml] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [eSignConsent, setESignConsent] = useState(false);

  const {
    touch,
    handleOpenChange,
    confirmCloseOpen,
    handleConfirmClose,
    setConfirmCloseOpen,
    resetTouched,
    dialogContentGuardProps,
  } = useDialogUnsavedChanges({ onOpenChange });

  // Reset step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setFieldAnswers({});
      setFilledAgreement('');
      setSignatureName('');
      setESignConsent(false);
      resetTouched();
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

    // Validate only reservation-phase fields (not post-event ones)
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

    // Use phase-aware fill: reservation fields get values, post-event fields get placeholder marker
    const filled = fillAgreementForReservation(
      amenity.agreement_template!,
      systemContext,
      fieldAnswers,
      postEventKeys,
    );
    setFilledAgreement(filled);

    // Build formatted HTML version with underlined values and styled post-event placeholders
    const htmlRaw = fillAgreementForReservationHtml(
      amenity.agreement_template!,
      systemContext,
      fieldAnswers,
      postEventKeys,
    );
    setFilledAgreementHtml(formatAgreementHtml(htmlRaw));
    setESignConsent(false);
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
      const { data: agreementData, error: agreementError } = await supabase
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
        })
        .select('id')
        .single();

      if (agreementError) {
        console.error('Agreement insert error:', agreementError);
        // Agreement failed: delete the reservation to maintain consistency
        await supabase.from('reservations').delete().eq('id', reservationData.id);
        setSubmitting(false);
        toast.error('Failed to save the signed agreement. Reservation was not created. Please try again.');
        return;
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

        // Sync e-signed agreement to Documents > Agreements > {amenity name}
        if (agreementData) {
          syncESignedAgreementToFolder({
            supabase,
            communityId: community.id,
            memberId: reserveMemberId,
            amenityName: amenity.name,
            signerName: signatureName.trim(),
            reservationDate: format(startDate, 'MMM d, yyyy'),
            signedAgreementId: agreementData.id,
            communityName: community.name,
            communityAddress: community.address ?? '',
            filledText: filledAgreement,
            signedAt: format(new Date(), 'MMMM d, yyyy'),
          }).catch((err) => console.error('Failed to sync agreement to documents:', err));
        }
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

      // Queue email notification to board members (fire-and-forget)
      fetch('/api/email/reservation-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          communitySlug: community.slug,
          amenityName: amenity.name,
          memberName: resolved.name,
          unitNumber: resolved.unitNumber,
          startDatetime: startDate.toISOString(),
          endDatetime: endDate.toISOString(),
          purpose: purpose.trim() || null,
          guestCount: guestCount ? parseInt(guestCount, 10) : null,
          feeAmount: amenity.fee,
          depositAmount: amenity.deposit,
          status: amenity.auto_approve ? 'approved' : 'pending',
        }),
      }).catch(() => {
        // Non-critical: don't fail the reservation if email fails
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
    resetTouched();
    onOpenChange(false);
    onSuccess();
  }

  const allAgreementFields = amenity.agreement_fields ?? [];
  const { reservationFields: agreementFields, postEventFields } = partitionFieldsByPhase(allAgreementFields);
  const postEventKeys = new Set(postEventFields.map((f) => f.key));

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-h-[85vh] overflow-y-auto ${step === 2 ? 'sm:max-w-lg' : 'sm:max-w-md'}`}
        {...dialogContentGuardProps}
      >
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
          <div className="space-y-4 py-2" onChangeCapture={touch}>
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
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Rental fee</span>
                    <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${fee.toFixed(2)}</span>
                  </div>
                )}
                {deposit > 0 && (
                  <div className="flex justify-between text-body">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Security deposit (refundable)</span>
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
          <div className="space-y-4 py-2" onChangeCapture={touch}>
            <ScrollArea className="h-[300px] rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4">
              <div
                className="text-body text-text-primary-light dark:text-text-primary-dark leading-relaxed pr-3 [&_u]:underline [&_u]:decoration-secondary-500/60 [&_u]:underline-offset-2 [&_p]:mb-3 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: filledAgreementHtml }}
              />
            </ScrollArea>

            {/* E-Signature Consent Disclosure */}
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-2">
              <p className="text-label text-text-primary-light dark:text-text-primary-dark font-semibold">
                Consent to Electronic Signature
              </p>
              <div className="text-meta text-text-secondary-light dark:text-text-secondary-dark space-y-1.5 leading-relaxed">
                <p>By checking this box, you acknowledge and agree to the following:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>You consent to sign this document electronically. Electronic signatures carry the same legal weight as handwritten signatures under the Electronic Signatures in Global and National Commerce Act (ESIGN) and the Uniform Electronic Transactions Act (UETA).</li>
                  <li>You have the right to receive a paper copy of this document at no charge by contacting your community management.</li>
                  <li>You may withdraw your consent to electronic records at any time by contacting your community management. Previously signed agreements remain valid and enforceable.</li>
                  <li>To access and retain this electronic record, you need a device with internet access and a current web browser.</li>
                </ol>
              </div>
              <label className={`flex items-start gap-3 pt-2 cursor-pointer rounded-lg border-2 p-3 transition-colors ${eSignConsent ? 'border-secondary-500 bg-secondary-50/50 dark:bg-secondary-950/20' : 'border-stroke-light dark:border-stroke-dark hover:border-secondary-300 dark:hover:border-secondary-700'}`}>
                <input
                  type="checkbox"
                  checked={eSignConsent}
                  onChange={(e) => setESignConsent(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-2 border-primary-300 dark:border-primary-500 text-secondary-500 focus:ring-secondary-500 focus:ring-2 shrink-0"
                />
                <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark leading-snug">
                  I have read and agree to the above disclosure. I consent to use an electronic signature for this document.
                </span>
              </label>
            </div>

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
              {signatureName.trim() && (
                <p className="font-signature text-2xl text-text-primary-light dark:text-text-primary-dark mt-1 pl-1">
                  {signatureName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
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
                disabled={submitting || !signatureName.trim() || !eSignConsent}
              >
                {submitting ? 'Submitting...' : 'Sign & Confirm Reservation'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DialogUnsavedChangesAlert
      open={confirmCloseOpen}
      onOpenChange={setConfirmCloseOpen}
      onDiscard={handleConfirmClose}
      title="Discard reservation?"
      description="You have unsaved changes. If you close now, your progress will be lost."
    />
    </>
  );
}
