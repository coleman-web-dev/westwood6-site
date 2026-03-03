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
import { Textarea } from '@/components/shared/ui/textarea';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { BudgetCategory } from '@/lib/types/database';

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onCreated: () => void;
}

export function AddLineItemDialog({
  open,
  onOpenChange,
  budgetId,
  onCreated,
}: AddLineItemDialogProps) {
  const [category, setCategory] = useState<BudgetCategory>('other');
  const [name, setName] = useState('');
  const [budgetedAmount, setBudgetedAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Please enter a name.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from('budget_line_items').insert({
      budget_id: budgetId,
      category,
      name: name.trim(),
      budgeted_amount: budgetedAmount ? Math.round(Number(budgetedAmount) * 100) : 0,
      actual_amount: actualAmount ? Math.round(Number(actualAmount) * 100) : 0,
      is_income: isIncome,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to add line item.');
      return;
    }

    toast.success('Line item added.');
    setName('');
    setBudgetedAmount('');
    setActualAmount('');
    setNotes('');
    setIsIncome(false);
    setCategory('other');
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark">
                Income item
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Toggle on for income, off for expense
              </p>
            </div>
            <Switch checked={isIncome} onCheckedChange={setIsIncome} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BudgetCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dues">Dues</SelectItem>
                  <SelectItem value="assessments">Assessments</SelectItem>
                  <SelectItem value="amenity_fees">Amenity Fees</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="landscaping">Landscaping</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="reserves">Reserves</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Name *
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Line item name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Budgeted ($)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={budgetedAmount}
                onChange={(e) => setBudgetedAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Actual ($)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
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
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
