'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { matchTransaction } from '@/lib/actions/banking-actions';

interface MatchTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  transactionId: string;
  transactionAmount: number;
  transactionDate: string;
  onMatch: () => void;
}

interface JournalEntryRow {
  id: string;
  entry_date: string;
  description: string;
  source: string;
  total_debit: number;
}

export function MatchTransactionDialog({
  open,
  onOpenChange,
  communityId,
  transactionId,
  transactionAmount,
  transactionDate,
  onMatch,
}: MatchTransactionDialogProps) {
  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchEntries();
  }, [open]);

  async function fetchEntries() {
    setLoading(true);
    const supabase = createClient();

    // Fetch recent posted journal entries
    const { data } = await supabase
      .from('journal_entries')
      .select('id, entry_date, description, source, journal_lines(debit)')
      .eq('community_id', communityId)
      .eq('status', 'posted')
      .order('entry_date', { ascending: false })
      .limit(100);

    if (data) {
      const rows: JournalEntryRow[] = data.map((e) => {
        const lines = e.journal_lines as { debit: number }[];
        const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
        return {
          id: e.id,
          entry_date: e.entry_date,
          description: e.description,
          source: e.source,
          total_debit: totalDebit,
        };
      });

      // Sort by relevance: matching amount first, then by date proximity
      const txnAmount = Math.abs(transactionAmount) / 100;
      const txnDate = new Date(transactionDate).getTime();

      rows.sort((a, b) => {
        const aAmountMatch = Math.abs(a.total_debit - txnAmount) < 0.01 ? 0 : 1;
        const bAmountMatch = Math.abs(b.total_debit - txnAmount) < 0.01 ? 0 : 1;
        if (aAmountMatch !== bAmountMatch) return aAmountMatch - bAmountMatch;

        const aDateDiff = Math.abs(new Date(a.entry_date).getTime() - txnDate);
        const bDateDiff = Math.abs(new Date(b.entry_date).getTime() - txnDate);
        return aDateDiff - bDateDiff;
      });

      setEntries(rows);
    }
    setLoading(false);
  }

  async function handleMatch(entryId: string) {
    setMatching(true);
    try {
      await matchTransaction(communityId, transactionId, entryId);
      toast.success('Transaction matched to journal entry.');
      onOpenChange(false);
      onMatch();
    } catch {
      toast.error('Failed to match.');
    }
    setMatching(false);
  }

  const filtered = search
    ? entries.filter(
        (e) =>
          e.description.toLowerCase().includes(search.toLowerCase()) ||
          e.source.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const txnAmount = Math.abs(transactionAmount) / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-page-title">Match to Journal Entry</DialogTitle>
        </DialogHeader>

        <div className="text-meta text-text-muted-light dark:text-text-muted-dark mb-2">
          Looking for entries around{' '}
          {txnAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} on{' '}
          {new Date(transactionDate).toLocaleDateString()}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
          <Input
            className="pl-9"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2 divide-y divide-stroke-light dark:divide-stroke-dark border border-stroke-light dark:border-stroke-dark rounded-inner-card">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-body text-text-muted-light dark:text-text-muted-dark">
              No matching journal entries found.
            </div>
          ) : (
            filtered.map((entry) => {
              const isAmountMatch = Math.abs(entry.total_debit - txnAmount) < 0.01;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleMatch(entry.id)}
                  disabled={matching}
                  className="w-full text-left px-4 py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {entry.description}
                    </div>
                    <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {new Date(entry.entry_date).toLocaleDateString()} · {entry.source}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-body tabular-nums text-text-primary-light dark:text-text-primary-dark">
                      {entry.total_debit.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </span>
                    {isAmountMatch && (
                      <Badge variant="secondary" className="text-meta">
                        Match
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
