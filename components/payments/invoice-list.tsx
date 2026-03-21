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
import { UnitPicker } from '@/components/shared/unit-picker';
import { toast } from 'sonner';
import { CreditCard, Download, Wallet } from 'lucide-react';
import { Checkbox } from '@/components/shared/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shared/ui/alert-dialog';
import { downloadCsv } from '@/lib/utils/export-csv';
import { postInvoiceWaivedAction, postInvoiceVoidedAction, postLateFeeRemovedAction } from '@/lib/actions/accounting-actions';
import { applyWalletToInvoice } from '@/lib/utils/apply-wallet-to-invoices';
import { logAuditEvent } from '@/lib/audit';
import { BounceInvoiceDialog } from '@/components/payments/bounce-invoice-dialog';
import { RecordPaymentDialog } from '@/components/payments/record-payment-dialog';
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
  const { isBoard, community, member } = useCommunity();
  const [statusFilter, setStatusFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [unregisteredOnly, setUnregisteredOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bouncingInvoice, setBouncingInvoice] = useState<Invoice | null>(null);
  const [recordingPaymentInvoice, setRecordingPaymentInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

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
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoice_waived',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { title: invoice.title, amount: invoice.amount },
    });
    const remaining = invoice.amount - (invoice.amount_paid || 0);
    if (remaining > 0) {
      await postInvoiceWaivedAction(community.id, invoice.id, invoice.unit_id, remaining, invoice.title);
    }
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
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoice_voided',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { title: invoice.title, amount: invoice.amount },
    });
    await postInvoiceVoidedAction(community.id, invoice.id, invoice.unit_id, invoice.amount, invoice.title);
    onInvoiceUpdated();
  }

  async function handleRemoveLateFee(invoice: Invoice) {
    if (invoice.late_fee_amount <= 0) return;
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const newAmount = invoice.amount - invoice.late_fee_amount;
    const newStatus =
      invoice.amount_paid >= newAmount
        ? 'paid'
        : invoice.amount_paid > 0
          ? 'partial'
          : invoice.status;

    const { error } = await supabase
      .from('invoices')
      .update({
        amount: newAmount,
        late_fee_amount: 0,
        status: newStatus,
        ...(newStatus === 'paid' ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq('id', invoice.id);

    setUpdatingId(null);

    if (error) {
      toast.error('Failed to remove late fee. Please try again.');
      return;
    }

    toast.success(`Late fee of $${(invoice.late_fee_amount / 100).toFixed(2)} removed.`);
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'late_fee_removed',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { title: invoice.title, late_fee_amount: invoice.late_fee_amount },
    });
    postLateFeeRemovedAction(community.id, invoice.id, invoice.unit_id, invoice.late_fee_amount);
    onInvoiceUpdated();
  }

  async function handleApplyWallet(invoice: Invoice) {
    setUpdatingId(invoice.id);
    const supabase = createClient();

    const result = await applyWalletToInvoice(
      supabase,
      invoice.id,
      invoice.amount,
      invoice.title,
      invoice.unit_id,
      community.id,
      member?.id ?? null,
      invoice.amount_paid ?? 0,
    );

    setUpdatingId(null);

    if (result.applied === 0) {
      toast.error('No wallet credit available for this unit.');
      return;
    }

    const appliedDollars = (result.applied / 100).toFixed(2);
    if (result.invoiceStatus === 'paid') {
      toast.success(`Applied $${appliedDollars} from wallet. Invoice fully paid.`);
    } else {
      toast.success(`Applied $${appliedDollars} from wallet. Invoice partially paid.`);
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'wallet_applied',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { title: invoice.title, applied: result.applied, newBalance: result.newWalletBalance },
    });
    onInvoiceUpdated();
  }

  // Bulk action helpers
  const actionableIds = useMemo(() => {
    return filteredInvoices
      .filter((inv) => inv.status !== 'paid' && inv.status !== 'waived' && inv.status !== 'voided')
      .map((inv) => inv.id);
  }, [filteredInvoices]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === actionableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(actionableIds));
    }
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;

    setBulkProcessing(true);
    const supabase = createClient();
    const ids = [...selectedIds];
    let failed = 0;

    // Process in batches of 50
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      let updates: Record<string, unknown> = {};

      if (bulkAction === 'paid') {
        updates = { status: 'paid', paid_at: new Date().toISOString() };
        // For paid, also set amount_paid. We'll do individual updates for accuracy
        for (const id of batch) {
          const inv = invoices.find((inv) => inv.id === id);
          const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString(), amount_paid: inv?.amount ?? 0 })
            .eq('id', id);
          if (error) failed++;
        }
        continue;
      } else if (bulkAction === 'waived') {
        updates = { status: 'waived' };
      } else if (bulkAction === 'voided') {
        updates = { status: 'voided' };
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('invoices')
          .update(updates)
          .in('id', batch);
        if (error) failed += batch.length;
      }
    }

    setBulkProcessing(false);
    setBulkAction(null);
    setSelectedIds(new Set());

    if (failed > 0) {
      toast.error(`${failed} invoice(s) failed to update.`);
    } else {
      toast.success(`${ids.length} invoice(s) updated.`);
    }
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'invoice_bulk_update',
      targetType: 'invoice',
      metadata: { action: bulkAction, count: ids.length - failed, failed },
    });
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
            <div className="space-y-1 min-w-[200px]">
              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Unit
              </label>
              <UnitPicker
                communityId={community.id}
                value={unitFilter === 'all' ? '' : unitFilter}
                onValueChange={(v) => setUnitFilter(v || 'all')}
                placeholder="All Units"
                optional
              />
            </div>

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
                    { header: 'Late Fee', value: (inv) => (inv.late_fee_amount / 100).toFixed(2) },
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

      {/* Bulk action bar (board only) */}
      {isBoard && selectedIds.size > 0 && (
        <div className="sticky top-topbar z-10 flex items-center gap-3 bg-primary-700 dark:bg-primary-300 text-white dark:text-primary-900 rounded-panel px-4 py-2.5">
          <span className="text-body font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBulkAction('paid')}
            disabled={bulkProcessing}
          >
            Mark Paid
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBulkAction('waived')}
            disabled={bulkProcessing}
          >
            Waive
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBulkAction('voided')}
            disabled={bulkProcessing}
          >
            Void
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-white/80 dark:text-primary-900/80 hover:text-white dark:hover:text-primary-900"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Select all (board only, when there are actionable invoices) */}
      {isBoard && actionableIds.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === actionableIds.length && actionableIds.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Select all actionable ({actionableIds.length})
          </span>
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
                {/* Bulk select checkbox (board only, actionable invoices) */}
                {isBoard && canUpdate && (
                  <Checkbox
                    checked={selectedIds.has(invoice.id)}
                    onCheckedChange={() => toggleSelect(invoice.id)}
                    className="mt-1 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                      {invoice.title}
                    </h3>
                    <Badge variant={STATUS_BADGE_VARIANT[invoice.status]} className="text-meta shrink-0">
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                    {invoice.violation_id && (
                      <Badge variant="outline" className="text-[10px] shrink-0 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                        Violation Fine
                      </Badge>
                    )}
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

                  {invoice.late_fee_amount > 0 && (
                    <p className="text-meta text-destructive mt-1">
                      Includes ${(invoice.late_fee_amount / 100).toFixed(2)} late fee
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
                    onClick={() => setRecordingPaymentInvoice(invoice)}
                    disabled={isUpdating}
                  >
                    Record Payment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyWallet(invoice)}
                    disabled={isUpdating}
                  >
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    Apply Wallet
                  </Button>
                  {invoice.late_fee_amount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLateFee(invoice)}
                      disabled={isUpdating}
                    >
                      Remove Late Fee
                    </Button>
                  )}
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

      {/* Record payment dialog */}
      <RecordPaymentDialog
        invoice={recordingPaymentInvoice}
        open={recordingPaymentInvoice !== null}
        onOpenChange={(open) => { if (!open) setRecordingPaymentInvoice(null); }}
        onSuccess={onInvoiceUpdated}
        unitOwnerName={recordingPaymentInvoice ? unitOwnerMap?.[recordingPaymentInvoice.unit_id] : undefined}
      />

      {/* Bounce invoice dialog */}
      <BounceInvoiceDialog
        invoice={bouncingInvoice}
        open={bouncingInvoice !== null}
        onOpenChange={(open) => { if (!open) setBouncingInvoice(null); }}
        onSuccess={onInvoiceUpdated}
      />

      {/* Bulk action confirmation */}
      <AlertDialog open={bulkAction !== null} onOpenChange={(open) => { if (!open) setBulkAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'paid' && `Mark ${selectedIds.size} invoice(s) as paid?`}
              {bulkAction === 'waived' && `Waive ${selectedIds.size} invoice(s)?`}
              {bulkAction === 'voided' && `Void ${selectedIds.size} invoice(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will update all selected invoices. This cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction} disabled={bulkProcessing}>
              {bulkProcessing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
