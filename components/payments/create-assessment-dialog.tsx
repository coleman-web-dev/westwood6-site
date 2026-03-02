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
import { toast } from 'sonner';

interface CreateAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAssessmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAssessmentDialogProps) {
  const { community, member } = useCommunity();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [annualAmount, setAnnualAmount] = useState('');
  const [fiscalYearStart, setFiscalYearStart] = useState('');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle('');
    setDescription('');
    setAnnualAmount('');
    setFiscalYearStart('');
    setFiscalYearEnd('');
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  async function handleSubmit() {
    if (!member) return;

    if (!title.trim() || !annualAmount || !fiscalYearStart || !fiscalYearEnd) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const parsedAmount = parseFloat(annualAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid annual amount.');
      return;
    }

    if (fiscalYearEnd <= fiscalYearStart) {
      toast.error('Fiscal year end must be after the start date.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from('assessments').insert({
      community_id: community.id,
      title: title.trim(),
      description: description.trim() || null,
      annual_amount: amountCents,
      fiscal_year_start: fiscalYearStart,
      fiscal_year_end: fiscalYearEnd,
      created_by: member.id,
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to create assessment. Please try again.');
      return;
    }

    toast.success('Assessment created. You can now generate invoices for it.');
    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  const isValid = title.trim() && annualAmount && fiscalYearStart && fiscalYearEnd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Assessment</DialogTitle>
          <DialogDescription>
            Define a recurring annual charge. After creating, use &quot;Generate Invoices&quot; to
            create invoices for all units.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. HOA Dues 2026"
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
              placeholder="Optional details about this assessment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Annual Amount */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Annual Amount ($) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={annualAmount}
              onChange={(e) => setAnnualAmount(e.target.value)}
              className="tabular-nums"
            />
          </div>

          {/* Fiscal Year Start */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Fiscal Year Start <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Fiscal Year End */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Fiscal Year End <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={fiscalYearEnd}
              onChange={(e) => setFiscalYearEnd(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            {submitting ? 'Creating...' : 'Create Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
