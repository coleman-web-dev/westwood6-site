'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createCheck } from '@/lib/actions/check-actions';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shared/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Vendor } from '@/lib/types/database';
import type { Account } from '@/lib/types/accounting';
import type { CheckNumberSequence } from '@/lib/types/check';

interface WriteCheckDialogProps {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckCreated: () => void;
  /** Pre-select a vendor when opening from the vendor detail view */
  preselectedVendorId?: string | null;
}

export function WriteCheckDialog({
  communityId,
  open,
  onOpenChange,
  onCheckCreated,
  preselectedVendorId,
}: WriteCheckDialogProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Account[]>([]);
  const [sequences, setSequences] = useState<CheckNumberSequence[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);

  // Form state
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [customPayee, setCustomPayee] = useState('');
  const [isCustomPayee, setIsCustomPayee] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [sequenceId, setSequenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      const [vendorsRes, expenseRes, bankRes, seqRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('*')
          .eq('community_id', communityId)
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('accounts')
          .select('*')
          .eq('community_id', communityId)
          .eq('account_type', 'expense')
          .eq('is_active', true)
          .order('code'),
        supabase
          .from('accounts')
          .select('*')
          .eq('community_id', communityId)
          .eq('account_type', 'asset')
          .eq('is_active', true)
          .order('code'),
        supabase
          .from('check_number_sequences')
          .select('*')
          .eq('community_id', communityId)
          .order('created_at'),
      ]);

      setVendors((vendorsRes.data as Vendor[]) || []);
      setExpenseAccounts((expenseRes.data as Account[]) || []);
      setBankAccounts((bankRes.data as Account[]) || []);
      setSequences((seqRes.data as CheckNumberSequence[]) || []);

      // Default to first sequence and first bank account
      if (seqRes.data?.length) setSequenceId(seqRes.data[0].id);
      if (bankRes.data?.length) setBankAccountId(bankRes.data[0].id);

      setLoading(false);
    }

    fetchData();
  }, [open, communityId]);

  // When preselectedVendorId is provided, auto-select that vendor
  useEffect(() => {
    if (open && preselectedVendorId && vendors.length > 0) {
      setSelectedVendorId(preselectedVendorId);
      setIsCustomPayee(false);
    }
  }, [open, preselectedVendorId, vendors]);

  // When vendor selected, auto-fill expense category
  useEffect(() => {
    if (selectedVendorId) {
      const vendor = vendors.find((v) => v.id === selectedVendorId);
      if (vendor?.default_expense_account_id) {
        setExpenseAccountId(vendor.default_expense_account_id);
      }
    }
  }, [selectedVendorId, vendors]);

  function resetForm() {
    setSelectedVendorId(null);
    setCustomPayee('');
    setIsCustomPayee(false);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setMemo('');
    setExpenseAccountId('');
    setBankAccountId(sequences.length ? '' : '');
    setSequenceId(sequences.length ? sequences[0].id : '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payeeName = isCustomPayee
      ? customPayee
      : vendors.find((v) => v.id === selectedVendorId)?.name || '';

    if (!payeeName) {
      toast.error('Please select a payee or enter a custom name.');
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!expenseAccountId) {
      toast.error('Please select an expense category.');
      return;
    }

    if (!bankAccountId) {
      toast.error('Please select a bank account.');
      return;
    }

    if (!sequenceId) {
      toast.error('Please set up a check number sequence first.');
      return;
    }

    setSubmitting(true);

    const result = await createCheck({
      communityId,
      payeeVendorId: isCustomPayee ? null : selectedVendorId,
      payeeName,
      amount: amountCents,
      date,
      memo,
      expenseAccountId,
      bankAccountId,
      checkSequenceId: sequenceId,
    });

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to create check.');
      return;
    }

    toast.success(`Check #${result.check?.check_number} created.`);
    resetForm();
    onOpenChange(false);
    onCheckCreated();
  }

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write Check</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
          </div>
        ) : sequences.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-2">
              No check sequences configured.
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Set up a check number sequence in Settings before writing checks.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payee */}
            <div className="space-y-2">
              <Label>Pay to the order of</Label>
              <div className="flex items-center gap-2">
                {!isCustomPayee ? (
                  <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={vendorOpen}
                        className="flex-1 justify-between h-9 text-body"
                      >
                        {selectedVendor
                          ? selectedVendor.company
                            ? `${selectedVendor.name} (${selectedVendor.company})`
                            : selectedVendor.name
                          : 'Select vendor...'}
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search vendors..." />
                        <CommandList>
                          <CommandEmpty>No vendors found.</CommandEmpty>
                          <CommandGroup>
                            {vendors.map((vendor) => (
                              <CommandItem
                                key={vendor.id}
                                value={vendor.name}
                                onSelect={() => {
                                  setSelectedVendorId(vendor.id);
                                  setVendorOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedVendorId === vendor.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <div>
                                  <div className="text-body">{vendor.name}</div>
                                  {vendor.company && (
                                    <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                                      {vendor.company}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={customPayee}
                    onChange={(e) => setCustomPayee(e.target.value)}
                    placeholder="Enter payee name"
                    className="flex-1"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCustomPayee(!isCustomPayee);
                    setSelectedVendorId(null);
                    setCustomPayee('');
                  }}
                  className="text-meta shrink-0"
                >
                  {isCustomPayee ? 'Select Vendor' : 'Custom'}
                </Button>
              </div>
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Memo */}
            <div className="space-y-2">
              <Label htmlFor="memo">Memo</Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Payment for..."
                rows={2}
              />
            </div>

            {/* Expense Category */}
            <div className="space-y-2">
              <Label>Expense Category</Label>
              <Select value={expenseAccountId} onValueChange={setExpenseAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((acct) => (
                    <SelectItem key={acct.id} value={acct.id}>
                      {acct.code} - {acct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account */}
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((acct) => (
                    <SelectItem key={acct.id} value={acct.id}>
                      {acct.code} - {acct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Check Sequence */}
            {sequences.length > 1 && (
              <div className="space-y-2">
                <Label>Check Sequence</Label>
                <Select value={sequenceId} onValueChange={setSequenceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select check sequence" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id}>
                        {seq.bank_account_label}
                        {seq.prefix ? ` (${seq.prefix})` : ''} - Next: #{seq.next_check_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Write Check
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
