'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Plus, DollarSign, ClipboardList, Bell, AlertTriangle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { InvoiceList } from '@/components/payments/invoice-list';
import { PaymentHistory } from '@/components/payments/payment-history';
import { CreateInvoiceDialog } from '@/components/payments/create-invoice-dialog';
import { WalletCard } from '@/components/payments/wallet-card';
import { ManageWalletDialog } from '@/components/payments/manage-wallet-dialog';
import { HouseholdLedger } from '@/components/payments/household-ledger';
import { AssessmentList } from '@/components/payments/assessment-list';
import { CreateAssessmentDialog } from '@/components/payments/create-assessment-dialog';
import { CreateSpecialAssessmentDialog } from '@/components/payments/create-special-assessment-dialog';
import { FrequencySelector } from '@/components/payments/frequency-selector';
import { ManagePaymentMethodButton } from '@/components/payments/manage-payment-method-button';
import { AccountStatusCard } from '@/components/payments/account-status-card';
import { UnitPicker } from '@/components/shared/unit-picker';
import { BillingDatePicker } from '@/components/payments/billing-date-picker';
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
import { sendPaymentReminders } from '@/lib/actions/email-actions';
import { toast } from 'sonner';
import type { Invoice, Payment, Unit, Assessment } from '@/lib/types/database';

export default function PaymentsPage() {
  const { community, member, unit, isBoard, isTenant } = useCommunity();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unitOwnerMap, setUnitOwnerMap] = useState<Record<string, string>>({});
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allMembers, setAllMembers] = useState<{ unit_id: string | null; user_id: string | null }[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [specialAssessmentDialogOpen, setSpecialAssessmentDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const initialTab = searchParams.get('tab');
  const urlUnitId = searchParams.get('unit');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(urlUnitId ?? '');
  const activeUnitFilter = isBoard ? selectedUnitId : '';
  const [activeTab, setActiveTab] = useState(
    initialTab && ['invoices', 'history', 'ledger', 'assessments'].includes(initialTab)
      ? initialTab
      : 'invoices',
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [preferredBillingDay, setPreferredBillingDay] = useState<number | null>(null);

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

    // Fetch unit members for display (board only) - prefer owners, fall back to any member
    const ownerMap: Record<string, string> = {};
    let fetchedUnits: Unit[] = [];
    let fetchedMembers: { unit_id: string | null; user_id: string | null }[] = [];
    if (isBoard) {
      const { data: memberRows } = await supabase
        .from('members')
        .select('unit_id, first_name, last_name, member_role')
        .eq('community_id', community.id);

      for (const m of (memberRows ?? []) as { unit_id: string | null; first_name: string; last_name: string; member_role: string }[]) {
        if (!m.unit_id) continue;
        if (!ownerMap[m.unit_id] || m.member_role === 'owner') {
          ownerMap[m.unit_id] = `${m.first_name} ${m.last_name}`;
        }
      }

      const { data: unitData } = await supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active')
        .order('unit_number', { ascending: true });

      fetchedUnits = (unitData as Unit[]) ?? [];

      const { data: memberData } = await supabase
        .from('members')
        .select('unit_id, user_id')
        .eq('community_id', community.id);

      fetchedMembers = (memberData ?? []) as { unit_id: string | null; user_id: string | null }[];
    }

    // Fetch payments — board: by community unit IDs, resident: by own unit
    let paymentQuery = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isBoard && unit) {
      paymentQuery = paymentQuery.eq('unit_id', unit.id);
    } else if (isBoard && fetchedUnits.length > 0) {
      const communityUnitIds = fetchedUnits.map((u) => u.id);
      paymentQuery = paymentQuery.in('unit_id', communityUnitIds);
    }

    const { data: paymentData } = await paymentQuery;

    // Fetch assessments (board only)
    let fetchedAssessments: Assessment[] = [];
    if (isBoard) {
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false });

      fetchedAssessments = (assessmentData as Assessment[]) ?? [];
    }

    // Fetch wallet balance for current unit
    if (unit) {
      const { data: walletData } = await supabase
        .from('unit_wallets')
        .select('balance')
        .eq('unit_id', unit.id)
        .single();

      setWalletBalance(walletData?.balance ?? 0);
    }

    // Fetch subscription status for current unit
    if (unit) {
      const { data: unitData } = await supabase
        .from('units')
        .select('stripe_subscription_id, stripe_subscription_status, preferred_billing_day')
        .eq('id', unit.id)
        .single();

      if (unitData?.stripe_subscription_id) {
        setSubscriptionStatus(unitData.stripe_subscription_status || 'active');
      } else {
        setSubscriptionStatus(null);
      }
      setPreferredBillingDay(unitData?.preferred_billing_day ?? null);
    }

    // Check if Stripe is enabled for this community
    const { data: stripeAccount } = await supabase
      .from('stripe_accounts')
      .select('charges_enabled')
      .eq('community_id', community.id)
      .maybeSingle();

    setStripeEnabled(stripeAccount?.charges_enabled ?? false);
    setInvoices((invoiceData as Invoice[]) ?? []);
    setPayments((paymentData as Payment[]) ?? []);
    setUnitOwnerMap(ownerMap);
    setAllUnits(fetchedUnits);
    setAllMembers(fetchedMembers);
    setAssessments(fetchedAssessments);
    setLoading(false);
  }, [community.id, isBoard, unit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle payment success/cancelled URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Payment successful! Your invoice will be updated shortly.');
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh to pick up the updated invoice
      setTimeout(fetchData, 2000);
    } else if (payment === 'cancelled') {
      toast.info('Payment was cancelled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, fetchData]);

  // Scope data to selected unit (board unit picker or URL param)
  const filteredInvoices = useMemo(() => {
    if (!activeUnitFilter) return invoices;
    return invoices.filter((inv) => inv.unit_id === activeUnitFilter);
  }, [invoices, activeUnitFilter]);

  const filteredPayments = useMemo(() => {
    if (!activeUnitFilter) return payments;
    return payments.filter((pmt) => pmt.unit_id === activeUnitFilter);
  }, [payments, activeUnitFilter]);

  // Calculate outstanding balance from filtered invoices (respects unit filter)
  const outstandingInvoices = filteredInvoices.filter(
    (inv) => inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partial'
  );
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.amount - (inv.amount_paid ?? 0)), 0);

  const delinquentUnitIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of invoices) {
      if (inv.status === 'overdue' || (inv.status === 'partial' && new Date(inv.due_date) < new Date())) {
        ids.add(inv.unit_id);
      }
    }
    return ids;
  }, [invoices]);

  async function handleSendReminders() {
    setSendingReminders(true);
    const result = await sendPaymentReminders(community.id);
    setSendingReminders(false);
    setReminderDialogOpen(false);

    if (result.success) {
      toast.success(`Queued ${result.queued} reminder${result.queued === 1 ? '' : 's'}${result.skipped ? `, ${result.skipped} skipped (sent recently)` : ''}`);
    } else {
      toast.error(result.error || 'Failed to send reminders');
    }
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    // Update URL to reflect the selection
    if (unitId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('unit', unitId);
      router.replace(`${pathname}?${params.toString()}`);
    } else {
      router.replace(pathname);
    }
  }

  function clearUnitFilter() {
    setSelectedUnitId('');
    router.replace(pathname);
  }

  const filterUnitLabel = activeUnitFilter
    ? (() => {
        const u = allUnits.find((u) => u.id === activeUnitFilter);
        const owner = unitOwnerMap[activeUnitFilter];
        return u ? `Unit ${u.unit_number}${owner ? ` - ${owner}` : ''}` : null;
      })()
    : null;

  function handleDialogSuccess() {
    fetchData();
  }

  function handleInvoiceUpdated() {
    fetchData();
  }

  function handleWalletUpdated() {
    setRefreshKey((k) => k + 1);
    fetchData();
  }

  // Tenants see only account status, no financial details
  if (isTenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Payments
        </h1>
        <AccountStatusCard />
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          For detailed account information, please contact the property owner or the board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Payments
        </h1>
        {isBoard && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setReminderDialogOpen(true)} className="text-meta sm:text-body">
              <Bell className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Send </span>Reminders
            </Button>
            <Button variant="outline" onClick={() => setSpecialAssessmentDialogOpen(true)} className="text-meta sm:text-body">
              <AlertTriangle className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Special </span>Assessment
            </Button>
            <Button variant="outline" onClick={() => setAssessmentDialogOpen(true)} className="text-meta sm:text-body">
              <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New </span>Assessment
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="text-meta sm:text-body">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create </span>Invoice
            </Button>
          </div>
        )}
      </div>

      {/* Board: unit picker to scope all tabs to a household */}
      {isBoard && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-80">
              <UnitPicker
                communityId={community.id}
                value={selectedUnitId}
                onValueChange={handleUnitChange}
                placeholder="All households"
              />
            </div>
            {activeUnitFilter && (
              <button
                onClick={clearUnitFilter}
                className="inline-flex items-center gap-1 text-label text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Prominent household info when a unit is selected */}
          {activeUnitFilter && (() => {
            const selectedUnit = allUnits.find((u) => u.id === activeUnitFilter);
            const ownerName = unitOwnerMap[activeUnitFilter];
            if (!selectedUnit) return null;
            return (
              <div className="rounded-inner-card border border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-950/40 px-5 py-3">
                <p className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                  Unit {selectedUnit.unit_number}{selectedUnit.address ? `, ${selectedUnit.address}` : ''}
                </p>
                {ownerName && (
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                    {ownerName}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Balance summary card */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-inner-card bg-secondary-100 dark:bg-secondary-900">
              <DollarSign className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
            </div>
            <div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {activeUnitFilter ? 'Household Outstanding' : 'Total Outstanding'}
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

        {/* Wallet card — show selected unit's wallet when board picks a unit */}
        {(activeUnitFilter || unit) && (
          <WalletCard
            unitId={activeUnitFilter || unit!.id}
            isBoard={isBoard}
            onManageClick={() => setWalletDialogOpen(true)}
            refreshKey={refreshKey}
          />
        )}
      </div>

      {/* Manage payment method (if subscription active) */}
      {subscriptionStatus && !isBoard && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ManagePaymentMethodButton />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Auto-pay is {subscriptionStatus === 'active' ? 'enabled' : subscriptionStatus}
            </span>
          </div>
          <BillingDatePicker />
        </div>
      )}

      {/* Frequency selector for households */}
      <FrequencySelector onFrequencyChanged={fetchData} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          {isBoard && <TabsTrigger value="assessments">Assessments</TabsTrigger>}
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceList
            invoices={filteredInvoices}
            loading={loading}
            onInvoiceUpdated={handleInvoiceUpdated}
            unitOwnerMap={isBoard ? unitOwnerMap : undefined}
            units={isBoard ? allUnits : undefined}
            allMembers={isBoard ? allMembers : undefined}
            assessments={isBoard ? assessments : undefined}
            stripeEnabled={stripeEnabled}
            subscriptionActive={subscriptionStatus === 'active'}
            preferredBillingDay={preferredBillingDay}
          />
        </TabsContent>

        <TabsContent value="history">
          <PaymentHistory
            payments={filteredPayments}
            invoices={filteredInvoices}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="ledger">
          <HouseholdLedger refreshKey={refreshKey} initialUnitId={activeUnitFilter || undefined} hideUnitPicker={!!activeUnitFilter} />
        </TabsContent>

        {isBoard && (
          <TabsContent value="assessments">
            <AssessmentList
              assessments={assessments}
              loading={loading}
              onAssessmentUpdated={fetchData}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Create invoice dialog (board only) */}
      <CreateInvoiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Create assessment dialog (board only) */}
      <CreateAssessmentDialog
        open={assessmentDialogOpen}
        onOpenChange={setAssessmentDialogOpen}
        onSuccess={fetchData}
      />

      {/* Create special assessment dialog (board only) */}
      <CreateSpecialAssessmentDialog
        open={specialAssessmentDialogOpen}
        onOpenChange={setSpecialAssessmentDialogOpen}
        onSuccess={fetchData}
      />

      {/* Manage wallet dialog (board only) */}
      {(activeUnitFilter || unit) && (
        <ManageWalletDialog
          unitId={activeUnitFilter || unit!.id}
          currentBalance={walletBalance}
          open={walletDialogOpen}
          onOpenChange={setWalletDialogOpen}
          onSuccess={handleWalletUpdated}
        />
      )}

      {/* Send reminders dialog (board only) */}
      <AlertDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Payment Reminders</AlertDialogTitle>
            <AlertDialogDescription>
              {delinquentUnitIds.size === 0
                ? 'No overdue or past-due invoices at this time.'
                : `${delinquentUnitIds.size} unit${delinquentUnitIds.size === 1 ? ' has' : 's have'} overdue invoices. Reminders will be emailed to the head of each household. Duplicate reminders within 7 days are automatically skipped.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {delinquentUnitIds.size > 0 && (
              <AlertDialogAction onClick={handleSendReminders} disabled={sendingReminders}>
                {sendingReminders ? 'Sending...' : 'Send Reminders'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
