'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { UnitPicker } from '@/components/shared/unit-picker';
import { Printer, Download } from 'lucide-react';
import type { Invoice, Payment, WalletTransaction, Unit, LedgerEntry } from '@/lib/types/database';

interface HouseholdLedgerProps {
  refreshKey: number;
  initialUnitId?: string;
  hideUnitPicker?: boolean;
}

export function HouseholdLedger({ refreshKey, initialUnitId, hideUnitPicker }: HouseholdLedgerProps) {
  const { community, unit, isBoard } = useCommunity();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Board: unit selector (syncs with external initialUnitId when provided)
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId ?? unit?.id ?? '');

  // Sync with external unit selection (e.g., page-level unit picker)
  useEffect(() => {
    if (initialUnitId) {
      setSelectedUnitId(initialUnitId);
    }
  }, [initialUnitId]);

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
    deposit_return: { variant: 'secondary', label: 'Deposit Return' },
    bounced_reversal: { variant: 'destructive', label: 'Bounced' },
  };

  // ─── Unit info + owner name for headers ───────────────────
  const [unitLabel, setUnitLabel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  useEffect(() => {
    if (!targetUnitId) return;
    const supabase = createClient();
    supabase
      .from('units')
      .select('unit_number, address')
      .eq('id', targetUnitId)
      .single()
      .then(({ data }) => {
        if (data) setUnitLabel(`Unit ${data.unit_number}${data.address ? ' - ' + data.address : ''}`);
      });
    supabase
      .from('members')
      .select('first_name, last_name')
      .eq('unit_id', targetUnitId)
      .eq('member_role', 'owner')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setOwnerName(`${data.first_name} ${data.last_name}`);
        else setOwnerName('');
      });
  }, [targetUnitId]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatAmount = (cents: number) => (Math.abs(cents) / 100).toFixed(2);

  // ─── Export CSV ──────────────────────────────────────────
  const handleExport = () => {
    if (entries.length === 0) return;
    const ownerLine = ownerName ? `"${ownerName} - ${unitLabel}"\n` : `"${unitLabel}"\n`;
    const header = ownerLine + 'Date,Type,Description,Amount,Balance\n';
    const rows = entries.map((e) => {
      const badge = TYPE_BADGE[e.entry_type] ?? { label: e.entry_type };
      const sign = e.amount < 0 ? '-' : '';
      return [
        formatDate(e.entry_date),
        badge.label,
        `"${e.description.replace(/"/g, '""')}"`,
        `${sign}$${formatAmount(e.amount)}`,
        `$${(e.running_balance / 100).toFixed(2)}`,
      ].join(',');
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${unitLabel.replace(/\s+/g, '-').toLowerCase() || 'unit'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Print ───────────────────────────────────────────────
  const handlePrint = () => {
    if (entries.length === 0) return;
    const finalBalance = entries[entries.length - 1]?.running_balance ?? 0;
    const totalCharges = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const totalCredits = entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);

    const tableRows = entries
      .map((e) => {
        const badge = TYPE_BADGE[e.entry_type] ?? { label: e.entry_type };
        const isCredit = e.amount < 0;
        const sign = isCredit ? '-' : '+';
        const color = isCredit ? '#16a34a' : '#dc2626';
        return `<tr>
          <td>${formatDate(e.entry_date)}</td>
          <td>${badge.label}</td>
          <td>${e.description}</td>
          <td class="num" style="color:${color}">${sign}$${formatAmount(e.amount)}</td>
          <td class="num">$${(e.running_balance / 100).toFixed(2)}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><title>Ledger - ${unitLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a1a; font-size: 15px; line-height: 1.5; }
        .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1D2024; }
        .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
        .header p { color: #555; font-size: 14px; }
        .summary { display: flex; gap: 32px; margin-bottom: 20px; }
        .summary-item { }
        .summary-item .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 2px; }
        .summary-item .value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .charges { color: #dc2626; }
        .credits { color: #16a34a; }
        table { width: auto; border-collapse: collapse; margin-top: 8px; }
        th { text-align: left; padding: 8px 16px 8px 0; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; white-space: nowrap; }
        td { padding: 7px 16px 7px 0; border-bottom: 1px solid #e5e5e5; font-size: 14px; white-space: nowrap; }
        .num { text-align: right; font-variant-numeric: tabular-nums; padding-right: 0; padding-left: 24px; }
        th.num { text-align: right; padding-right: 0; padding-left: 24px; }
        tr:last-child td { border-bottom: 2px solid #333; }
        .footer { margin-top: 16px; font-size: 11px; color: #aaa; }
        @media print {
          body { padding: 20px; }
          @page { margin: 0.5in; }
        }
      </style></head>
      <body>
        <div class="header">
          <h1>${community.name}</h1>
          <p>${ownerName ? ownerName + ' &middot; ' : ''}${unitLabel}</p>
        </div>
        <div class="summary">
          <div class="summary-item">
            <div class="label">Total Charges</div>
            <div class="value charges">$${(totalCharges / 100).toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Total Payments</div>
            <div class="value credits">-$${(Math.abs(totalCredits) / 100).toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Current Balance</div>
            <div class="value">$${(finalBalance / 100).toFixed(2)}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="num">Amount</th><th class="num">Balance</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">Generated ${new Date().toLocaleDateString()} by DuesIQ</div>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => { w.print(); };
    }
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
      {/* Board: searchable unit selector (hidden when page-level picker is active) */}
      {isBoard && !hideUnitPicker && (
        <div className="max-w-sm">
          <UnitPicker
            communityId={community.id}
            value={selectedUnitId}
            onValueChange={setSelectedUnitId}
            placeholder="Select a unit..."
          />
        </div>
      )}

      {/* Owner + unit label */}
      {ownerName && (
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          {ownerName} &middot; {unitLabel}
        </p>
      )}

      {/* Print / Export */}
      {entries.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
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
