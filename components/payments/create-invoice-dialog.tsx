'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';  // still used for invoice insert
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
import { toast } from 'sonner';
import { applyWalletToInvoice } from '@/lib/utils/apply-wallet-to-invoices';
import { postInvoiceCreatedAction, postWalletAppliedAction } from '@/lib/actions/accounting-actions';
import { logAuditEvent } from '@/lib/audit';
import { UnitPicker } from '@/components/shared/unit-picker';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { community, member } = useCommunity();
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setUnitId('');
    setTitle('');
    setDescription('');
    setAmount('');
    setDueDate('');
    setNotes('');
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  async function handleSubmit() {
    if (!unitId || !title.trim() || !amount || !dueDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    setSubmitting(true);
    const supabase = createClient();

    const { data: inserted, error } = await supabase.from('invoices').insert({
      community_id: community.id,
      unit_id: unitId,
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      amount: amountCents,
      due_date: dueDate,
      status: 'pending',
    }).select('id').single();

    if (error || !inserted) {
      setSubmitting(false);
      toast.error('Failed to create invoice. Please try again.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoice_created',
      targetType: 'invoice',
      targetId: inserted.id,
      metadata: { title: title.trim(), amount: amountCents, unit_id: unitId, due_date: dueDate },
    });

    // Post accounting journal entry (silently skips if not set up)
    await postInvoiceCreatedAction(community.id, inserted.id, unitId, amountCents, title.trim());

    // Auto-apply wallet balance
    const result = await applyWalletToInvoice(
      supabase,
      inserted.id,
      amountCents,
      title.trim(),
      unitId,
      community.id,
      member?.id ?? null
    );

    // Post wallet applied accounting entry if wallet was used
    if (result.applied > 0) {
      await postWalletAppliedAction(community.id, inserted.id, unitId, result.applied);
    }

    setSubmitting(false);

    if (result.applied > 0) {
      const appliedDollars = (result.applied / 100).toFixed(2);
      if (result.invoiceStatus === 'paid') {
        toast.success(`Invoice created and paid from household wallet ($${appliedDollars}).`);
      } else {
        toast.success(`Invoice created. $${appliedDollars} applied from household wallet.`);
      }
    } else {
      toast.success('Invoice created.');
    }
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  const isValid = unitId && title.trim() && amount && dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a unit in this community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unit selector */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Unit <span className="text-destructive">*</span>
            </label>
            <UnitPicker
              communityId={community.id}
              value={unitId}
              onValueChange={setUnitId}
              placeholder="Select a unit..."
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Q1 2026 HOA Dues"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </label>
            <Textarea
              placeholder="Optional details about this invoice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Amount ($) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-nums"
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Due Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Notes
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional, visible to residents)
              </span>
            </label>
            <Textarea
              placeholder="Add a note to this invoice"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
          >
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
