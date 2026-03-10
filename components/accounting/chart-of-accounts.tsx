'use client';

import { useState, useCallback, useEffect } from 'react';
import { getAllAccounts } from '@/lib/actions/accounting-actions';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Info, Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import { CreateAccountDialog } from '@/components/accounting/create-account-dialog';
import type { Account, AccountType } from '@/lib/types/accounting';

const ACCOUNT_DESCRIPTIONS: Record<string, string> = {
  '1000': 'Your main bank account balance. All dues payments, vendor payments, and day-to-day transactions flow through here.',
  '1010': 'Funds set aside in a separate account for future capital projects like roof replacement, repaving, or major repairs.',
  '1100': 'Money owed to the HOA by homeowners for regular assessments. Increases when invoices are created, decreases when payments come in.',
  '1110': 'Money owed for one-time special assessments. Tracked separately from regular dues so the board can monitor collection progress.',
  '1200': 'Expenses paid in advance, like an annual insurance premium. The cost gets recognized monthly as the coverage period passes.',
  '1300': 'Security deposits collected from homeowners for amenity rentals. Held until the amenity is returned in good condition.',
  '2000': 'Bills the HOA owes to vendors and contractors but has not yet paid. Tracks what is due to landscapers, repair companies, etc.',
  '2100': 'Payments received from homeowners before their invoice due date. Sits here until the invoice is generated and the payment is applied.',
  '2110': 'Homeowner wallet balances in DuesIQ. When a homeowner overpays or receives a credit, it sits here until applied to a future invoice.',
  '2200': 'The liability side of amenity deposits. Represents the obligation to return deposits to homeowners after the rental period.',
  '2300': 'Expenses the HOA has incurred but not yet been billed for. Used at period-end to properly match expenses to the right month.',
  '3000': 'The cumulative surplus (or deficit) in the operating fund. Represents total operating revenues minus total operating expenses over time.',
  '3100': 'The cumulative balance of the reserve fund. Grows with reserve contributions and shrinks when capital projects are funded.',
  '3200': 'Net income from prior fiscal years that has been rolled forward. Updated when the books are closed at year-end.',
  '4000': 'Income from regular recurring homeowner assessments (monthly, quarterly, or annual dues).',
  '4010': 'Income from one-time special assessments levied for specific projects or unexpected expenses.',
  '4100': 'Fees charged to homeowners for late payment of dues. Automatically recorded when late fees are applied to overdue invoices.',
  '4200': 'Income from amenity rental fees, such as clubhouse reservations or pool party bookings.',
  '4300': 'Interest earned on bank accounts, CDs, or money market funds held by the HOA.',
  '4400': 'Miscellaneous income that does not fit other categories, such as vendor rebates, NSF fee recoveries, or small one-off items.',
  '4500': 'The portion of assessments designated for the reserve fund. Tracks how much of each dues payment goes toward long-term savings.',
  '5000': 'Costs for repairing and maintaining common area structures, equipment, and fixtures.',
  '5100': 'Costs for lawn care, tree trimming, irrigation, and other grounds maintenance for common areas.',
  '5200': 'Premiums for the HOA master insurance policy covering common areas, liability, and directors & officers coverage.',
  '5300': 'Water, electricity, gas, and other utility costs for common area facilities like the clubhouse, pool, and exterior lighting.',
  '5400': 'Fees paid to a property management company or community association manager for day-to-day operations.',
  '5500': 'Attorney fees, CPA fees, audit costs, and other professional service expenses.',
  '5600': 'Office supplies, postage, printing, software subscriptions, and other general administrative costs.',
  '5700': 'Transaction fees charged by Stripe for processing homeowner credit card and ACH payments.',
  '5800': 'Dues and assessments written off as uncollectible. Used when the board waives an invoice that will never be collected.',
  '5900': 'Money spent from the reserve fund on capital improvement and replacement projects.',
};

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

interface ChartOfAccountsProps {
  communityId: string;
}

export function ChartOfAccounts({ communityId }: ChartOfAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const fetchAccounts = useCallback(async () => {
    const data = await getAllAccounts(communityId);
    setAccounts(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABELS[type],
    accounts: accounts.filter((a) => a.account_type === type),
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
            <div className="animate-pulse h-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          {accounts.length} accounts
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </div>

      {grouped.map((group) => (
        <div
          key={group.type}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden"
        >
          <div className="px-card-padding py-3 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
            <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              {group.label}
            </h3>
          </div>

          {group.accounts.length === 0 ? (
            <div className="px-card-padding py-4">
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                No {group.label.toLowerCase()} accounts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
              {group.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setEditingAccount(account)}
                  className="w-full text-left px-card-padding py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3"
                >
                  <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark w-12 shrink-0">
                    {account.code}
                  </span>
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1 flex items-center gap-1.5">
                    {account.name}
                    {ACCOUNT_DESCRIPTIONS[account.code] && (
                      <Tooltip>
                        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Info className="h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-body">
                          {ACCOUNT_DESCRIPTIONS[account.code]}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </span>
                  <Badge variant="outline" className="text-meta shrink-0">
                    {account.fund}
                  </Badge>
                  {account.is_system && (
                    <Badge variant="secondary" className="text-meta shrink-0">
                      System
                    </Badge>
                  )}
                  {!account.is_active && (
                    <Badge variant="destructive" className="text-meta shrink-0">
                      Inactive
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <CreateAccountDialog
        open={createOpen || editingAccount !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingAccount(null);
          }
        }}
        communityId={communityId}
        account={editingAccount}
        onSuccess={() => {
          fetchAccounts();
          setCreateOpen(false);
          setEditingAccount(null);
        }}
      />
    </div>
    </TooltipProvider>
  );
}
