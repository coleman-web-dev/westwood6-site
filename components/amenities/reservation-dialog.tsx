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
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import type { Amenity } from '@/lib/types/database';

interface ReservationDialogProps {
  amenity: Amenity;
  startDate: Date;
  endDate: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReservationDialog({
  amenity,
  startDate,
  endDate,
  open,
  onOpenChange,
  onSuccess,
}: ReservationDialogProps) {
  const { community, member, unit } = useCommunity();
  const [purpose, setPurpose] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isFullDay = amenity.booking_type === 'full_day';
  const fee = amenity.fee / 100;
  const deposit = amenity.deposit / 100;
  const total = fee + deposit;

  async function handleSubmit() {
    if (!member || !unit) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('reservations').insert({
      amenity_id: amenity.id,
      community_id: community.id,
      unit_id: unit.id,
      reserved_by: member.id,
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
