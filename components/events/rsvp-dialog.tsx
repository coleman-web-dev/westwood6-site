'use client';

import { useState } from 'react';
import { format } from 'date-fns';
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
import { CalendarIcon, Clock, MapPin, Users, CreditCard, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { Event } from '@/lib/types/database';

interface RsvpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  spotsRemaining: number | null; // null = unlimited
  onSuccess: () => void;
}

export function RsvpDialog({
  open,
  onOpenChange,
  event,
  spotsRemaining,
  onSuccess,
}: RsvpDialogProps) {
  const { community } = useCommunity();
  const [guestCount, setGuestCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const hasFee = event.rsvp_fee > 0;
  const feePerUnit = event.rsvp_fee / 100;
  const totalFee =
    hasFee
      ? event.rsvp_fee_type === 'per_person'
        ? feePerUnit * guestCount
        : feePerUnit
      : 0;

  const startDate = new Date(event.start_datetime);
  const endDate = new Date(event.end_datetime);

  // Build cancellation policy text
  function getCancellationPolicy(): string {
    if (!event.rsvp_allow_cancellation) {
      return 'No cancellations allowed. All RSVPs are final.';
    }
    if (!hasFee) {
      return 'You may cancel your RSVP at any time.';
    }
    if (event.rsvp_cancellation_notice_hours) {
      return `You may cancel your RSVP at any time. Refunds are only available if cancelled at least ${event.rsvp_cancellation_notice_hours} hours before the event.`;
    }
    return 'You may cancel your RSVP at any time for a full refund.';
  }

  // Validate guest count against capacity
  const maxGuests = spotsRemaining !== null ? Math.max(spotsRemaining, 1) : 100;

  async function handleSubmit() {
    if (guestCount < 1) {
      toast.error('Guest count must be at least 1.');
      return;
    }

    if (spotsRemaining !== null && guestCount > spotsRemaining) {
      toast.error(`Only ${spotsRemaining} spots remaining.`);
      return;
    }

    setSubmitting(true);

    try {
      const origin = window.location.origin;
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          guestCount,
          successUrl: `${origin}/${community.slug}/events?rsvp=success`,
          cancelUrl: `${origin}/${community.slug}/events?rsvp=cancelled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to RSVP. Please try again.');
        setSubmitting(false);
        return;
      }

      // If paid, redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Free RSVP succeeded
      toast.success('RSVP confirmed!');
      setGuestCount(1);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }

    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>RSVP</DialogTitle>
          <DialogDescription>
            Confirm your attendance for this event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Event summary */}
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-2">
            <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-text-muted-light dark:text-text-muted-dark">
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(startDate, 'MMM d, yyyy')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {format(startDate, 'h:mm a')} to {format(endDate, 'h:mm a')}
              </span>
            </div>
            {event.location && (
              <p className="inline-flex items-center gap-1.5 text-meta text-text-muted-light dark:text-text-muted-dark">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {event.location}
              </p>
            )}
          </div>

          {/* Terms */}
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-label text-text-secondary-light dark:text-text-secondary-dark font-semibold">
              <Info className="h-3.5 w-3.5" />
              Terms
            </div>
            <div className="space-y-1.5 text-meta text-text-muted-light dark:text-text-muted-dark">
              {hasFee ? (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    ${feePerUnit.toFixed(2)} {event.rsvp_fee_type === 'per_person' ? 'per person' : 'flat fee'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>Free</span>
                </div>
              )}
              {spotsRemaining !== null && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {spotsRemaining > 0 ? `${spotsRemaining} spots remaining` : 'Event is full'}
                  </span>
                </div>
              )}
              <p>{getCancellationPolicy()}</p>
            </div>
          </div>

          {/* Guest count */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Number of guests (including yourself)
            </label>
            <Input
              type="number"
              min={1}
              max={maxGuests}
              value={guestCount}
              onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          {/* Total fee display */}
          {hasFee && (
            <div className="flex items-center justify-between rounded-inner-card bg-secondary-50 dark:bg-secondary-950/20 p-3">
              <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                Total
              </span>
              <Badge variant="secondary" className="text-body font-semibold">
                ${totalFee.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || (spotsRemaining !== null && spotsRemaining <= 0)}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : hasFee ? (
              `RSVP & Pay $${totalFee.toFixed(2)}`
            ) : (
              'Confirm RSVP'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
