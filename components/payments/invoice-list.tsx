'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { toast } from 'sonner';
import type { Invoice, InvoiceStatus } from '@/lib/types/database';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'waived', label: 'Waived' },
];

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, 'outline' | 'secondary' | 'destructive' | 'default'> = {
  pending: 'outline',
  paid: 'secondary',
  overdue: 'destructive',
  partial: 'default',
  waived: 'outline',
};

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onInvoiceUpdated: () => void;
}

export function InvoiceList({ invoices, loading, onInvoiceUpdated }: InvoiceListProps) {
  const { isBoard } = useCommunity();
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredInvoices =
    statusFilter === 'all'
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter);

  async function handleMarkPaid(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id);

    setUpdatingId(null);

    if (error) {
      toast.error('Failed to mark invoice as paid. Please try again.');
      return;
    }

    toast.success('Invoice marked as paid.');
    onInvoiceUpdated();
  }

  async function handleMarkWaived(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'waived' })
      .eq('id', invoice.id);

    setUpdatingId(null);

    if (error) {
      toast.error('Failed to waive invoice. Please try again.');
      return;
    }

    toast.success('Invoice waived.');
    onInvoiceUpdated();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3"
          >
            <div className="animate-pulse h-5 w-2/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/3 rounded bg-muted" />
            <div className="animate-pulse h-4 w-1/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter (board sees all statuses, residents do too for their own) */}
      {isBoard && (
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
                statusFilter === filter.value
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No invoices found.
        </p>
      ) : (
        filteredInvoices.map((invoice) => {
          const isUpdating = updatingId === invoice.id;
          const canUpdate =
            isBoard &&
            invoice.status !== 'paid' &&
            invoice.status !== 'waived';

          return (
            <div
              key={invoice.id}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                      {invoice.title}
                    </h3>
                    <Badge variant={STATUS_BADGE_VARIANT[invoice.status]} className="text-meta shrink-0">
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>

                  {invoice.description && (
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1">
                      {invoice.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      Due:{' '}
                      {new Date(invoice.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {invoice.paid_at && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Paid:{' '}
                        {new Date(invoice.paid_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-metric-l tabular-nums text-text-primary-light dark:text-text-primary-dark">
                    ${(invoice.amount / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Board actions */}
              {canUpdate && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkPaid(invoice)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Mark as Paid'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkWaived(invoice)}
                    disabled={isUpdating}
                  >
                    Waive
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
