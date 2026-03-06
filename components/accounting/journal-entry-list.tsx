'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Plus } from 'lucide-react';
import { CreateJournalEntryDialog } from '@/components/accounting/create-journal-entry-dialog';
import { JournalEntryDetail } from '@/components/accounting/journal-entry-detail';
import type { JournalEntry, JournalSource, JournalStatus } from '@/lib/types/accounting';

const SOURCE_LABELS: Record<JournalSource, string> = {
  manual: 'Manual',
  invoice_created: 'Invoice Created',
  payment_received: 'Payment Received',
  late_fee_applied: 'Late Fee',
  invoice_waived: 'Invoice Waived',
  invoice_voided: 'Invoice Voided',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
  refund: 'Refund',
  assessment_generated: 'Assessment',
  bank_sync: 'Bank Sync',
  vendor_payment: 'Vendor Payment',
  check_payment: 'Check Payment',
  fund_transfer: 'Fund Transfer',
  recurring: 'Recurring',
};

const STATUS_VARIANT: Record<JournalStatus, 'outline' | 'secondary' | 'destructive'> = {
  draft: 'outline',
  posted: 'secondary',
  reversed: 'destructive',
};

interface JournalEntryListProps {
  communityId: string;
}

export function JournalEntryList({ communityId }: JournalEntryListProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchEntries = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('community_id', communityId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter);
    }

    const { data } = await query;
    setEntries((data as JournalEntry[]) || []);
    setLoading(false);
  }, [communityId, sourceFilter, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
            <div className="animate-pulse h-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'manual', 'invoice_created', 'payment_received'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => { setSourceFilter(filter); setPage(0); }}
              className={`px-3 py-1.5 rounded-pill text-meta transition-colors ${
                sourceFilter === filter
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              {filter === 'all' ? 'All' : SOURCE_LABELS[filter]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Manual Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No journal entries found.
          </p>
        </div>
      ) : (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="divide-y divide-stroke-light dark:divide-stroke-dark">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntryId(entry.id)}
                className="w-full text-left px-card-padding py-3 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body text-text-primary-light dark:text-text-primary-dark font-medium">
                        {entry.description}
                      </span>
                      <Badge variant={STATUS_VARIANT[entry.status]} className="text-meta">
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        {new Date(entry.entry_date + 'T00:00:00').toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        {SOURCE_LABELS[entry.source]}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {entries.length >= PAGE_SIZE && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark self-center">
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <CreateJournalEntryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={communityId}
        onSuccess={() => {
          fetchEntries();
          setCreateOpen(false);
        }}
      />

      <JournalEntryDetail
        entryId={selectedEntryId}
        communityId={communityId}
        open={selectedEntryId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntryId(null);
        }}
        onReversed={fetchEntries}
      />
    </div>
  );
}
