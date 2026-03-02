'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { InvoiceList } from '@/components/payments/invoice-list';
import { PaymentHistory } from '@/components/payments/payment-history';
import { CreateInvoiceDialog } from '@/components/payments/create-invoice-dialog';
import type { Invoice, Payment } from '@/lib/types/database';

export default function PaymentsPage() {
  const { community, member, unit, isBoard } = useCommunity();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    // Fetch invoices
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('community_id', community.id)
      .order('due_date', { ascending: false });

    if (!isBoard && unit) {
      invoiceQuery = invoiceQuery.eq('unit_id', unit.id);
    }

    const { data: invoiceData } = await invoiceQuery;

    // Fetch payments
    let paymentQuery = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isBoard && unit) {
      paymentQuery = paymentQuery.eq('unit_id', unit.id);
    } else if (isBoard) {
      // Board sees all community payments via invoice join
      // Since payments table doesn't have community_id directly,
      // filter by invoice_ids belonging to this community
      const communityInvoiceIds = (invoiceData as Invoice[] | null)?.map((inv) => inv.id) ?? [];
      if (communityInvoiceIds.length > 0) {
        paymentQuery = paymentQuery.in('invoice_id', communityInvoiceIds);
      } else {
        // No invoices means no payments to show
        setInvoices([]);
        setPayments([]);
        setLoading(false);
        return;
      }
    }

    const { data: paymentData } = await paymentQuery;

    setInvoices((invoiceData as Invoice[]) ?? []);
    setPayments((paymentData as Payment[]) ?? []);
    setLoading(false);
  }, [community.id, isBoard, unit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate outstanding balance from pending, overdue, and partial invoices
  const outstandingInvoices = invoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partial'
  );
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  function handleDialogSuccess() {
    fetchData();
  }

  function handleInvoiceUpdated() {
    fetchData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Payments
        </h1>
        {isBoard && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>

      {/* Balance summary card */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-inner-card bg-secondary-100 dark:bg-secondary-900">
            <DollarSign className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
          </div>
          <div>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Total Outstanding
            </p>
            <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
              ${(totalOutstanding / 100).toFixed(2)}
            </p>
          </div>
        </div>
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-2">
          {outstandingInvoices.length === 0
            ? 'No outstanding invoices'
            : `${outstandingInvoices.length} outstanding invoice${outstandingInvoices.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceList
            invoices={invoices}
            loading={loading}
            onInvoiceUpdated={handleInvoiceUpdated}
          />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory
            payments={payments}
            invoices={invoices}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Create invoice dialog (board only) */}
      <CreateInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
