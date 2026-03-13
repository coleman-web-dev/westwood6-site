'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { ReportPeriodSelector, getDefaultPeriod } from '@/components/reports/report-period-selector';
import { ExportCsvButton } from '@/components/documents/export-csv-button';
import type { CsvColumn } from '@/lib/utils/export-csv';
import { CollectionSummary } from '@/components/reports/financial/collection-summary';
import { AgingReport } from '@/components/reports/financial/aging-report';
import { RevenueTrendChart } from '@/components/reports/financial/revenue-trend-chart';
import { DelinquentUnitsTable } from '@/components/reports/financial/delinquent-units-table';
import { AssessmentPerformance } from '@/components/reports/financial/assessment-performance';
import { CommunityEngagement } from '@/components/reports/community/community-engagement';
import { AmenityUsage } from '@/components/reports/community/amenity-usage';
import { VotingParticipation } from '@/components/reports/community/voting-participation';
import { Vendor1099Report } from '@/components/reports/financial/vendor-1099-report';
import type { ReportPeriod } from '@/components/reports/report-period-selector';
import type {
  Invoice,
  Payment,
  Unit,
  Member,
  Assessment,
  Reservation,
  Amenity,
  Ballot,
  BallotEligibility,
  MaintenanceRequest,
  BulletinPost,
} from '@/lib/types/database';

export default function ReportsPage() {
  const { community, member, isBoard } = useCommunity();
  const [period, setPeriod] = useState<ReportPeriod>(getDefaultPeriod);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('financial');
  const [folders, setFolders] = useState<import('@/lib/types/database').DocumentFolder[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [ballotEligibility, setBallotEligibility] = useState<BallotEligibility[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [bulletinPosts, setBulletinPosts] = useState<BulletinPost[]>([]);

  const activeAssessment = assessments.find((a) => a.is_active) ?? null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { startDate, endDate } = period;

    // Phase 1: Parallel fetches
    const [
      invoiceRes,
      unitRes,
      memberRes,
      assessmentRes,
      reservationRes,
      amenityRes,
      ballotRes,
      maintenanceRes,
      bulletinRes,
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .eq('community_id', community.id)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: false }),
      supabase
        .from('units')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'active')
        .order('unit_number', { ascending: true }),
      supabase
        .from('members')
        .select('*')
        .eq('community_id', community.id),
      supabase
        .from('assessments')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select('*')
        .eq('community_id', community.id)
        .gte('start_datetime', startDate)
        .lte('start_datetime', endDate),
      supabase
        .from('amenities')
        .select('*')
        .eq('community_id', community.id)
        .eq('active', true),
      supabase
        .from('ballots')
        .select('*')
        .eq('community_id', community.id)
        .gte('closes_at', startDate)
        .lte('closes_at', endDate),
      supabase
        .from('maintenance_requests')
        .select('*')
        .eq('community_id', community.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      supabase
        .from('bulletin_posts')
        .select('*')
        .eq('community_id', community.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
    ]);

    const fetchedInvoices = (invoiceRes.data as Invoice[]) ?? [];
    const fetchedBallots = (ballotRes.data as Ballot[]) ?? [];

    // Phase 2: Dependent fetches
    const invoiceIds = fetchedInvoices.map((inv) => inv.id);
    const ballotIds = fetchedBallots.map((b) => b.id);

    const [paymentRes, eligibilityRes] = await Promise.all([
      invoiceIds.length > 0
        ? supabase
            .from('payments')
            .select('*')
            .in('invoice_id', invoiceIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      ballotIds.length > 0
        ? supabase
            .from('ballot_eligibility')
            .select('*')
            .in('ballot_id', ballotIds)
        : Promise.resolve({ data: [] }),
    ]);

    setInvoices(fetchedInvoices);
    setPayments((paymentRes.data as Payment[]) ?? []);
    setUnits((unitRes.data as Unit[]) ?? []);
    setMembers((memberRes.data as Member[]) ?? []);
    setAssessments((assessmentRes.data as Assessment[]) ?? []);
    setReservations((reservationRes.data as Reservation[]) ?? []);
    setAmenities((amenityRes.data as Amenity[]) ?? []);
    setBallots(fetchedBallots);
    setBallotEligibility((eligibilityRes.data as BallotEligibility[]) ?? []);
    setMaintenanceRequests((maintenanceRes.data as MaintenanceRequest[]) ?? []);
    setBulletinPosts((bulletinRes.data as BulletinPost[]) ?? []);
    setLoading(false);
  }, [community.id, period]);

  const fetchFolders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('document_folders')
      .select('*')
      .eq('community_id', community.id)
      .order('name', { ascending: true });
    setFolders((data as import('@/lib/types/database').DocumentFolder[]) ?? []);
  }, [community.id]);

  useEffect(() => {
    if (isBoard) {
      fetchData();
      fetchFolders();
    }
  }, [fetchData, fetchFolders, isBoard]);

  interface UnitRow {
    unitNumber: string;
    ownerName: string;
    ownerEmail: string;
    totalBilled: number;
    totalCollected: number;
    outstanding: number;
    invoiceCount: number;
  }

  const financialColumns: CsvColumn<UnitRow>[] = [
    { header: 'Unit Number', value: (r) => r.unitNumber },
    { header: 'Owner Name', value: (r) => r.ownerName },
    { header: 'Owner Email', value: (r) => r.ownerEmail },
    { header: 'Total Billed', value: (r) => (r.totalBilled / 100).toFixed(2) },
    { header: 'Total Collected', value: (r) => (r.totalCollected / 100).toFixed(2) },
    { header: 'Outstanding', value: (r) => (r.outstanding / 100).toFixed(2) },
    { header: 'Invoice Count', value: (r) => r.invoiceCount },
  ];

  function getFinancialData(): UnitRow[] {
    const unitMap = new Map<string, UnitRow>();

    for (const unit of units) {
      const owner = members.find(
        (m) => m.unit_id === unit.id && m.member_role === 'owner' && !m.parent_member_id
      );
      unitMap.set(unit.id, {
        unitNumber: unit.unit_number,
        ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'N/A',
        ownerEmail: owner?.email ?? '',
        totalBilled: 0,
        totalCollected: 0,
        outstanding: 0,
        invoiceCount: 0,
      });
    }

    for (const inv of invoices) {
      const row = unitMap.get(inv.unit_id);
      if (!row) continue;
      row.invoiceCount += 1;
      row.totalBilled += inv.amount;
      row.totalCollected += inv.amount_paid;
      row.outstanding += inv.amount - inv.amount_paid;
    }

    return Array.from(unitMap.values()).sort((a, b) =>
      a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
    );
  }

  if (!isBoard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Reports are only available to board members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Reports
        </h1>
        <div className="flex items-end gap-3">
          <ReportPeriodSelector
            activeAssessment={activeAssessment}
            value={period}
            onChange={setPeriod}
          />
          {!loading && member && (
            <ExportCsvButton
              filename={`financial-summary-${period.startDate}-to-${period.endDate}.csv`}
              getData={getFinancialData}
              columns={financialColumns}
              saveConfig={{
                communityId: community.id,
                memberId: member.id,
                folders,
              }}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-grid-gap grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
                <div className="animate-pulse space-y-3">
                  <div className="h-10 w-10 rounded-inner-card bg-muted" />
                  <div className="h-5 w-24 rounded bg-muted" />
                  <div className="h-7 w-32 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-40 rounded bg-muted" />
            </div>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="tax">Tax / 1099</TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-grid-gap mt-4">
            <CollectionSummary invoices={invoices} payments={payments} />
            <AssessmentPerformance assessments={assessments} invoices={invoices} />
            <RevenueTrendChart payments={payments} />
            <AgingReport invoices={invoices} />
            <DelinquentUnitsTable
              invoices={invoices}
              units={units}
              members={members}
              saveConfig={member ? { communityId: community.id, memberId: member.id, folders } : undefined}
            />
          </TabsContent>

          <TabsContent value="community" className="space-y-grid-gap mt-4">
            <CommunityEngagement
              members={members}
              bulletinPosts={bulletinPosts}
              maintenanceRequests={maintenanceRequests}
            />
            <AmenityUsage reservations={reservations} amenities={amenities} />
            <VotingParticipation ballots={ballots} ballotEligibility={ballotEligibility} />
          </TabsContent>

          <TabsContent value="tax" className="space-y-grid-gap mt-4">
            <Vendor1099Report
              communityId={community.id}
              saveConfig={member ? { communityId: community.id, memberId: member.id, folders } : undefined}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
