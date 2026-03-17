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
import { Input } from '@/components/shared/ui/input';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { postBouncedCheckReversalAction, postInvoiceVoidedAction } from '@/lib/actions/accounting-actions';
import type { Invoice } from '@/lib/types/database';

interface BounceInvoiceDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BounceInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: BounceInvoiceDialogProps) {
  const { community, member } = useCommunity();
  const [fee, setFee] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setFee('');
  }

  async function handleSubmit() {
    if (!invoice || !member) return;

    const parsedFee = fee ? parseFloat(fee) : 0;
    if (fee && (isNaN(parsedFee) || parsedFee < 0)) {
      toast.error('Please enter a valid fee amount.');
      return;
    }

    const feeCents = Math.round(parsedFee * 100);

    setSubmitting(true);
    const supabase = createClient();

    // 1. Void the original invoice
    const { error: voidError } = await supabase
      .from('invoices')
      .update({ status: 'voided' })
      .eq('id', invoice.id);

    if (voidError) {
      setSubmitting(false);
      toast.error('Failed to void the original invoice.');
      return;
    }

    // 2. Record bounced reversal in wallet transactions
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      unit_id: invoice.unit_id,
      community_id: community.id,
      member_id: member.id,
      amount: -invoice.amount,
      type: 'bounced_reversal',
      reference_id: invoice.id,
      description: `Bounced check reversal: ${invoice.title}`,
      created_by: member.id,
    });

    if (txError) {
      // Non-fatal, the void already happened
      console.error('Failed to record wallet reversal:', txError);
    }

    // 3. Create new invoice with original amount + fee, preserving original due_date
    const { error: invoiceError } = await supabase.from('invoices').insert({
      community_id: community.id,
      unit_id: invoice.unit_id,
      title: invoice.title + (feeCents > 0 ? ' (incl. bounced check fee)' : ' (rebilled)'),
      description: invoice.description,
      notes: `Rebilled due to bounced check.${feeCents > 0 ? ` Includes $${parsedFee.toFixed(2)} bounced check fee.` : ''}`,
      amount: invoice.amount + feeCents,
      due_date: invoice.due_date,
      status: 'pending',
      bounced_from_invoice_id: invoice.id,
    });

    setSubmitting(false);

    if (invoiceError) {
      toast.error('Original invoice voided, but failed to create replacement. Please create manually.');
      return;
    }

    // GL: void the original invoice and reverse the payment
    void postInvoiceVoidedAction(community.id, invoice.id, invoice.unit_id, invoice.amount, invoice.title);
    void postBouncedCheckReversalAction(community.id, invoice.id, invoice.unit_id, invoice.amount, invoice.title);

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoice_bounced',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { title: invoice.title, original_amount: invoice.amount, fee: feeCents },
    });

    toast.success('Bounced payment processed. New invoice created with original due date.');
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Bounced</DialogTitle>
          <DialogDescription>
            This will void the original invoice and create a new one with the original due date ({new Date(invoice.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
            <div className="flex justify-between text-body">
              <span className="text-text-secondary-light dark:text-text-secondary-dark">Original amount</span>
              <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                ${(invoice.amount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bounced check fee */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Bounced Check Fee ($)
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="tabular-nums"
            />
          </div>

          {fee && parseFloat(fee) > 0 && (
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
              <div className="flex justify-between text-label">
                <span className="text-text-primary-light dark:text-text-primary-dark">New invoice total</span>
                <span className="tabular-nums text-text-primary-light dark:text-text-primary-dark">
                  ${((invoice.amount / 100) + parseFloat(fee)).toFixed(2)}
                </span>
              </div>
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
            variant="destructive"
          >
            {submitting ? 'Processing...' : 'Process Bounced Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
