'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import type { Account, AccountType, AccountFund } from '@/lib/types/accounting';

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  account: Account | null;
  onSuccess: () => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  communityId,
  account,
  onSuccess,
}: CreateAccountDialogProps) {
  const isEdit = account !== null;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('expense');
  const [fund, setFund] = useState<AccountFund>('operating');
  const [normalBalance, setNormalBalance] = useState<'debit' | 'credit'>('debit');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setCode(account.code);
      setName(account.name);
      setAccountType(account.account_type);
      setFund(account.fund);
      setNormalBalance(account.normal_balance);
      setIsActive(account.is_active);
    } else {
      setCode('');
      setName('');
      setAccountType('expense');
      setFund('operating');
      setNormalBalance('debit');
      setIsActive(true);
    }
  }, [account, open]);

  // Auto-set normal balance based on account type
  useEffect(() => {
    if (!isEdit) {
      if (accountType === 'asset' || accountType === 'expense') {
        setNormalBalance('debit');
      } else {
        setNormalBalance('credit');
      }
    }
  }, [accountType, isEdit]);

  async function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (isEdit && account) {
      // Can't edit system accounts' code or type
      const updates: Record<string, unknown> = {
        name: name.trim(),
        fund,
        is_active: isActive,
      };

      if (!account.is_system) {
        updates.code = code.trim();
        updates.account_type = accountType;
        updates.normal_balance = normalBalance;
      }

      const { error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', account.id);

      setSubmitting(false);
      if (error) {
        toast.error(error.message.includes('unique') ? 'Account code already exists.' : 'Failed to update account.');
        return;
      }
      toast.success('Account updated.');
    } else {
      const { error } = await supabase.from('accounts').insert({
        community_id: communityId,
        code: code.trim(),
        name: name.trim(),
        account_type: accountType,
        fund,
        normal_balance: normalBalance,
        is_active: isActive,
        display_order: parseInt(code) || 0,
      });

      setSubmitting(false);
      if (error) {
        toast.error(error.message.includes('unique') ? 'Account code already exists.' : 'Failed to create account.');
        return;
      }
      toast.success('Account created.');
    }

    onOpenChange(false);
    onSuccess();
  }

  const isValid = code.trim() && name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this account.' : 'Add a new account to your chart of accounts.'}
            {isEdit && account?.is_system && ' System accounts have limited editing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Code <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="5100"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                disabled={isEdit && account?.is_system}
                className="tabular-nums"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Landscaping"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Type</label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as AccountType)}
                disabled={isEdit && account?.is_system}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Fund</label>
              <Select value={fund} onValueChange={(v) => setFund(v as AccountFund)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operating">Operating</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is-active" className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                Active
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !isValid}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
