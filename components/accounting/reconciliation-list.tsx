'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { Calendar } from '@/components/shared/ui/calendar';
import { Loader2, Plus, CheckCircle2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { startReconciliation } from '@/lib/actions/banking-actions';
import { ReconciliationWorkspace } from '@/components/accounting/reconciliation-workspace';
import type { BankReconciliation, PlaidBankAccount } from '@/lib/types/banking';

// ─── Date helpers ───────────────────────────────────────

/** Format a Date to MM/DD/YYYY string for display */
function fmtDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/** Format a Date to YYYY-MM-DD string for DB/API */
function toISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Parse YYYY-MM-DD string back to Date (local timezone) */
function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

type RangePreset = '1m' | '3m' | '6m' | 'ytd' | 'custom';

function getPresetDates(preset: RangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case '1m': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      return { start, end: today };
    }
    case '3m': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      return { start, end: today };
    }
    case '6m': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 6);
      return { start, end: today };
    }
    case 'ytd':
    default: {
      return { start: new Date(today.getFullYear(), 0, 1), end: today };
    }
  }
}

// ─── Component ──────────────────────────────────────────

interface ReconciliationListProps {
  communityId: string;
}

export function ReconciliationList({ communityId }: ReconciliationListProps) {
  const [reconciliations, setReconciliations] = useState<
    (BankReconciliation & { plaid_bank_accounts: Pick<PlaidBankAccount, 'name' | 'mask'> })[]
  >([]);
  const [bankAccounts, setBankAccounts] = useState<PlaidBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeReconId, setActiveReconId] = useState<string | null>(null);

  // Create form state
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [rangePreset, setRangePreset] = useState<RangePreset>('ytd');
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  // Set default dates on dialog open
  useEffect(() => {
    if (createOpen) {
      const { start, end } = getPresetDates('ytd');
      setPeriodStart(toISO(start));
      setPeriodEnd(toISO(end));
      setRangePreset('ytd');
    }
  }, [createOpen]);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [{ data: recons }, { data: accounts }] = await Promise.all([
      supabase
        .from('bank_reconciliations')
        .select('*, plaid_bank_accounts(name, mask)')
        .eq('community_id', communityId)
        .order('period_end', { ascending: false }),
      supabase
        .from('plaid_bank_accounts')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true),
    ]);

    setReconciliations(recons || []);
    setBankAccounts((accounts as PlaidBankAccount[]) || []);
    setLoading(false);

    // Auto-open in-progress reconciliation
    const inProgress = recons?.find((r) => r.status === 'in_progress');
    if (inProgress) {
      setActiveReconId(inProgress.id);
    }
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handlePresetChange(preset: RangePreset) {
    setRangePreset(preset);
    if (preset !== 'custom') {
      const { start, end } = getPresetDates(preset);
      setPeriodStart(toISO(start));
      setPeriodEnd(toISO(end));
    }
  }

  async function handleCreate() {
    if (!selectedBankAccountId || !periodStart || !periodEnd || !statementBalance) {
      toast.error('All fields are required.');
      return;
    }

    const balanceCents = Math.round(parseFloat(statementBalance) * 100);
    if (isNaN(balanceCents)) {
      toast.error('Enter a valid balance amount.');
      return;
    }

    setSaving(true);
    try {
      const result = await startReconciliation(
        communityId,
        selectedBankAccountId,
        periodStart,
        periodEnd,
        balanceCents,
      );

      if (result.existing) {
        toast.info('Resuming existing reconciliation.');
      } else {
        toast.success('Reconciliation started.');
      }

      setCreateOpen(false);
      setActiveReconId(result.reconciliationId);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start reconciliation.');
    }
    setSaving(false);
  }

  function formatCents(cents: number | null) {
    if (cents === null) return '-';
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  if (activeReconId) {
    return (
      <ReconciliationWorkspace
        communityId={communityId}
        reconciliationId={activeReconId}
        onClose={() => {
          setActiveReconId(null);
          fetchData();
        }}
      />
    );
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
          {reconciliations.length} reconciliation{reconciliations.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={bankAccounts.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Reconciliation
        </Button>
      </div>

      {bankAccounts.length === 0 && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding text-center py-8">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            Connect a bank account first before starting a reconciliation.
          </p>
        </div>
      )}

      {reconciliations.length > 0 && (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {reconciliations.map((recon) => (
              <button
                key={recon.id}
                type="button"
                onClick={() => recon.status === 'in_progress' && setActiveReconId(recon.id)}
                className={`w-full text-left px-card-padding py-3 flex items-center gap-4 ${
                  recon.status === 'in_progress'
                    ? 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 cursor-pointer'
                    : ''
                } transition-colors`}
              >
                <div className="flex-1">
                  <div className="text-body text-text-primary-light dark:text-text-primary-dark">
                    {recon.plaid_bank_accounts?.name}
                    {recon.plaid_bank_accounts?.mask && (
                      <span className="text-text-muted-light dark:text-text-muted-dark ml-1">
                        ····{recon.plaid_bank_accounts.mask}
                      </span>
                    )}
                  </div>
                  <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {fmtDate(new Date(recon.period_start + 'T00:00:00'))} -{' '}
                    {fmtDate(new Date(recon.period_end + 'T00:00:00'))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
                    {formatCents(recon.statement_ending_balance)}
                  </div>
                  {recon.difference !== null && recon.difference !== 0 && (
                    <div className="text-meta text-red-500 tabular-nums">
                      Diff: {formatCents(recon.difference)}
                    </div>
                  )}
                </div>
                <div>
                  {recon.status === 'completed' ? (
                    <Badge variant="secondary" className="text-meta gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-meta">
                      In Progress
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Reconciliation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Bank account select */}
            <div>
              <Label className="text-meta">Bank Account</Label>
              <Select value={selectedBankAccountId} onValueChange={(id) => {
                setSelectedBankAccountId(id);
                const acct = bankAccounts.find((a) => a.id === id);
                if (acct?.current_balance != null) {
                  setStatementBalance((acct.current_balance / 100).toFixed(2));
                }
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.mask ? `····${a.mask}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range preset selector */}
            <div>
              <Label className="text-meta">Date Range</Label>
              <Select value={rangePreset} onValueChange={(v) => handlePresetChange(v as RangePreset)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Year to Date (Jan 1 - Today)</SelectItem>
                  <SelectItem value="1m">Last 1 Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date display / custom pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-meta">Start Date</Label>
                {rangePreset === 'custom' ? (
                  <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-1 w-full justify-start text-left font-normal"
                        size="sm"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
                        {periodStart ? fmtDate(fromISO(periodStart)) : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={periodStart ? fromISO(periodStart) : undefined}
                        onSelect={(d) => {
                          if (d) setPeriodStart(toISO(d));
                          setStartPickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="mt-1 text-body text-text-primary-light dark:text-text-primary-dark py-1.5">
                    {periodStart ? fmtDate(fromISO(periodStart)) : '-'}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-meta">End Date</Label>
                {rangePreset === 'custom' ? (
                  <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-1 w-full justify-start text-left font-normal"
                        size="sm"
                      >
                        <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
                        {periodEnd ? fmtDate(fromISO(periodEnd)) : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={periodEnd ? fromISO(periodEnd) : undefined}
                        onSelect={(d) => {
                          if (d) setPeriodEnd(toISO(d));
                          setEndPickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="mt-1 text-body text-text-primary-light dark:text-text-primary-dark py-1.5">
                    {periodEnd ? fmtDate(fromISO(periodEnd)) : '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Statement balance */}
            <div>
              <Label className="text-meta">Statement Ending Balance ($)</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="12,345.67"
              />
              {selectedBankAccountId && bankAccounts.find((a) => a.id === selectedBankAccountId)?.current_balance != null && (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                  Pre-filled from last Plaid sync. Adjust if your statement differs.
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Start
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
