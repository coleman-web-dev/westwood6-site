'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/shared/ui/input';
import { Button } from '@/components/shared/ui/button';
import { getFinancialAuditTrail } from '@/lib/actions/accounting-actions';

interface Props {
  communityId: string;
}

interface AuditEntry {
  id: string;
  entry_date: string;
  description: string;
  source: string;
  status: string;
  created_by: string | null;
  created_at: string;
  posted_at: string | null;
  reversed_by: string | null;
  reversal_of: string | null;
  memo: string | null;
  vendor_id: string | null;
  unit_id: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual Entry',
  invoice_created: 'Invoice Created',
  payment_received: 'Payment',
  late_fee_applied: 'Late Fee',
  invoice_waived: 'Waived',
  invoice_voided: 'Voided',
  wallet_credit: 'Wallet Credit',
  wallet_debit: 'Wallet Debit',
  refund: 'Refund',
  bank_sync: 'Bank Sync',
  vendor_payment: 'Vendor Payment',
  fund_transfer: 'Fund Transfer',
  recurring: 'Recurring',
};

const STATUS_COLORS: Record<string, string> = {
  posted: 'text-mint bg-mint/10',
  draft: 'text-yellow-500 bg-yellow-500/10',
  reversed: 'text-warning-dot bg-warning-dot/10',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FinancialAuditTrail({ communityId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const now = new Date();
  const startOfYear = `${now.getFullYear()}-01-01`;
  const [startDate, setStartDate] = useState(startOfYear);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

  useEffect(() => {
    loadEntries();
  }, [communityId, startDate, endDate]);

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await getFinancialAuditTrail(communityId, startDate, endDate);
      setEntries(data);
    } catch {
      // ignore
    }
    setLoading(false);
    setPage(0);
  }

  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasMore = entries.length > (page + 1) * PAGE_SIZE;

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Financial Audit Trail
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">From</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">To</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
        </div>
        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
          {entries.length} entries
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse h-48 rounded bg-muted" />
      ) : entries.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-8">
          No financial activity in this period.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-stroke-light dark:border-stroke-dark text-left">
                  <th className="py-2 pr-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Created
                  </th>
                  <th className="py-2 pr-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Date
                  </th>
                  <th className="py-2 pr-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Source
                  </th>
                  <th className="py-2 pr-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Description
                  </th>
                  <th className="py-2 pr-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Status
                  </th>
                  <th className="py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-stroke-light/50 dark:border-stroke-dark/50"
                  >
                    <td className="py-2.5 pr-3 text-meta text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="py-2.5 pr-3 text-text-primary-light dark:text-text-primary-dark whitespace-nowrap">
                      {entry.entry_date}
                    </td>
                    <td className="py-2.5 pr-3 text-text-secondary-light dark:text-text-secondary-dark">
                      {SOURCE_LABELS[entry.source] || entry.source}
                    </td>
                    <td className="py-2.5 pr-3 text-text-primary-light dark:text-text-primary-dark">
                      {entry.description}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`text-meta px-1.5 py-0.5 rounded ${STATUS_COLORS[entry.status] || ''}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-meta text-text-muted-light dark:text-text-muted-dark">
                      {entry.reversal_of && 'Reversal'}
                      {entry.reversed_by && 'Was reversed'}
                      {entry.memo && ` · ${entry.memo}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Page {page + 1} of {Math.ceil(entries.length / PAGE_SIZE)}
            </span>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
