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
import { toast } from 'sonner';
import type { Reservation } from '@/lib/types/database';

type ReservationWithDetails = Reservation & {
  amenities: { name: string };
  units: { unit_number: string };
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
  const [submitting, setSubmitting] = useState(false);

  // Reset method when a different reservation is opened
  useEffect(() => {
    if (reservation) {
      setMethod(reservation.deposit_stripe_payment_intent ? 'card' : 'wallet');
    }
  }, [reservation]);

  if (!reservation) return null;

  const depositDollars = (reservation.deposit_amount / 100).toFixed(2);

  async function handleSubmit() {
    if (!reservation || !member) return;

    setSubmitting(true);

    // Card refund goes through the API route (server-side Stripe call)
    if (method === 'card') {
      try {
        const response = await fetch('/api/amenities/deposit-refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: reservation.id,
            communityId: community.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setSubmitting(false);
          toast.error(data.error || 'Failed to process refund.');
          return;
        }

        setSubmitting(false);
        toast.success(`$${depositDollars} refunded to the original payment method.`);
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

    // 1. Mark deposit as refunded with the chosen method
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({
        deposit_refunded: true,
        deposit_return_method: method,
      })
      .eq('id', reservation.id);

    if (reservationError) {
      setSubmitting(false);
      toast.error('Failed to update reservation. Please try again.');
      return;
    }

    // 2. If wallet method, credit the household wallet
    if (method === 'wallet') {
      // Insert wallet transaction
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        unit_id: reservation.unit_id,
        community_id: community.id,
        member_id: member.id,
        amount: reservation.deposit_amount,
        type: 'deposit_return' as const,
        reference_id: reservation.id,
        description: `Deposit return: ${reservation.amenities.name}`,
        created_by: member.id,
      });

      if (txError) {
        setSubmitting(false);
        toast.error('Deposit marked as returned but wallet credit failed. Please add credit manually.');
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Atomically increment wallet balance to avoid race conditions
      const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
        p_unit_id: reservation.unit_id,
        p_community_id: community.id,
        p_amount: reservation.deposit_amount,
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
            balance: currentBalance + reservation.deposit_amount,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'unit_id' });
      }
    }

    setSubmitting(false);

    if (method === 'wallet') {
      toast.success(`$${depositDollars} deposit applied to household wallet.`);
    } else {
      toast.success('Deposit marked as returned via check.');
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
            Choose how to return the security deposit for this reservation.
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
                Unit {reservation.units.unit_number}
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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing...' : 'Return Security Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
