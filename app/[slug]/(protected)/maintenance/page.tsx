'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { RequestList } from '@/components/maintenance/request-list';
import { CreateRequestDialog } from '@/components/maintenance/create-request-dialog';
import { RequestDetailDialog } from '@/components/maintenance/request-detail-dialog';
import type { MaintenanceRequest, RequestStatus } from '@/lib/types/database';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function MaintenancePage() {
  const { community, member, unit, isBoard } = useCommunity();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (isBoard) {
      query = query.eq('community_id', community.id);
    } else if (unit) {
      query = query.eq('unit_id', unit.id);
    } else {
      // No unit assigned, nothing to fetch
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data } = await query;
    setRequests((data as MaintenanceRequest[]) ?? []);
    setLoading(false);
  }, [community.id, unit, isBoard]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function handleSelect(request: MaintenanceRequest) {
    setSelectedRequest(request);
    setDetailOpen(true);
  }

  function handleCreated() {
    fetchRequests();
  }

  function handleUpdated() {
    fetchRequests();
  }

  function filterByStatus(status: string): MaintenanceRequest[] {
    if (status === 'all') return requests;
    return requests.filter((r) => r.status === status);
  }

  // Board view uses tabs for status filtering
  // Resident view shows a simple list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Maintenance Requests
        </h1>
        {unit && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Board view with tabs */}
      {isBoard ? (
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <RequestList
                requests={filterByStatus(tab.value)}
                loading={loading}
                emptyMessage={
                  tab.value === 'all'
                    ? 'No maintenance requests.'
                    : `No ${tab.label.toLowerCase()} requests.`
                }
                onSelect={handleSelect}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        /* Resident view: simple list */
        <RequestList
          requests={requests}
          loading={loading}
          emptyMessage="No maintenance requests."
          onSelect={handleSelect}
        />
      )}

      {/* Create request dialog */}
      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />

      {/* Request detail dialog */}
      <RequestDetailDialog
        request={selectedRequest}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
