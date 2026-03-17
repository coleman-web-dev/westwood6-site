'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Ruler } from 'lucide-react';
import { ArcRequestList } from '@/components/arc-requests/arc-request-list';
import { SubmitArcRequestDialog } from '@/components/arc-requests/submit-arc-request-dialog';
import { ReviewArcRequestDialog } from '@/components/arc-requests/review-arc-request-dialog';
import type { ArcRequest } from '@/lib/types/database';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'approved_with_conditions', label: 'Conditional' },
  { value: 'denied', label: 'Denied' },
];

export default function ArcRequestsPage() {
  const { isBoard, community, unit, member } = useCommunity();
  const [requests, setRequests] = useState<ArcRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ArcRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from('arc_requests')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    if (!isBoard && unit) {
      query = query.eq('unit_id', unit.id);
    }

    const { data } = await query;
    setRequests((data as ArcRequest[]) || []);
    setLoading(false);
  }, [community.id, isBoard, unit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (!community.theme?.arc_enabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          ARC Requests
        </h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Architectural review requests are not enabled for this community.
        </p>
      </div>
    );
  }

  const filtered = statusFilter === 'all'
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ruler className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            ARC Requests
          </h1>
        </div>
        <Button onClick={() => setSubmitOpen(true)}>
          Submit Request
        </Button>
      </div>

      {/* Status filter tabs (board only) */}
      {isBoard && (
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <ArcRequestList
        requests={filtered}
        loading={loading}
        onSelect={setSelectedRequest}
      />

      <SubmitArcRequestDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onCreated={fetchRequests}
      />

      <ReviewArcRequestDialog
        request={selectedRequest}
        open={selectedRequest !== null}
        onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}
        onUpdated={fetchRequests}
      />
    </div>
  );
}
