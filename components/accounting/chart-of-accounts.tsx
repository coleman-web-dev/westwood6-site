'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Plus } from 'lucide-react';
import { CreateAccountDialog } from '@/components/accounting/create-account-dialog';
import type { Account, AccountType } from '@/lib/types/accounting';

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
    const supabase = createClient();
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('community_id', communityId)
      .order('display_order');

    setAccounts((data as Account[]) || []);
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
                  <span className="text-body text-text-primary-light dark:text-text-primary-dark flex-1">
                    {account.name}
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
  );
}
