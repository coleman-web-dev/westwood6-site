'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import { reverseJournalEntryAction } from '@/lib/actions/accounting-actions';
import type { JournalEntry, JournalLine, JournalStatus } from '@/lib/types/accounting';

const STATUS_VARIANT: Record<JournalStatus, 'outline' | 'secondary' | 'destructive'> = {
  draft: 'outline',
  posted: 'secondary',
  reversed: 'destructive',
};

interface JournalEntryDetailProps {
  entryId: string | null;
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReversed: () => void;
}

interface LineWithAccount extends JournalLine {
  account?: { code: string; name: string };
}

export function JournalEntryDetail({
  entryId,
  communityId,
  open,
  onOpenChange,
  onReversed,
}: JournalEntryDetailProps) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<LineWithAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [reversing, setReversing] = useState(false);

  const fetchEntry = useCallback(async () => {
    if (!entryId) return;
    setLoading(true);

    const supabase = createClient();
    const { data: entryData } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryData) {
      setEntry(entryData as JournalEntry);
    }

    const { data: linesData } = await supabase
      .from('journal_lines')
      .select('*, account:accounts(code, name)')
      .eq('journal_entry_id', entryId);

    setLines((linesData as LineWithAccount[]) || []);
    setLoading(false);
  }, [entryId]);

  useEffect(() => {
    if (open && entryId) {
      fetchEntry();
    }
  }, [open, entryId, fetchEntry]);

  async function handleReverse() {
    if (!entry) return;
    setReversing(true);

    const result = await reverseJournalEntryAction(communityId, entry.id);
    setReversing(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to reverse entry.');
      return;
    }

    toast.success('Entry reversed.');
    onOpenChange(false);
    onReversed();
  }

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Journal Entry</DialogTitle>
        </DialogHeader>

        {loading || !entry ? (
          <div className="py-6">
            <div className="animate-pulse h-20 rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body text-text-primary-light dark:text-text-primary-dark font-medium">
                  {entry.description}
                </span>
                <Badge variant={STATUS_VARIANT[entry.status]} className="text-meta">
                  {entry.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Date: {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString()}
                </span>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Source: {entry.source.replace(/_/g, ' ')}
                </span>
                {entry.reference_type && (
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Ref: {entry.reference_type}
                  </span>
                )}
              </div>
              {entry.memo && (
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark italic">
                  {entry.memo}
                </p>
              )}
            </div>

            {/* Lines table */}
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
                    <th className="text-left px-3 py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium">
                      Account
                    </th>
                    <th className="text-right px-3 py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium w-24">
                      Debit
                    </th>
                    <th className="text-right px-3 py-2 text-meta text-text-muted-light dark:text-text-muted-dark font-medium w-24">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-2">
                        <span className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark mr-2">
                          {line.account?.code}
                        </span>
                        <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                          {line.account?.name || 'Unknown'}
                        </span>
                        {line.description && (
                          <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-2">
                            ({line.description})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                        {line.debit > 0 ? `$${(line.debit / 100).toFixed(2)}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                        {line.credit > 0 ? `$${(line.credit / 100).toFixed(2)}` : ''}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-light-2 dark:bg-surface-dark-2 font-medium">
                    <td className="px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                      ${(totalDebit / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-body text-text-primary-light dark:text-text-primary-dark">
                      ${(totalCredit / 100).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {entry.reversal_of && (
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark italic">
                This entry is a reversal of another entry.
              </p>
            )}
            {entry.reversed_by && (
              <p className="text-meta text-destructive italic">
                This entry has been reversed.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {entry && entry.status === 'posted' && !entry.reversed_by && (
            <Button
              variant="destructive"
              onClick={handleReverse}
              disabled={reversing}
            >
              {reversing ? 'Reversing...' : 'Reverse Entry'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
