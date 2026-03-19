'use client';

import { useState } from 'react';
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
import { logAuditEvent } from '@/lib/audit';
import {
  postPaymentReceivedAction,
  postOverpaymentWalletCreditAction,
} from '@/lib/actions/accounting-actions';
import {
  PaymentMethodLinesInput,
  createEmptyLine,
  linesToPaymentMethods,
  sumLineCents,
  formatPaymentMethods,
  type PaymentMethodLineInput,
} from '@/components/shared/payment-method-lines-input';
import type { Invoice } from '@/lib/types/database';

interface RecordPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  unitOwnerName?: string;
}

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
  unitOwnerName,
}: RecordPaymentDialogProps) {
  const { community, member } = useCommunity();
  const [lines, setLines] = useState<PaymentMethodLineInput[]>([createEmptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setLines([createEmptyLine()]);
  }

  // When dialog opens with a new invoice, pre-fill the remaining balance
  function handleOpenChange(isOpen: boolean) {
    if (isOpen && invoice) {
      const remaining = invoice.amount - (invoice.amount_paid || 0);
      setLines([createEmptyLine((remaining / 100).toFixed(2))]);
    }
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  }

  async function handleSubmit() {
    if (!invoice || !member) return;

    const amountCents = sumLineCents(lines);
    if (amountCents <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    const remaining = invoice.amount - (invoice.amount_paid || 0);

    setSubmitting(true);
    const supabase = createClient();

    // Build payment methods JSONB and description
    const paymentMethods = linesToPaymentMethods(lines);
    const refDesc = formatPaymentMethods(paymentMethods);

    // 1. Create payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      unit_id: invoice.unit_id,
      amount: amountCents,
      paid_by: member.id,
      stripe_session_id: null,
      stripe_payment_intent: null,
      payment_methods: paymentMethods,
    });

    if (paymentError) {
      setSubmitting(false);
      toast.error('Failed to record payment. Please try again.');
      return;
    }

    // 2. Calculate new total paid and determine invoice status
    const newTotalPaid = (invoice.amount_paid || 0) + amountCents;
    const isFullyPaid = newTotalPaid >= invoice.amount;

    const invoiceUpdate: Record<string, unknown> = {
      amount_paid: Math.min(newTotalPaid, invoice.amount),
      status: isFullyPaid ? 'paid' : 'partial',
      notes: invoice.notes
        ? `${invoice.notes}\n${refDesc} recorded ${new Date().toLocaleDateString()}`
        : `${refDesc} recorded ${new Date().toLocaleDateString()}`,
    };

    if (isFullyPaid) {
      invoiceUpdate.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(invoiceUpdate)
      .eq('id', invoice.id);

    if (updateError) {
      setSubmitting(false);
      toast.error('Payment recorded but failed to update invoice status.');
      return;
    }

    // 3. Handle overpayment: credit excess to wallet
    const excess = newTotalPaid - invoice.amount;
    if (excess > 0) {
      // Upsert wallet balance
      const { data: wallet } = await supabase
        .from('unit_wallets')
        .select('balance')
        .eq('unit_id', invoice.unit_id)
        .single();

      const newBalance = (wallet?.balance ?? 0) + excess;

      await supabase.from('unit_wallets').upsert(
        {
          unit_id: invoice.unit_id,
          community_id: community.id,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unit_id' },
      );

      // Log wallet transaction
      await supabase.from('wallet_transactions').insert({
        unit_id: invoice.unit_id,
        community_id: community.id,
        member_id: member.id,
        amount: excess,
        type: 'overpayment',
        reference_id: invoice.id,
        description: `Overpayment on: ${invoice.title} (${refDesc})`,
        created_by: member.id,
      });
    }

    setSubmitting(false);

    // 4. Post GL entries (fire-and-forget)
    // DR 1000 (Operating Cash), CR 1100 (Accounts Receivable)
    const glAmount = isFullyPaid ? remaining : amountCents;
    void postPaymentReceivedAction(
      community.id,
      invoice.id,
      invoice.unit_id,
      glAmount,
      `${invoice.title} (${refDesc})`,
    );

    // If overpayment, post overpayment entry: DR 1000, CR 2110
    if (excess > 0) {
      void postOverpaymentWalletCreditAction(
        community.id,
        invoice.id,
        invoice.unit_id,
        excess,
      );
    }

    // 5. Audit log
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'manual_payment_recorded',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: {
        title: invoice.title,
        amount: amountCents,
        payment_methods: paymentMethods,
        overpayment: excess > 0 ? excess : undefined,
      },
    });

    const successMsg = excess > 0
      ? `Payment recorded. $${(excess / 100).toFixed(2)} overpayment credited to wallet.`
      : isFullyPaid
        ? 'Payment recorded. Invoice marked as paid.'
        : `Payment recorded. $${((remaining - amountCents) / 100).toFixed(2)} remaining.`;

    toast.success(successMsg);
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  if (!invoice) return null;

  const remaining = invoice.amount - (invoice.amount_paid || 0);
  const totalCents = sumLineCents(lines);
  const excess = totalCents > remaining ? totalCents - remaining : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a check, cash, or other manual payment for this invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice summary */}
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
            <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
              {invoice.title}
            </p>
            {unitOwnerName && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {unitOwnerName}
              </p>
            )}
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">
                Invoice total
              </span>
              <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                ${(invoice.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <div className="flex justify-between text-body">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">
                  Already paid
                </span>
                <span className="tabular-nums text-green-600 dark:text-green-400">
                  ${((invoice.amount_paid || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between text-label font-semibold border-t border-stroke-light dark:border-stroke-dark pt-1">
              <span className="text-text-primary-light dark:text-text-primary-dark">
                Balance due
              </span>
              <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                ${(remaining / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment method lines */}
          <PaymentMethodLinesInput
            lines={lines}
            onChange={setLines}
            totalAmount={remaining}
          />

          {/* Overpayment warning */}
          {excess > 0 && (
            <div className="rounded-inner-card bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-label text-amber-800 dark:text-amber-200">
                This payment exceeds the balance due by ${(excess / 100).toFixed(2)}.
                The excess will be credited to the unit&apos;s wallet.
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
            disabled={submitting || totalCents <= 0}
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
