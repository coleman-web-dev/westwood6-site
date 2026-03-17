'use client';

import { useEffect, useRef, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
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
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Upload } from 'lucide-react';
import { UnitPicker } from '@/components/shared/unit-picker';
import { toast } from 'sonner';
import { useDialogUnsavedChanges } from '@/lib/hooks/use-dialog-unsaved-changes';
import { DialogUnsavedChangesAlert } from '@/components/shared/dialog-unsaved-changes-alert';
import type { Amenity } from '@/lib/types/database';

interface ManualReservationDialogProps {
  amenity: Amenity;
  startDate: Date;
  endDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bookingMode?: 'full_day' | 'time_slot';
}

/**
 * Sync an uploaded paper agreement to the Documents section,
 * creating an "Agreements" root folder and amenity subfolder.
 */
async function syncAgreementDocToFolder(opts: {
  communityId: string;
  memberId: string;
  amenityName: string;
  title: string;
  filePath: string;
  fileSize: number | null;
}) {
  const supabase = createClient();

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
          sort_order: 5,
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

  // 3. Insert document row
  await supabase.from('documents').insert({
    community_id: opts.communityId,
    title: opts.title,
    category: 'other',
    folder_id: subfolderId,
    file_path: opts.filePath,
    file_size: opts.fileSize,
    visibility: 'private',
    is_public: false,
    uploaded_by: opts.memberId,
  });
}

export function ManualReservationDialog({
  amenity,
  startDate,
  endDate,
  open,
  onOpenChange,
  onSuccess,
  bookingMode,
}: ManualReservationDialogProps) {
  const { community, member } = useCommunity();
  const [submitting, setSubmitting] = useState(false);

  // Contact info
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Unit assignment (optional)
  const [selectedUnitId, setSelectedUnitId] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [checkNumber, setCheckNumber] = useState('');
  const [feePaid, setFeePaid] = useState(true);
  const [depositPaid, setDepositPaid] = useState(true);

  // Paper agreement
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    touch,
    handleOpenChange,
    confirmCloseOpen,
    handleConfirmClose,
    setConfirmCloseOpen,
    resetTouched,
    dialogContentGuardProps,
  } = useDialogUnsavedChanges({ onOpenChange });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setPurpose('');
      setGuestCount('');
      setAdminNotes('');
      setSelectedUnitId('');
      setPaymentMethod('check');
      setCheckNumber('');
      setFeePaid(true);
      setDepositPaid(true);
      setAgreementFile(null);
      resetTouched();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  const isFullDay = bookingMode ? bookingMode === 'full_day' : amenity.booking_type === 'full_day';
  const fee = amenity.fee / 100;
  const deposit = amenity.deposit / 100;
  const total = fee + deposit;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAgreementFile(file);
      touch();
    }
  }

  async function handleSubmit() {
    if (!contactName.trim()) {
      toast.error('Please enter a contact name.');
      return;
    }
    if (!member) return;

    setSubmitting(true);
    const supabase = createClient();

    // 1. Create reservation
    const { data: reservationData, error } = await supabase
      .from('reservations')
      .insert({
        amenity_id: amenity.id,
        community_id: community.id,
        unit_id: selectedUnitId || null,
        reserved_by: null,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        status: 'approved' as const,
        purpose: purpose.trim() || null,
        guest_count: guestCount ? parseInt(guestCount, 10) : null,
        fee_amount: amenity.fee,
        deposit_amount: amenity.deposit,
        admin_notes: adminNotes.trim() || null,
        is_manual: true,
        manual_contact_name: contactName.trim(),
        manual_contact_phone: contactPhone.trim() || null,
        manual_contact_email: contactEmail.trim() || null,
        created_by: member.id,
        fee_paid: fee > 0 ? feePaid : false,
        fee_paid_at: fee > 0 && feePaid ? new Date().toISOString() : null,
        deposit_paid: deposit > 0 ? depositPaid : false,
        deposit_paid_at: deposit > 0 && depositPaid ? new Date().toISOString() : null,
        payment_method: paymentMethod,
        check_number: paymentMethod === 'check' ? checkNumber.trim() || null : null,
      })
      .select('id')
      .single();

    if (error || !reservationData) {
      setSubmitting(false);
      toast.error('Failed to create reservation.');
      return;
    }

    // 2. Upload paper agreement if provided
    let paperPath: string | null = null;
    if (agreementFile) {
      const safeName = agreementFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
      paperPath = `${community.id}/agreements/manual/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('hoa-documents')
        .upload(paperPath, agreementFile);

      if (uploadError) {
        console.error('Failed to upload paper agreement:', uploadError.message);
        paperPath = null;
        toast.warning('Reservation created, but the agreement upload failed. You can upload it later.');
      }
    }

    // 3. Create signed_agreements record if paper uploaded
    if (paperPath) {
      await supabase.from('signed_agreements').insert({
        reservation_id: reservationData.id,
        amenity_id: amenity.id,
        community_id: community.id,
        unit_id: selectedUnitId || null,
        signer_member_id: null,
        signer_name: contactName.trim(),
        filled_text: 'Paper agreement on file',
        field_answers: {},
        signed_at: new Date().toISOString(),
        is_paper: true,
        paper_agreement_path: paperPath,
      });

      // 4. Sync to Documents section if unit assigned
      if (selectedUnitId) {
        const docTitle = `${amenity.name} Agreement - ${contactName.trim()} - ${format(startDate, 'MMM d, yyyy')}`;
        syncAgreementDocToFolder({
          communityId: community.id,
          memberId: member.id,
          amenityName: amenity.name,
          title: docTitle,
          filePath: paperPath,
          fileSize: agreementFile!.size,
        }).catch((err) => console.error('Failed to sync agreement to documents:', err));
      }
    }

    setSubmitting(false);
    toast.success('Manual reservation created.');
    resetTouched();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-md"
          {...dialogContentGuardProps}
        >
          <DialogHeader>
            <DialogTitle>Block Date - {amenity.name}</DialogTitle>
            <DialogDescription>
              {isFullDay
                ? format(startDate, 'EEEE, MMMM d, yyyy')
                : `${format(startDate, 'EEEE, MMMM d')} at ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2" onChangeCapture={touch}>
            {/* Contact Info */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name of the person reserving"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Phone
                </label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Email
                </label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Purpose
              </label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="What is this reservation for?"
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
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="Number of guests"
                  min={1}
                  max={amenity.capacity}
                />
              </div>
            )}

            {/* Assign to household */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Assign to Household (optional)
              </label>
              <UnitPicker
                communityId={community.id}
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                placeholder="None (external)"
                optional
              />
            </div>

            {/* Admin notes */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Board Notes
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes (not visible to residents)"
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Payment Section */}
            {total > 0 && (
              <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-3">
                <p className="text-label text-text-primary-light dark:text-text-primary-dark font-semibold">
                  Payment
                </p>

                {/* Fee summary */}
                <div className="space-y-1">
                  {fee > 0 && (
                    <div className="flex justify-between text-body">
                      <span className="text-text-secondary-light dark:text-text-secondary-dark">Rental fee</span>
                      <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${fee.toFixed(2)}</span>
                    </div>
                  )}
                  {deposit > 0 && (
                    <div className="flex justify-between text-body">
                      <span className="text-text-secondary-light dark:text-text-secondary-dark">Security deposit</span>
                      <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${deposit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-label pt-1 border-t border-stroke-light dark:border-stroke-dark">
                    <span className="text-text-primary-light dark:text-text-primary-dark">Total</span>
                    <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-1.5">
                  <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Payment Method
                  </label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Check number */}
                {paymentMethod === 'check' && (
                  <div className="space-y-1.5">
                    <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Check Number
                    </label>
                    <Input
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      placeholder="e.g., 1234"
                    />
                  </div>
                )}

                {/* Paid checkboxes */}
                <div className="space-y-2">
                  {fee > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="fee-paid"
                        checked={feePaid}
                        onCheckedChange={(checked) => setFeePaid(checked === true)}
                      />
                      <label htmlFor="fee-paid" className="text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer">
                        Rental fee paid (${fee.toFixed(2)})
                      </label>
                    </div>
                  )}
                  {deposit > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="deposit-paid"
                        checked={depositPaid}
                        onCheckedChange={(checked) => setDepositPaid(checked === true)}
                      />
                      <label htmlFor="deposit-paid" className="text-body text-text-primary-light dark:text-text-primary-dark cursor-pointer">
                        Security deposit paid (${deposit.toFixed(2)})
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paper Agreement Upload */}
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Paper Agreement (optional)
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {agreementFile ? 'Change File' : 'Choose File'}
                </Button>
                {agreementFile && (
                  <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark truncate max-w-[200px]">
                    {agreementFile.name}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
              />
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Upload a scan or photo of the signed paper agreement.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !contactName.trim()}>
              {submitting ? 'Creating...' : 'Block Date'}
            </Button>
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
