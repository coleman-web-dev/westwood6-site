'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { CreditCard, Download } from 'lucide-react';
import { downloadCsv } from '@/lib/utils/export-csv';
import { BounceInvoiceDialog } from '@/components/payments/bounce-invoice-dialog';
import { PayInvoiceButton } from '@/components/payments/pay-invoice-button';
import type { Invoice, InvoiceStatus, Unit } from '@/lib/types/database';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'waived', label: 'Waived' },
  { value: 'voided', label: 'Voided' },
];

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, 'outline' | 'secondary' | 'destructive' | 'default'> = {
  pending: 'outline',
  paid: 'secondary',
  overdue: 'destructive',
  partial: 'default',
  waived: 'outline',
  voided: 'outline',
};

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onInvoiceUpdated: () => void;
  unitOwnerMap?: Record<string, string>;
  units?: Unit[];
  allMembers?: { unit_id: string | null; user_id: string | null }[];
  stripeEnabled?: boolean;
  subscriptionActive?: boolean;
}

export function InvoiceList({
  invoices,
  loading,
  onInvoiceUpdated,
  unitOwnerMap,
  units,
  allMembers,
  stripeEnabled,
  subscriptionActive,
}: InvoiceListProps) {
  const { isBoard, community } = useCommunity();
  const [statusFilter, setStatusFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [unregisteredOnly, setUnregisteredOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bouncingInvoice, setBouncingInvoice] = useState<Invoice | null>(null);

  // Compute set of unit IDs that have NO registered members (no user_id)
  const unregisteredUnitIds = useMemo(() => {
    if (!allMembers) return new Set<string>();
    const unitUserMap = new Map<string, boolean>();
    for (const m of allMembers) {
      if (!m.unit_id) continue;
      if (m.user_id) {
        unitUserMap.set(m.unit_id, true);
      } else if (!unitUserMap.has(m.unit_id)) {
        unitUserMap.set(m.unit_id, false);
      }
    }
    return new Set(
      [...unitUserMap.entries()]
        .filter(([, hasRegistered]) => !hasRegistered)
        .map(([unitId]) => unitId)
    );
  }, [allMembers]);

  // Apply all filters
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (unitFilter !== 'all' && inv.unit_id !== unitFilter) return false;
    if (unregisteredOnly && !unregisteredUnitIds.has(inv.unit_id)) return false;
    if (dateFrom && inv.due_date < dateFrom) return false;
    if (dateTo && inv.due_date > dateTo) return false;
    return true;
  });

  async function handleMarkPaid(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString(), amount_paid: invoice.amount })
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

  async function handleVoid(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: 'voided' })
      .eq('id', invoice.id);

    setUpdatingId(null);

    if (error) {
      toast.error('Failed to void invoice. Please try again.');
      return;
    }

    toast.success('Invoice voided.');
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
      {/* Filters (board only) */}
      {isBoard && (
        <div className="space-y-3">
          {/* Status pills */}
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

          {/* Advanced filters row */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
            {/* Unit filter */}
            {units && units.length > 0 && (
              <div className="space-y-1 min-w-[160px]">
                <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Unit
                </label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        Unit {u.unit_number}
                        {unitOwnerMap?.[u.id] ? ` - ${unitOwnerMap[u.id]}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date range */}
            <div className="space-y-1">
              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Unregistered only toggle */}
            <button
              type="button"
              onClick={() => setUnregisteredOnly(!unregisteredOnly)}
              className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
                unregisteredOnly
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              Unregistered Only
            </button>

            {/* Clear filters */}
            {(unitFilter !== 'all' || unregisteredOnly || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUnitFilter('all');
                  setUnregisteredOnly(false);
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            )}

            {/* Export CSV */}
            {filteredInvoices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadCsv('invoices.csv', filteredInvoices, [
                    { header: 'Title', value: (inv) => inv.title },
                    { header: 'Unit', value: (inv) => units?.find((u) => u.id === inv.unit_id)?.unit_number ?? '' },
                    { header: 'Owner', value: (inv) => unitOwnerMap?.[inv.unit_id] ?? '' },
                    { header: 'Amount', value: (inv) => (inv.amount / 100).toFixed(2) },
                    { header: 'Amount Paid', value: (inv) => (inv.amount_paid / 100).toFixed(2) },
                    { header: 'Status', value: (inv) => inv.status },
                    { header: 'Due Date', value: (inv) => inv.due_date },
                    { header: 'Paid At', value: (inv) => inv.paid_at ?? '' },
                  ]);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
          </div>
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
            invoice.status !== 'waived' &&
            invoice.status !== 'voided';
          const canBounce = isBoard && invoice.status === 'paid';

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
                    {subscriptionActive && (invoice.status === 'pending' || invoice.status === 'overdue') && (
                      <span className="text-meta text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Auto-pay
                      </span>
                    )}
                  </div>

                  {/* Owner name (board view) */}
                  {unitOwnerMap?.[invoice.unit_id] && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {unitOwnerMap[invoice.unit_id]}
                    </p>
                  )}

                  {invoice.description && (
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-1">
                      {invoice.description}
                    </p>
                  )}

                  {invoice.notes && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1 italic">
                      Note: {invoice.notes}
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
                    {invoice.bounced_from_invoice_id && (
                      <p className="text-meta text-destructive">
                        Rebilled (bounced check)
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-metric-l tabular-nums text-text-primary-light dark:text-text-primary-dark">
                    ${(invoice.amount / 100).toFixed(2)}
                  </p>
                  {invoice.amount_paid > 0 && invoice.status === 'partial' && (
                    <p className="text-meta tabular-nums text-green-600 dark:text-green-400">
                      ${(invoice.amount_paid / 100).toFixed(2)} paid
                    </p>
                  )}
                  {invoice.amount_paid > 0 && invoice.status === 'partial' && (
                    <p className="text-meta tabular-nums text-text-muted-light dark:text-text-muted-dark">
                      ${((invoice.amount - invoice.amount_paid) / 100).toFixed(2)} remaining
                    </p>
                  )}
                </div>
              </div>

              {/* Pay button (when Stripe is connected and invoice is payable) */}
              {stripeEnabled && !isBoard && (invoice.status === 'pending' || invoice.status === 'overdue' || invoice.status === 'partial') && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                  <PayInvoiceButton
                    invoiceId={invoice.id}
                    communityId={community.id}
                    amount={invoice.status === 'partial' ? invoice.amount - invoice.amount_paid : invoice.amount}
                  />
                </div>
              )}

              {/* Board actions */}
              {canUpdate && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoid(invoice)}
                    disabled={isUpdating}
                    className="text-destructive hover:text-destructive"
                  >
                    Void
                  </Button>
                </div>
              )}

              {/* Bounced check action (paid invoices only) */}
              {canBounce && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-stroke-light dark:border-stroke-dark">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBouncingInvoice(invoice)}
                    className="text-destructive hover:text-destructive"
                  >
                    Mark as Bounced
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Bounce invoice dialog */}
      <BounceInvoiceDialog
        invoice={bouncingInvoice}
        open={bouncingInvoice !== null}
        onOpenChange={(open) => { if (!open) setBouncingInvoice(null); }}
        onSuccess={onInvoiceUpdated}
      />
    </div>
  );
}
