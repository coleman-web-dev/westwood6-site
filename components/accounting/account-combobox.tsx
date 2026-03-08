'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shared/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shared/ui/command';
import { CategoryIcon } from '@/components/accounting/category-icon';
import { categorizeTransaction } from '@/lib/actions/banking-actions';
import { toast } from 'sonner';
import type { Account, AccountType } from '@/lib/types/accounting';

const TYPE_ORDER: AccountType[] = ['expense', 'revenue', 'asset', 'liability', 'equity'];
const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

interface AccountComboboxProps {
  communityId: string;
  transactionId: string;
  currentAccountId: string | null;
  accounts: Account[];
  onUpdate: () => void;
  disabled?: boolean;
}

export function AccountCombobox({
  communityId,
  transactionId,
  currentAccountId,
  accounts,
  onUpdate,
  disabled,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentAccount = currentAccountId
    ? accounts.find((a) => a.id === currentAccountId)
    : null;

  const groupedAccounts = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    accounts: accounts.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  async function handleSelect(accountId: string) {
    if (accountId === currentAccountId) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setOpen(false);

    try {
      await categorizeTransaction(communityId, transactionId, accountId);
      onUpdate();
    } catch {
      toast.error('Failed to categorize.');
    }
    setSaving(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || saving}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 max-w-[180px]',
            currentAccount
              ? 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
            (disabled || saving) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <CategoryIcon accountCode={currentAccount?.code} className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {saving ? 'Saving...' : currentAccount ? currentAccount.name : 'Uncategorized'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            {groupedAccounts.map((group) => (
              <CommandGroup key={group.type} heading={group.label}>
                {group.accounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`${account.code} ${account.name}`}
                    onSelect={() => handleSelect(account.id)}
                  >
                    <CategoryIcon accountCode={account.code} className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">
                      {account.code} - {account.name}
                    </span>
                    {currentAccountId === account.id && (
                      <Check className="ml-auto h-3.5 w-3.5 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
