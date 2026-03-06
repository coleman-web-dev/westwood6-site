'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { ArrowRightLeft } from 'lucide-react';
import { postInterFundTransferAction } from '@/lib/actions/accounting-actions';
import { toast } from 'sonner';

interface Props {
  communityId: string;
  onComplete?: () => void;
}

export function InterFundTransferDialog({ communityId, onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [fromFund, setFromFund] = useState<'operating' | 'reserve'>('operating');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const toFund = fromFund === 'operating' ? 'reserve' : 'operating';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!description.trim()) {
      toast.error('Enter a description');
      return;
    }

    setSaving(true);
    const result = await postInterFundTransferAction({
      communityId,
      fromFund,
      toFund,
      amount: cents,
      description,
      entryDate: date,
      memo: memo || undefined,
    });
    setSaving(false);

    if (result.success) {
      toast.success('Transfer posted successfully');
      setOpen(false);
      setAmount('');
      setDescription('');
      setMemo('');
      onComplete?.();
    } else {
      toast.error(result.error || 'Failed to post transfer');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Fund Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark">
        <DialogHeader>
          <DialogTitle className="text-text-primary-light dark:text-text-primary-dark">
            Inter-Fund Transfer
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                From Fund
              </Label>
              <select
                value={fromFund}
                onChange={(e) => setFromFund(e.target.value as 'operating' | 'reserve')}
                className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark"
              >
                <option value="operating">Operating Fund</option>
                <option value="reserve">Reserve Fund</option>
              </select>
            </div>
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                To Fund
              </Label>
              <div className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark capitalize">
                {toFund} Fund
              </div>
            </div>
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Amount
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly reserve contribution"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Memo (optional)
            </Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Internal notes"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Posting...' : 'Post Transfer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
