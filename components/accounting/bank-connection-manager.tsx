'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { Building2, Loader2, RefreshCw, Unlink, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { mapBankAccountToGL } from '@/lib/actions/banking-actions';
import type { PlaidBankAccount, PlaidConnection } from '@/lib/types/banking';
import type { Account } from '@/lib/types/accounting';

interface BankConnectionManagerProps {
  communityId: string;
  onSync?: () => void;
}

interface ConnectionWithAccounts extends PlaidConnection {
  plaid_bank_accounts: PlaidBankAccount[];
}

export function BankConnectionManager({ communityId, onSync }: BankConnectionManagerProps) {
  const [connections, setConnections] = useState<ConnectionWithAccounts[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [{ data: conns }, { data: accounts }] = await Promise.all([
      supabase
        .from('plaid_connections')
        .select('*, plaid_bank_accounts(*)')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('accounts')
        .select('*')
        .eq('community_id', communityId)
        .eq('account_type', 'asset')
        .eq('is_active', true)
        .order('code'),
    ]);

    setConnections((conns as ConnectionWithAccounts[]) || []);
    setGlAccounts((accounts as Account[]) || []);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function getLinkToken() {
    const res = await fetch('/api/plaid/create-link-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId }),
    });

    if (!res.ok) {
      toast.error('Failed to initialize bank connection.');
      return;
    }

    const { link_token } = await res.json();
    setLinkToken(link_token);
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
        }),
      });

      if (!res.ok) {
        toast.error('Failed to connect bank account.');
        return;
      }

      toast.success('Bank account connected successfully.');
      setLinkToken(null);
      fetchData();
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  async function handleSync(connectionId: string) {
    setSyncing(connectionId);

    const res = await fetch('/api/plaid/sync-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId, connectionId }),
    });

    setSyncing(null);

    if (!res.ok) {
      toast.error('Failed to sync transactions.');
      return;
    }

    const data = await res.json();
    toast.success(`Synced: ${data.added} new, ${data.modified} updated, ${data.removed} removed`);
    fetchData();
    onSync?.();
  }

  async function handleDisconnect() {
    if (!disconnectId) return;
    setDisconnecting(true);

    const res = await fetch('/api/plaid/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId, connectionId: disconnectId }),
    });

    setDisconnecting(false);
    setDisconnectId(null);

    if (!res.ok) {
      toast.error('Failed to disconnect bank.');
      return;
    }

    toast.success('Bank disconnected.');
    fetchData();
  }

  async function handleMapToGL(bankAccountId: string, glAccountId: string) {
    try {
      await mapBankAccountToGL(communityId, bankAccountId, glAccountId);
      toast.success('Account mapped to GL.');
      fetchData();
    } catch {
      toast.error('Failed to map account.');
    }
  }

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-24 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          {connections.length === 0
            ? 'No bank accounts connected'
            : `${connections.length} connected institution${connections.length !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={getLinkToken}>
          <Building2 className="h-4 w-4 mr-1" />
          Connect Bank
        </Button>
      </div>

      {connections.map((conn) => (
        <div
          key={conn.id}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden"
        >
          <div className="px-card-padding py-3 bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                {conn.institution_name || 'Connected Bank'}
              </h3>
              {conn.error_code && (
                <Badge variant="destructive" className="text-meta">
                  Error: {conn.error_code}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {conn.last_synced_at && (
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Last synced: {new Date(conn.last_synced_at).toLocaleDateString()}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync(conn.id)}
                disabled={syncing === conn.id}
              >
                {syncing === conn.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDisconnectId(conn.id)}
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {conn.plaid_bank_accounts
              .filter((a) => a.is_active)
              .map((account) => (
                <div
                  key={account.id}
                  className="px-card-padding py-3 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="text-body text-text-primary-light dark:text-text-primary-dark">
                      {account.name}
                      {account.mask && (
                        <span className="text-text-muted-light dark:text-text-muted-dark ml-1">
                          ····{account.mask}
                        </span>
                      )}
                    </div>
                    <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {account.type}
                      {account.subtype && ` / ${account.subtype}`}
                      {account.current_balance !== null && (
                        <span className="ml-2">
                          Balance: ${(account.current_balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-48 shrink-0">
                    <Select
                      value={account.gl_account_id || ''}
                      onValueChange={(value) => handleMapToGL(account.id, value)}
                    >
                      <SelectTrigger className="h-8 text-meta">
                        <SelectValue placeholder="Map to GL account" />
                      </SelectTrigger>
                      <SelectContent>
                        {glAccounts.map((gl) => (
                          <SelectItem key={gl.id} value={gl.id}>
                            {gl.code} - {gl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <AlertDialog open={!!disconnectId} onOpenChange={(open) => !open && setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the bank connection. Previously synced transactions will be kept but
              no new transactions will sync. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
