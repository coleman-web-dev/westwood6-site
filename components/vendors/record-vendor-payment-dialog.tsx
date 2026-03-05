'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { postVendorPaymentAction } from '@/lib/actions/accounting-actions';
import type { Vendor } from '@/lib/types/database';
import type { Account } from '@/lib/types/accounting';

interface RecordVendorPaymentDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  memberId?: string;
  onRecorded: () => void;
}

export function RecordVendorPaymentDialog({
  vendor,
  open,
  onOpenChange,
  communityId,
  memberId,
  onRecorded,
}: RecordVendorPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [expenseAccountCode, setExpenseAccountCode] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!open || !communityId) return;
    const supabase = createClient();
    supabase
      .from('accounts')
      .select('*')
      .eq('community_id', communityId)
      .eq('account_type', 'expense')
      .eq('is_active', true)
      .order('code', { ascending: true })
      .then(({ data }) => {
        setExpenseAccounts((data as Account[]) ?? []);
      });
  }, [open, communityId]);

  useEffect(() => {
    if (vendor) {
      setDescription(`Payment to ${vendor.company || vendor.name}`);
    }
  }, [vendor]);

  async function handleSubmit() {
    if (!vendor) return;

    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!expenseAccountCode) {
      toast.error('Please select an expense account.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description.');
      return;
    }

    setSaving(true);
    const result = await postVendorPaymentAction({
      communityId,
      vendorId: vendor.id,
      amount: cents,
      expenseAccountCode,
      description: description.trim(),
      entryDate: paymentDate,
      memo: memo.trim() || undefined,
      createdBy: memberId,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to record payment.');
      return;
    }

    toast.success('Vendor payment recorded.');
    setAmount('');
    setExpenseAccountCode('');
    setDescription('');
    setMemo('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
    onRecorded();
  }

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment to {vendor.company || vendor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark text-body">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Payment date *
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Expense account *
            </Label>
            <Select value={expenseAccountCode} onValueChange={setExpenseAccountCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map((acct) => (
                  <SelectItem key={acct.id} value={acct.code}>
                    {acct.code} - {acct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description *
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this payment for?"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Memo
            </Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Check number, invoice reference, etc."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
