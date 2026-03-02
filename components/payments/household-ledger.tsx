'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import type { Invoice, Payment, WalletTransaction, Unit, LedgerEntry } from '@/lib/types/database';

interface HouseholdLedgerProps {
  refreshKey: number;
}

export function HouseholdLedger({ refreshKey }: HouseholdLedgerProps) {
  const { community, unit, isBoard } = useCommunity();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Board: unit selector
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unit?.id ?? '');
  const [unitOwnerMap, setUnitOwnerMap] = useState<Record<string, string>>({});

  // Load units for board
  useEffect(() => {
    if (!isBoard) return;

    const supabase = createClient();
    async function loadUnits() {
      const { data: unitData } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active')
        .order('unit_number', { ascending: true });

      const units = (unitData as Unit[]) ?? [];
      setAllUnits(units);

      const { data: owners } = await supabase
        .from('members')
        .select('unit_id, first_name, last_name')
        .eq('community_id', community.id)
        .eq('member_role', 'owner')
        .is('parent_member_id', null);

      const ownerMap: Record<string, string> = {};
      for (const o of (owners ?? []) as { unit_id: string | null; first_name: string; last_name: string }[]) {
        if (o.unit_id) ownerMap[o.unit_id] = `${o.first_name} ${o.last_name}`;
      }
      setUnitOwnerMap(ownerMap);

      if (!selectedUnitId && units.length > 0) {
        setSelectedUnitId(units[0].id);
      }
    }
    loadUnits();
  }, [isBoard, community.id, selectedUnitId]);

  const targetUnitId = isBoard ? selectedUnitId : unit?.id;

  const fetchLedger = useCallback(async () => {
    if (!targetUnitId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const [invoiceResult, paymentResult, walletResult] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .eq('unit_id', targetUnitId)
        .order('due_date', { ascending: true }),
      supabase
        .from('payments')
        .select('*')
        .eq('unit_id', targetUnitId)
        .order('created_at', { ascending: true }),
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('unit_id', targetUnitId)
        .order('created_at', { ascending: true }),
    ]);

    const invoices = (invoiceResult.data as Invoice[]) ?? [];
    const payments = (paymentResult.data as Payment[]) ?? [];
    const walletTxs = (walletResult.data as WalletTransaction[]) ?? [];

    // Merge into ledger entries
    const ledgerEntries: LedgerEntry[] = [];

    for (const inv of invoices) {
      if (inv.status === 'voided') continue;
      ledgerEntries.push({
        entry_date: inv.due_date,
        entry_type: 'charge',
        description: inv.title,
        amount: inv.amount,
        running_balance: 0,
        reference_id: inv.id,
        member_name: null,
      });
    }

    for (const pmt of payments) {
      ledgerEntries.push({
        entry_date: pmt.created_at,
        entry_type: 'payment',
        description: 'Payment',
        amount: -pmt.amount,
        running_balance: 0,
        reference_id: pmt.id,
        member_name: null,
      });
    }

    for (const tx of walletTxs) {
      ledgerEntries.push({
        entry_date: tx.created_at,
        entry_type: tx.type,
        description: tx.description ?? tx.type.replace(/_/g, ' '),
        amount: -tx.amount, // wallet credits reduce balance
        running_balance: 0,
        reference_id: tx.reference_id,
        member_name: null,
      });
    }

    // Sort by date
    ledgerEntries.sort((a, b) => a.entry_date.localeCompare(b.entry_date));

    // Compute running balance
    let running = 0;
    for (const entry of ledgerEntries) {
      running += entry.amount;
      entry.running_balance = running;
    }

    setEntries(ledgerEntries);
    setLoading(false);
  }, [targetUnitId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger, refreshKey]);

  const TYPE_BADGE: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
    charge: { variant: 'destructive', label: 'Charge' },
    payment: { variant: 'secondary', label: 'Payment' },
    manual_credit: { variant: 'secondary', label: 'Credit' },
    manual_debit: { variant: 'destructive', label: 'Debit' },
    overpayment: { variant: 'secondary', label: 'Overpayment' },
    payment_applied: { variant: 'secondary', label: 'Applied' },
    refund: { variant: 'outline', label: 'Refund' },
    bounced_reversal: { variant: 'destructive', label: 'Bounced' },
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse h-12 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Board: unit selector */}
      {isBoard && allUnits.length > 0 && (
        <div className="max-w-xs">
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {allUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  Unit {u.unit_number}
                  {unitOwnerMap[u.id] ? ` - ${unitOwnerMap[u.id]}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No transactions found.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const badge = TYPE_BADGE[entry.entry_type] ?? { variant: 'outline' as const, label: entry.entry_type };
            const isCredit = entry.amount < 0;

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 py-dense-row-y px-dense-row-x rounded-inner-card bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {entry.description}
                    </span>
                  </div>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                    {new Date(entry.entry_date.includes('T') ? entry.entry_date : entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-label tabular-nums ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCredit ? '-' : '+'}${(Math.abs(entry.amount) / 100).toFixed(2)}
                  </p>
                  <p className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark">
                    Bal: ${(entry.running_balance / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
