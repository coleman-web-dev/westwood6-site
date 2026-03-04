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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { postManualJournalEntryAction } from '@/lib/actions/accounting-actions';
import type { Account } from '@/lib/types/accounting';

interface Line {
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
}

function emptyLine(): Line {
  return { accountCode: '', debit: '', credit: '', description: '' };
}

interface CreateJournalEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  onSuccess: () => void;
}

export function CreateJournalEntryDialog({
  open,
  onOpenChange,
  communityId,
  onSuccess,
}: CreateJournalEntryDialogProps) {
  const { member } = useCommunity();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    async function loadAccounts() {
      const supabase = createClient();
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('display_order');
      setAccounts((data as Account[]) || []);
    }
    loadAccounts();
  }, [open, communityId]);

  useEffect(() => {
    if (!open) {
      setEntryDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setMemo('');
      setLines([emptyLine(), emptyLine()]);
    }
  }, [open]);

  function updateLine(index: number, field: keyof Line, value: string) {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Clear the opposite field if entering debit/credit
      if (field === 'debit' && value) {
        updated[index].credit = '';
      } else if (field === 'credit' && value) {
        updated[index].debit = '';
      }
      return updated;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  async function handleSubmit() {
    if (!description.trim()) {
      toast.error('Description is required.');
      return;
    }

    if (!isBalanced) {
      toast.error('Entry must be balanced. Total debits must equal total credits.');
      return;
    }

    const validLines = lines
      .filter((l) => l.accountCode && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        accountCode: l.accountCode,
        debit: Math.round((parseFloat(l.debit) || 0) * 100),
        credit: Math.round((parseFloat(l.credit) || 0) * 100),
        description: l.description || undefined,
      }));

    if (validLines.length < 2) {
      toast.error('At least two lines are required.');
      return;
    }

    setSubmitting(true);
    const result = await postManualJournalEntryAction({
      communityId,
      entryDate,
      description: description.trim(),
      memo: memo.trim() || undefined,
      createdBy: member?.id,
      lines: validLines,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to create entry.');
      return;
    }

    toast.success('Journal entry created.');
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
          <DialogDescription>
            Create a manual journal entry. Debits must equal credits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Insurance payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Memo
            </label>
            <Textarea
              placeholder="Optional notes"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Journal lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_90px_90px_1fr_32px] gap-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">
              <span>Account</span>
              <span>Debit ($)</span>
              <span>Credit ($)</span>
              <span>Description</span>
              <span />
            </div>

            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px_1fr_32px] gap-2 items-center">
                <Select value={line.accountCode} onValueChange={(v) => updateLine(i, 'accountCode', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.code}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={line.debit}
                  onChange={(e) => updateLine(i, 'debit', e.target.value)}
                  className="h-9 tabular-nums text-sm"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={line.credit}
                  onChange={(e) => updateLine(i, 'credit', e.target.value)}
                  className="h-9 tabular-nums text-sm"
                />
                <Input
                  placeholder="Optional"
                  value={line.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                  className="h-9 text-sm"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length <= 2}
                  className="p-1.5 rounded-md text-text-muted-light dark:text-text-muted-dark hover:text-destructive disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button type="button" variant="ghost" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </div>

          {/* Balance indicator */}
          <div className={`rounded-inner-card px-4 py-2 text-body font-medium ${
            isBalanced
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            Debits: ${totalDebit.toFixed(2)} | Credits: ${totalCredit.toFixed(2)}
            {isBalanced ? ' (Balanced)' : ` (Off by $${Math.abs(totalDebit - totalCredit).toFixed(2)})`}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !isBalanced || !description.trim()}>
            {submitting ? 'Creating...' : 'Post Entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
