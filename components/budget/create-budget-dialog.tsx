'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import { Label } from '@/components/shared/ui/label';
import { toast } from 'sonner';

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  memberId: string | null;
  existingYears: number[];
  onCreated: () => void;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  communityId,
  memberId,
  existingYears,
  onCreated,
}: CreateBudgetDialogProps) {
  const currentYear = new Date().getFullYear();
  // Default to the next fiscal year that doesn't already have a budget
  const defaultYear = (() => {
    let year = currentYear;
    while (existingYears.includes(year)) year++;
    return year;
  })();
  const [fiscalYear, setFiscalYear] = useState(defaultYear);
  const [reserveContribution, setReserveContribution] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (existingYears.includes(fiscalYear)) {
      toast.error(`A budget for FY ${fiscalYear} already exists.`);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('budgets').insert({
      community_id: communityId,
      fiscal_year: fiscalYear,
      reserve_contribution: reserveContribution ? Math.round(Number(reserveContribution) * 100) : 0,
      created_by: memberId,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to create budget.');
      return;
    }

    toast.success(`Budget for FY ${fiscalYear} created.`);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Fiscal Year
            </Label>
            <Input
              type="number"
              min={2020}
              max={2099}
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Reserve contribution ($)
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={reserveContribution}
              onChange={(e) => setReserveContribution(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Budget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
