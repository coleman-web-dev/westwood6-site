'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { postInvoiceCreatedAction } from '@/lib/actions/accounting-actions';
import { applyWalletToInvoice } from '@/lib/utils/apply-wallet-to-invoices';
import type { ViolationWithUnit } from '@/app/[slug]/(protected)/violations/page';

interface IssueFineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: ViolationWithUnit;
  onFineIssued: () => void;
}

export function IssueFineDialog({
  open,
  onOpenChange,
  violation,
  onFineIssued,
}: IssueFineDialogProps) {
  const { community, member } = useCommunity();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Default due date: 30 days from today
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);
  const [dueDate, setDueDate] = useState(defaultDueDate.toISOString().split('T')[0]);

  const fineTitle = `Violation Fine: ${violation.title}`;

  async function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!dueDate) {
      toast.error('Please select a due date.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const amountCents = Math.round(parsedAmount * 100);

    const { data: inserted, error } = await supabase
      .from('invoices')
      .insert({
        community_id: community.id,
        unit_id: violation.unit_id,
        title: fineTitle,
        description: `Fine for violation: ${violation.title}`,
        notes: notes.trim() || null,
        amount: amountCents,
        due_date: dueDate,
        status: 'pending',
        violation_id: violation.id,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      setSaving(false);
      toast.error('Failed to issue fine.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'violation_fine_issued',
      targetType: 'invoice',
      targetId: inserted.id,
      metadata: {
        violation_id: violation.id,
        violation_title: violation.title,
        amount: amountCents,
      },
    });

    // Post accounting journal entry (silently skips if not set up)
    await postInvoiceCreatedAction(community.id, inserted.id, violation.unit_id, amountCents, fineTitle);

    // Auto-apply wallet balance
    await applyWalletToInvoice(
      supabase,
      inserted.id,
      amountCents,
      fineTitle,
      violation.unit_id,
      community.id,
      member?.id ?? null,
    );

    setSaving(false);
    toast.success(`Fine of $${parsedAmount.toFixed(2)} issued.`);

    // Reset form
    setAmount('');
    setNotes('');
    onOpenChange(false);
    onFineIssued();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Fine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="px-3 py-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2">
            <p className="text-label text-text-primary-light dark:text-text-primary-dark">
              {violation.title}
            </p>
            {violation.units?.unit_number && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Unit {violation.units.unit_number}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Fine Amount ($) *
            </Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Due Date *
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={saving || !amount}>
            {saving ? 'Issuing...' : 'Issue Fine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
