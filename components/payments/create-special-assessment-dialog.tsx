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
import { Textarea } from '@/components/shared/ui/textarea';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { generateInvoicesForAssessment } from '@/lib/utils/generate-assessment-invoices';
import { applyWalletToInvoiceBatch } from '@/lib/utils/apply-wallet-to-invoices';
import type { Unit, PaymentFrequency } from '@/lib/types/database';

interface CreateSpecialAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSpecialAssessmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSpecialAssessmentDialogProps) {
  const { community, member } = useCommunity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [generateImmediately, setGenerateImmediately] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle('');
    setDescription('');
    setTotalAmount('');
    setInstallments('1');
    setStartDate('');
    setGenerateImmediately(true);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const parsedInstallments = parseInt(installments, 10);
  const parsedAmount = parseFloat(totalAmount);
  const perInstallment =
    !isNaN(parsedAmount) && parsedAmount > 0 && !isNaN(parsedInstallments) && parsedInstallments >= 1
      ? parsedAmount / parsedInstallments
      : 0;

  async function handleSubmit() {
    if (!member) return;

    if (!title.trim() || !totalAmount || !startDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid total amount.');
      return;
    }

    if (isNaN(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 24) {
      toast.error('Installments must be between 1 and 24.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    // Calculate fiscal_year_end from start date + installments
    const endDate = new Date(startDate + 'T00:00:00');
    if (parsedInstallments > 1) {
      endDate.setMonth(endDate.getMonth() + parsedInstallments - 1);
    }
    const fiscalEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    setSubmitting(true);
    const supabase = createClient();

    const { data: assessment, error } = await supabase
      .from('assessments')
      .insert({
        community_id: community.id,
        title: title.trim(),
        description: description.trim() || null,
        annual_amount: amountCents,
        fiscal_year_start: startDate,
        fiscal_year_end: fiscalEnd,
        type: 'special',
        installments: parsedInstallments,
        installment_start_date: startDate,
        created_by: member.id,
      })
      .select()
      .single();

    if (error || !assessment) {
      setSubmitting(false);
      toast.error('Failed to create special assessment. Please try again.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'assessment_created',
      targetType: 'assessment',
      targetId: assessment.id,
      metadata: { title: title.trim(), type: 'special', amount: amountCents, installments: parsedInstallments },
    });

    // Generate invoices immediately if checked
    if (generateImmediately) {
      const { data: unitData } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active');

      const units = (unitData as Unit[]) ?? [];

      if (units.length > 0) {
        const defaultFreq = (community.theme?.payment_settings?.default_frequency ?? 'quarterly') as PaymentFrequency;
        const invoices = generateInvoicesForAssessment(assessment, units, defaultFreq);

        if (invoices.length > 0) {
          const { data: inserted, error: invoiceError } = await supabase
            .from('invoices')
            .insert(invoices)
            .select('id, amount, unit_id, title');

          if (invoiceError || !inserted) {
            setSubmitting(false);
            toast.error('Assessment created, but invoice generation failed. You can generate them manually.');
            onOpenChange(false);
            onSuccess();
            return;
          }

          // Auto-apply wallet balances
          const walletResult = await applyWalletToInvoiceBatch(
            supabase,
            inserted as { id: string; amount: number; unit_id: string; title: string }[],
            community.id,
            member?.id ?? null
          );

          setSubmitting(false);

          if (walletResult.totalApplied > 0) {
            const appliedDollars = (walletResult.totalApplied / 100).toFixed(2);
            toast.success(
              `Special assessment created. ${invoices.length} invoices generated. $${appliedDollars} applied from wallet credits.`
            );
          } else {
            toast.success(`Special assessment created. ${invoices.length} invoices generated for ${units.length} units.`);
          }
        } else {
          setSubmitting(false);
          toast.success('Special assessment created. No invoices to generate.');
        }
      } else {
        setSubmitting(false);
        toast.success('Special assessment created. No active units found to invoice.');
      }
    } else {
      setSubmitting(false);
      toast.success('Special assessment created. Use "Generate Invoices" to create invoices.');
    }

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  const isValid = title.trim() && totalAmount && startDate && !isNaN(parsedInstallments) && parsedInstallments >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Special Assessment</DialogTitle>
          <DialogDescription>
            Levy a one-time charge across all units, optionally split into monthly installments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Pool Resurfacing Assessment"
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
              placeholder="Reason for this special assessment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Total Amount */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Total Amount ($) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="tabular-nums"
            />
          </div>

          {/* Number of Installments */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Number of Installments
            </label>
            <Input
              type="number"
              min="1"
              max="24"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              className="tabular-nums"
            />
            {perInstallment > 0 && parsedInstallments > 1 && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                ~${perInstallment.toFixed(2)} per installment
              </p>
            )}
          </div>

          {/* First Installment Due Date */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              {parsedInstallments > 1 ? 'First Installment Due Date' : 'Due Date'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Generate immediately checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="generate-immediately"
              checked={generateImmediately}
              onCheckedChange={(checked) => setGenerateImmediately(checked === true)}
            />
            <label
              htmlFor="generate-immediately"
              className="text-body text-text-secondary-light dark:text-text-secondary-dark cursor-pointer"
            >
              Generate invoices for all units immediately
            </label>
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
            {submitting ? 'Creating...' : 'Create Special Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
