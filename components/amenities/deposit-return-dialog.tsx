'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { postAmenityDepositReturnedAction, postAmenityDepositRetainedAction } from '@/lib/actions/accounting-actions';
import type { Reservation } from '@/lib/types/database';

type ReservationWithDetails = Reservation & {
  amenities: { name: string };
  units: { unit_number: string } | null;
};

interface DepositReturnDialogProps {
  reservation: ReservationWithDetails | null;
  unitOwnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DepositReturnDialog({
  reservation,
  unitOwnerName,
  open,
  onOpenChange,
  onSuccess,
}: DepositReturnDialogProps) {
  const { community, member } = useCommunity();
  const paidByCard = !!reservation?.deposit_stripe_payment_intent;
  const [method, setMethod] = useState<'check' | 'wallet' | 'card'>(paidByCard ? 'card' : 'wallet');
  const [refundAmountStr, setRefundAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state when a different reservation is opened
  useEffect(() => {
    if (reservation) {
      setMethod(reservation.deposit_stripe_payment_intent ? 'card' : 'wallet');
      setRefundAmountStr((reservation.deposit_amount / 100).toFixed(2));
    }
  }, [reservation]);

  if (!reservation) return null;

  const depositDollars = (reservation.deposit_amount / 100).toFixed(2);
  const refundCents = Math.round(parseFloat(refundAmountStr || '0') * 100);
  const retainedCents = reservation.deposit_amount - refundCents;
  const isPartial = refundCents > 0 && refundCents < reservation.deposit_amount;
  const isValidAmount = refundCents > 0 && refundCents <= reservation.deposit_amount;

  async function handleSubmit() {
    if (!reservation || !member) return;
    if (!isValidAmount) {
      toast.error('Please enter a valid refund amount.');
      return;
    }

    setSubmitting(true);

    const depositUpdate = {
      deposit_refunded: true,
      deposit_return_method: method,
      deposit_refund_amount: refundCents,
    };

    // Card refund goes through the API route (server-side Stripe call)
    if (method === 'card') {
      try {
        const response = await fetch('/api/amenities/deposit-refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: reservation.id,
            communityId: community.id,
            amount: refundCents,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setSubmitting(false);
          toast.error(data.error || 'Failed to process refund.');
          return;
        }

        setSubmitting(false);
        const refundDollars = (refundCents / 100).toFixed(2);
        if (isPartial) {
          toast.success(`$${refundDollars} refunded to card. $${(retainedCents / 100).toFixed(2)} retained.`);
        } else {
          toast.success(`$${refundDollars} refunded to the original payment method.`);
        }
        // GL: return portion
        if (reservation.unit_id) void postAmenityDepositReturnedAction(community.id, reservation.id, reservation.unit_id, refundCents, reservation.amenities.name);
        // GL: retained portion as income
        if (retainedCents > 0 && reservation.unit_id) {
          void postAmenityDepositRetainedAction(community.id, reservation.id, reservation.unit_id, retainedCents, reservation.amenities.name);
        }
        logAuditEvent({
          communityId: community.id,
          actorId: member?.user_id,
          actorEmail: member?.email,
          action: 'deposit_returned',
          targetType: 'reservation',
          targetId: reservation.id,
          metadata: {
            method: 'card',
            amount: refundCents,
            retained: retainedCents,
            full_deposit: reservation.deposit_amount,
            amenity: reservation.amenities.name,
          },
        });
        // Notify unit members about deposit return
        if (reservation.unit_id) {
          const supabase = createClient();
          const { data: unitMembers } = await supabase
            .from('members')
            .select('id')
            .eq('unit_id', reservation.unit_id)
            .eq('community_id', community.id);
          if (unitMembers && unitMembers.length > 0) {
            void supabase.rpc('create_member_notifications', {
              p_community_id: community.id,
              p_type: 'deposit_returned',
              p_title: `Deposit returned: ${reservation.amenities.name}`,
              p_body: `$${(refundCents / 100).toFixed(2)} has been refunded to your card.`,
              p_reference_id: reservation.id,
              p_reference_type: 'reservation',
              p_member_ids: unitMembers.map((m: { id: string }) => m.id),
            });
          }
        }
        onOpenChange(false);
        onSuccess();
        return;
      } catch {
        setSubmitting(false);
        toast.error('Something went wrong processing the refund.');
        return;
      }
    }

    // Wallet and check methods handled client-side
    const supabase = createClient();

    // 1. Mark deposit as refunded with the chosen method and amount
    const { error: reservationError } = await supabase
      .from('reservations')
      .update(depositUpdate)
      .eq('id', reservation.id);

    if (reservationError) {
      setSubmitting(false);
      toast.error('Failed to update reservation. Please try again.');
      return;
    }

    // 2. If wallet method, credit the household wallet with refund amount
    if (method === 'wallet') {
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        unit_id: reservation.unit_id,
        community_id: community.id,
        member_id: member.id,
        amount: refundCents,
        type: 'deposit_return' as const,
        reference_id: reservation.id,
        description: isPartial
          ? `Partial deposit return: ${reservation.amenities.name} ($${(refundCents / 100).toFixed(2)} of $${depositDollars})`
          : `Deposit return: ${reservation.amenities.name}`,
        created_by: member.id,
      });

      if (txError) {
        setSubmitting(false);
        toast.error('Deposit marked as returned but wallet credit failed. Please add credit manually.');
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Atomically increment wallet balance
      const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
        p_unit_id: reservation.unit_id,
        p_community_id: community.id,
        p_amount: refundCents,
      });

      if (walletError) {
        // Fallback: try direct update with current balance
        const { data: wallet } = await supabase
          .from('unit_wallets')
          .select('balance')
          .eq('unit_id', reservation.unit_id)
          .single();

        const currentBalance = wallet?.balance ?? 0;
        await supabase
          .from('unit_wallets')
          .upsert({
            unit_id: reservation.unit_id,
            community_id: community.id,
            balance: currentBalance + refundCents,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'unit_id' });
      }
    }

    setSubmitting(false);

    const refundDollars = (refundCents / 100).toFixed(2);
    if (method === 'wallet') {
      if (isPartial) {
        toast.success(`$${refundDollars} applied to wallet. $${(retainedCents / 100).toFixed(2)} retained.`);
      } else {
        toast.success(`$${refundDollars} deposit applied to household wallet.`);
      }
    } else {
      if (isPartial) {
        toast.success(`$${refundDollars} returned via check. $${(retainedCents / 100).toFixed(2)} retained.`);
      } else {
        toast.success('Deposit marked as returned via check.');
      }
    }

    // GL: return portion
    if (reservation.unit_id) void postAmenityDepositReturnedAction(community.id, reservation.id, reservation.unit_id, refundCents, reservation.amenities.name);
    // GL: retained portion as income
    if (retainedCents > 0 && reservation.unit_id) {
      void postAmenityDepositRetainedAction(community.id, reservation.id, reservation.unit_id, retainedCents, reservation.amenities.name);
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'deposit_returned',
      targetType: 'reservation',
      targetId: reservation.id,
      metadata: {
        method,
        amount: refundCents,
        retained: retainedCents,
        full_deposit: reservation.deposit_amount,
        amenity: reservation.amenities.name,
      },
    });

    // Notify unit members about deposit return
    if (reservation.unit_id) {
      const { data: unitMembers } = await supabase
        .from('members')
        .select('id')
        .eq('unit_id', reservation.unit_id)
        .eq('community_id', community.id);
      if (unitMembers && unitMembers.length > 0) {
        const methodLabel = method === 'wallet' ? 'household wallet' : 'check';
        void supabase.rpc('create_member_notifications', {
          p_community_id: community.id,
          p_type: 'deposit_returned',
          p_title: `Deposit returned: ${reservation.amenities.name}`,
          p_body: `$${(refundCents / 100).toFixed(2)} has been returned via ${methodLabel}.`,
          p_reference_id: reservation.id,
          p_reference_type: 'reservation',
          p_member_ids: unitMembers.map((m: { id: string }) => m.id),
        });
      }
    }

    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return Security Deposit</DialogTitle>
          <DialogDescription>
            Choose the amount and method to return the security deposit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Security deposit</span>
              <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark font-medium">${depositDollars}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Unit</span>
              <span className="text-text-primary-light dark:text-text-primary-dark">
                {reservation.units ? `Unit ${reservation.units.unit_number}` : 'Manual reservation'}
                {unitOwnerName ? ` - ${unitOwnerName}` : ''}
              </span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Amenity</span>
              <span className="text-text-primary-light dark:text-text-primary-dark">{reservation.amenities.name}</span>
            </div>
            {paidByCard && (
              <div className="flex justify-between text-body">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Payment method</span>
                <span className="text-text-primary-light dark:text-text-primary-dark">Credit card</span>
              </div>
            )}
          </div>

          {/* Refund amount */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Amount to return
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-body text-text-muted-light dark:text-text-muted-dark">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={(reservation.deposit_amount / 100).toFixed(2)}
                value={refundAmountStr}
                onChange={(e) => setRefundAmountStr(e.target.value)}
                className="pl-7 tabular-nums"
              />
            </div>
            {isPartial && retainedCents > 0 && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                ${(retainedCents / 100).toFixed(2)} will be retained by the association.
              </p>
            )}
            {!isValidAmount && refundAmountStr !== '' && (
              <p className="text-meta text-red-500">
                Amount must be between $0.01 and ${depositDollars}.
              </p>
            )}
          </div>

          {/* Return method */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Return method
            </label>
            <div className="space-y-2">
              {/* Refund to credit card (only when deposit was paid by card) */}
              {paidByCard && (
                <label className="flex items-center gap-3 p-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark cursor-pointer hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
                  <input
                    type="radio"
                    name="deposit-method"
                    value="card"
                    checked={method === 'card'}
                    onChange={() => setMethod('card')}
                    className="accent-primary-600"
                  />
                  <div>
                    <p className="text-label text-text-primary-light dark:text-text-primary-dark">Refund to credit card</p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      Refunds the deposit back to the original payment method via Stripe.
                    </p>
                  </div>
                </label>
              )}
              <label className="flex items-center gap-3 p-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark cursor-pointer hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
                <input
                  type="radio"
                  name="deposit-method"
                  value="wallet"
                  checked={method === 'wallet'}
                  onChange={() => setMethod('wallet')}
                  className="accent-primary-600"
                />
                <div>
                  <p className="text-label text-text-primary-light dark:text-text-primary-dark">Apply to household wallet</p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Credits the unit's wallet balance. Can be applied to future invoices.
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-inner-card border border-stroke-light dark:border-stroke-dark cursor-pointer hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors">
                <input
                  type="radio"
                  name="deposit-method"
                  value="check"
                  checked={method === 'check'}
                  onChange={() => setMethod('check')}
                  className="accent-primary-600"
                />
                <div>
                  <p className="text-label text-text-primary-light dark:text-text-primary-dark">Write a check</p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Return the security deposit by check. No wallet transaction recorded.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !isValidAmount}>
            {submitting ? 'Processing...' : isPartial ? `Return $${(refundCents / 100).toFixed(2)}` : 'Return Security Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
