'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildSystemContext,
  fillPostEventFields,
  partitionFieldsByPhase,
} from '@/lib/utils/agreement-template';
import type { AgreementField, SignedAgreement, Reservation } from '@/lib/types/database';

interface CompleteAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: SignedAgreement & {
    amenities?: { name: string; agreement_template: string | null; agreement_fields: AgreementField[] | null };
    reservations?: Reservation;
    units?: { unit_number: string };
  };
  onSuccess: () => void;
}

export function CompleteAgreementDialog({
  open,
  onOpenChange,
  agreement,
  onSuccess,
}: CompleteAgreementDialogProps) {
  const { community, member } = useCommunity();
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const allFields = agreement.amenities?.agreement_fields ?? [];
  const { postEventFields } = partitionFieldsByPhase(allFields);

  async function handleSubmit() {
    if (!member) {
      toast.error('You must be logged in.');
      return;
    }

    // Validate required post-event fields
    for (const field of postEventFields) {
      if (field.required && !fieldAnswers[field.key]?.trim()) {
        toast.error(`Please answer: ${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    // Rebuild filled text with post-event answers included
    const template = agreement.amenities?.agreement_template;
    const reservation = agreement.reservations;
    let updatedFilledText = agreement.filled_text;

    if (template && reservation) {
      const startDate = new Date(reservation.start_datetime);
      const endDate = new Date(reservation.end_datetime);
      const postEventKeys = new Set(postEventFields.map((f) => f.key));

      const systemContext = buildSystemContext({
        memberName: agreement.signer_name,
        unitNumber: agreement.units?.unit_number ?? '',
        amenityName: agreement.amenities?.name ?? '',
        communityName: community.name,
        communityAddress: community.address ?? '',
        reservationDate: format(startDate, 'EEEE, MMMM d, yyyy'),
        startTime: format(startDate, 'h:mm a'),
        endTime: format(endDate, 'h:mm a'),
        fee: reservation.fee_amount > 0 ? `$${(reservation.fee_amount / 100).toFixed(2)}` : '$0.00',
        deposit: reservation.deposit_amount > 0 ? `$${(reservation.deposit_amount / 100).toFixed(2)}` : '$0.00',
        guestCount: reservation.guest_count?.toString() ?? 'N/A',
        purpose: reservation.purpose ?? 'N/A',
        signingDate: format(new Date(agreement.signed_at), 'MMMM d, yyyy'),
      });

      updatedFilledText = fillPostEventFields(
        agreement.filled_text,
        fieldAnswers,
        postEventKeys,
        template,
        systemContext,
        agreement.field_answers ?? {},
      );
    }

    const { error } = await supabase
      .from('signed_agreements')
      .update({
        post_event_completed: true,
        post_event_field_answers: fieldAnswers,
        post_event_completed_by: member.id,
        post_event_completed_at: new Date().toISOString(),
        filled_text: updatedFilledText,
      })
      .eq('id', agreement.id);

    if (error) {
      console.error('Post-event completion error:', error);
      toast.error('Failed to save post-event inspection. Please try again.');
      setSubmitting(false);
      return;
    }

    // Notify the unit's household about inspection completion
    const { data: unitMembers } = await supabase
      .from('members')
      .select('id')
      .eq('unit_id', agreement.unit_id)
      .eq('community_id', community.id);

    await supabase.rpc('create_member_notifications', {
      p_community_id: community.id,
      p_type: 'general',
      p_title: `${agreement.amenities?.name ?? 'Amenity'} inspection completed`,
      p_body: `The post-event inspection for your ${agreement.amenities?.name ?? 'amenity'} reservation has been completed.`,
      p_reference_id: agreement.reservation_id,
      p_reference_type: 'reservation',
      p_member_ids: (unitMembers ?? []).map((m) => m.id),
    }).catch(() => {
      // Non-critical: don't fail the whole operation if notification fails
    });

    setSubmitting(false);
    toast.success('Post-event inspection completed successfully.');
    setFieldAnswers({});
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-secondary-500" />
            Post-Event Inspection
          </DialogTitle>
          <DialogDescription>
            Complete the post-event inspection for {agreement.amenities?.name ?? 'this amenity'}.
            {agreement.reservations && (
              <> Reservation: {format(new Date(agreement.reservations.start_datetime), 'MMM d, yyyy')}.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Signer info */}
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Signed by</span>
              <span className="text-text-primary-light dark:text-text-primary-dark">{agreement.signer_name}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Unit</span>
              <span className="text-text-primary-light dark:text-text-primary-dark">{agreement.units?.unit_number ?? 'N/A'}</span>
            </div>
          </div>

          {postEventFields.length === 0 ? (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-4 text-center">
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                No post-event fields to complete.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Inspection Items
              </p>
              {postEventFields.map((field) => (
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || postEventFields.length === 0}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Complete Inspection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
