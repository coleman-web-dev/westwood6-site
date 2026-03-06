'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Plus, Trash2, Pause, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getRecurringEntries,
  createRecurringEntryAction,
  toggleRecurringEntryAction,
  deleteRecurringEntryAction,
} from '@/lib/actions/accounting-actions';
import type { RecurringJournalEntry } from '@/lib/types/accounting';
import { toast } from 'sonner';

interface Props {
  communityId: string;
}

interface AccountOption {
  code: string;
  name: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function RecurringEntries({ communityId }: Props) {
  const [entries, setEntries] = useState<RecurringJournalEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecurringEntries(communityId);
      setEntries(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
    const supabase = createClient();
    supabase
      .from('accounts')
      .select('code, name')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => setAccounts(data || []));
  }, [communityId, load]);

  async function handleToggle(entry: RecurringJournalEntry) {
    await toggleRecurringEntryAction(communityId, entry.id, !entry.is_active);
    load();
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this recurring entry?')) return;
    await deleteRecurringEntryAction(communityId, entryId);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Recurring Journal Entries
        </h3>
        <CreateRecurringDialog communityId={communityId} accounts={accounts} onCreated={load} />
      </div>

      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark">
        {loading ? (
          <div className="p-card-padding animate-pulse h-24 rounded bg-muted" />
        ) : entries.length === 0 ? (
          <div className="p-card-padding text-body text-text-muted-light dark:text-text-muted-dark text-center">
            No recurring entries configured.
          </div>
        ) : (
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {entries.map((entry) => (
              <div key={entry.id} className="p-card-padding flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-body font-medium ${entry.is_active ? 'text-text-primary-light dark:text-text-primary-dark' : 'text-text-muted-light dark:text-text-muted-dark line-through'}`}>
                      {entry.description}
                    </span>
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark capitalize bg-surface-light-2 dark:bg-surface-dark-2 px-1.5 py-0.5 rounded">
                      {entry.frequency}
                    </span>
                  </div>
                  <div className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                    Next: {entry.next_run_date}
                    {entry.times_run > 0 && ` · ${entry.times_run} posted`}
                    {entry.end_date && ` · Ends: ${entry.end_date}`}
                  </div>
                  <div className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                    {entry.lines.map((l, i) => (
                      <span key={i}>
                        {l.accountCode}: {l.debit > 0 ? `DR ${fmt(l.debit)}` : `CR ${fmt(l.credit)}`}
                        {i < entry.lines.length - 1 && ' | '}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(entry)} title={entry.is_active ? 'Pause' : 'Resume'}>
                    {entry.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-warning-dot" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRecurringDialog({ communityId, accounts, onCreated }: { communityId: string; accounts: AccountOption[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [nextRunDate, setNextRunDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lines, setLines] = useState([
    { accountCode: '', debit: '', credit: '' },
    { accountCode: '', debit: '', credit: '' },
  ]);
  const [saving, setSaving] = useState(false);

  function addLine() {
    setLines([...lines, { accountCode: '', debit: '', credit: '' }]);
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: string) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = lines.map((l) => ({
      accountCode: l.accountCode,
      debit: Math.round(parseFloat(l.debit || '0') * 100),
      credit: Math.round(parseFloat(l.credit || '0') * 100),
    }));

    const totalDebit = parsed.reduce((s, l) => s + l.debit, 0);
    const totalCredit = parsed.reduce((s, l) => s + l.credit, 0);

    if (totalDebit !== totalCredit || totalDebit === 0) {
      toast.error('Debits must equal credits and be greater than zero');
      return;
    }

    setSaving(true);
    const result = await createRecurringEntryAction({
      communityId,
      description,
      memo: memo || undefined,
      frequency,
      nextRunDate,
      endDate: endDate || undefined,
      lines: parsed,
    });
    setSaving(false);

    if (result.success) {
      toast.success('Recurring entry created');
      setOpen(false);
      setDescription('');
      setMemo('');
      setLines([{ accountCode: '', debit: '', credit: '' }, { accountCode: '', debit: '', credit: '' }]);
      onCreated();
    } else {
      toast.error(result.error || 'Failed to create');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Recurring
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary-light dark:text-text-primary-dark">
            New Recurring Journal Entry
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Monthly insurance amortization" className="mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Frequency</Label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Next Run Date</Label>
              <Input type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} className="mt-1" required />
            </div>
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">End Date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Memo (optional)</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1" />
          </div>

          <div className="space-y-2">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">Lines</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select value={line.accountCode} onChange={(e) => updateLine(idx, 'accountCode', e.target.value)} className="flex-1 rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-2 py-1.5 text-meta text-text-primary-light dark:text-text-primary-dark" required>
                  <option value="">Account</option>
                  {accounts.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
                <Input type="number" step="0.01" min="0" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} className="w-24 text-meta" />
                <Input type="number" step="0.01" min="0" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} className="w-24 text-meta" />
                {lines.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              Add Line
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
