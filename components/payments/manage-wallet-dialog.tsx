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
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';

interface ManageWalletDialogProps {
  unitId: string;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageWalletDialog({
  unitId,
  currentBalance,
  open,
  onOpenChange,
  onSuccess,
}: ManageWalletDialogProps) {
  const { community, member } = useCommunity();
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setType('credit');
    setAmount('');
    setDescription('');
  }

  async function handleSubmit() {
    if (!member) return;

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than zero.');
      return;
    }

    const cents = Math.round(parsedAmount * 100);
    const signedAmount = type === 'credit' ? cents : -cents;
    const newBalance = currentBalance + signedAmount;

    setSubmitting(true);
    const supabase = createClient();

    // Insert wallet transaction
    const { error: txError } = await supabase.from('wallet_transactions').insert({
      unit_id: unitId,
      community_id: community.id,
      member_id: member.id,
      amount: signedAmount,
      type: type === 'credit' ? 'manual_credit' : 'manual_debit',
      description: description.trim() || null,
      created_by: member.id,
    });

    if (txError) {
      setSubmitting(false);
      toast.error('Failed to record transaction. Please try again.');
      return;
    }

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('unit_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('unit_id', unitId);

    setSubmitting(false);

    if (walletError) {
      toast.error('Transaction recorded but balance update failed. Please contact support.');
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: type === 'credit' ? 'wallet_credit' : 'wallet_debit',
      targetType: 'wallet',
      targetId: unitId,
      metadata: { amount: cents, description: description.trim() || null, new_balance: newBalance },
    });

    toast.success(
      type === 'credit'
        ? `$${parsedAmount.toFixed(2)} credit added.`
        : `$${parsedAmount.toFixed(2)} debit applied.`
    );

    resetForm();
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Wallet Credit</DialogTitle>
          <DialogDescription>
            Current balance: ${(currentBalance / 100).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Type
            </label>
            <Select value={type} onValueChange={(v) => setType(v as 'credit' | 'debit')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (add funds)</SelectItem>
                <SelectItem value="debit">Debit (remove funds)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Amount ($)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-nums"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Description
              <span className="ml-1 text-text-muted-light dark:text-text-muted-dark font-normal">
                (optional)
              </span>
            </label>
            <Textarea
              placeholder="Reason for adjustment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Processing...' : type === 'credit' ? 'Add Credit' : 'Apply Debit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
