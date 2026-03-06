'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Label } from '@/components/shared/ui/label';
import { Input } from '@/components/shared/ui/input';
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  categorizeTransaction,
  excludeTransaction,
  unmatchTransaction,
} from '@/lib/actions/banking-actions';
import { MatchTransactionDialog } from '@/components/accounting/match-transaction-dialog';
import type { BankTransaction } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';
import type { Vendor } from '@/lib/types/database';

interface BankTransactionDetailProps {
  transaction: BankTransaction;
  communityId: string;
  accounts: Account[];
  vendors: Vendor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function BankTransactionDetail({
  transaction,
  communityId,
  accounts,
  vendors,
  open,
  onOpenChange,
  onUpdate,
}: BankTransactionDetailProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState(
    transaction.merchant_name || transaction.name || '',
  );
  const [excludeReason, setExcludeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'categorize' | 'exclude'>('view');

  const isProcessed = ['matched', 'categorized', 'reconciled'].includes(transaction.status);

  function formatAmount(amount: number) {
    const abs = Math.abs(amount) / 100;
    return abs.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  async function handleCategorize() {
    if (!selectedAccountId) {
      toast.error('Select an account.');
      return;
    }
    setSaving(true);
    try {
      await categorizeTransaction(
        communityId,
        transaction.id,
        selectedAccountId,
        createRule ? { pattern: rulePattern.toLowerCase(), matchField: 'name' } : undefined,
        selectedVendorId && selectedVendorId !== 'none' ? selectedVendorId : null,
      );
      toast.success('Transaction categorized.');
      onUpdate();
    } catch {
      toast.error('Failed to categorize.');
    }
    setSaving(false);
  }

  async function handleExclude() {
    if (!excludeReason.trim()) {
      toast.error('Provide a reason.');
      return;
    }
    setSaving(true);
    try {
      await excludeTransaction(communityId, transaction.id, excludeReason);
      toast.success('Transaction excluded.');
      onUpdate();
    } catch {
      toast.error('Failed to exclude.');
    }
    setSaving(false);
  }

  async function handleUnmatch() {
    setSaving(true);
    try {
      await unmatchTransaction(communityId, transaction.id);
      toast.success('Transaction reset to pending.');
      onUpdate();
    } catch {
      toast.error('Failed to reset.');
    }
    setSaving(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-page-title">Transaction Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transaction info */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Date
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Description
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark text-right max-w-[200px]">
                  {transaction.name}
                </span>
              </div>
              {transaction.merchant_name && (
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Merchant
                  </span>
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                    {transaction.merchant_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Amount
                </span>
                <span
                  className={`text-body font-semibold ${
                    transaction.amount > 0
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {transaction.amount > 0 ? '-' : '+'}
                  {formatAmount(transaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Status
                </span>
                <span className="text-body text-text-primary-light dark:text-text-primary-dark capitalize">
                  {transaction.status}
                </span>
              </div>
              {transaction.vendor_id && (
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Vendor
                  </span>
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                    {vendors.find((v) => v.id === transaction.vendor_id)?.name || 'Unknown'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions for pending transactions */}
            {transaction.status === 'pending' && mode === 'view' && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setMode('categorize')} className="flex-1">
                  Categorize
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMatchOpen(true)}
                  className="flex-1"
                >
                  Match to Entry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMode('exclude')}
                >
                  Exclude
                </Button>
              </div>
            )}

            {/* Categorize form */}
            {mode === 'categorize' && (
              <div className="space-y-3 border-t border-stroke-light dark:border-stroke-dark pt-3">
                <div>
                  <Label className="text-meta">GL Account</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor assignment (optional, for expense tracking / 1099) */}
                {transaction.amount > 0 && vendors.length > 0 && (
                  <div>
                    <Label className="text-meta">Vendor (optional)</Label>
                    <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Assign to vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No vendor</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}{v.company ? ` (${v.company})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="create-rule"
                    checked={createRule}
                    onCheckedChange={(c) => setCreateRule(!!c)}
                  />
                  <div>
                    <Label htmlFor="create-rule" className="text-body">
                      Create rule for similar transactions
                    </Label>
                    {createRule && (
                      <Input
                        className="mt-1"
                        value={rulePattern}
                        onChange={(e) => setRulePattern(e.target.value)}
                        placeholder="Pattern to match"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCategorize} disabled={saving}>
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMode('view')}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Exclude form */}
            {mode === 'exclude' && (
              <div className="space-y-3 border-t border-stroke-light dark:border-stroke-dark pt-3">
                <div>
                  <Label className="text-meta">Reason for excluding</Label>
                  <Input
                    className="mt-1"
                    value={excludeReason}
                    onChange={(e) => setExcludeReason(e.target.value)}
                    placeholder="e.g., Duplicate transaction, personal transfer"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleExclude} disabled={saving}>
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    Exclude
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMode('view')}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Reset button for processed transactions */}
            {isProcessed && transaction.status !== 'reconciled' && (
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnmatch}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Reset to Pending
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MatchTransactionDialog
        open={matchOpen}
        onOpenChange={setMatchOpen}
        communityId={communityId}
        transactionId={transaction.id}
        transactionAmount={transaction.amount}
        transactionDate={transaction.date}
        onMatch={onUpdate}
      />
    </>
  );
}
