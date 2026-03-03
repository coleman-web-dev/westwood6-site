'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { ShieldAlert } from 'lucide-react';
import { ViolationList } from '@/components/violations/violation-list';
import { CreateViolationDialog } from '@/components/violations/create-violation-dialog';
import { ViolationDetailDialog } from '@/components/violations/violation-detail-dialog';
import type { Violation, ViolationStatus, Unit } from '@/lib/types/database';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reported', label: 'Reported' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'notice_sent', label: 'Notice Sent' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function ViolationsPage() {
  const { isBoard, community, unit } = useCommunity();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  const fetchViolations = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from('violations')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    if (!isBoard && unit) {
      query = query.eq('unit_id', unit.id);
    }

    const { data } = await query;
    setViolations((data as Violation[]) || []);
    setLoading(false);
  }, [community.id, isBoard, unit]);

  const fetchUnits = useCallback(async () => {
    if (!isBoard) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('units')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .order('unit_number');
    setUnits((data as Unit[]) || []);
  }, [isBoard, community.id]);

  useEffect(() => {
    fetchViolations();
    fetchUnits();
  }, [fetchViolations, fetchUnits]);

  const filtered = statusFilter === 'all'
    ? violations
    : violations.filter((v) => v.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            {isBoard ? 'Violations' : 'My Violations'}
          </h1>
        </div>
        {isBoard && (
          <Button onClick={() => setCreateOpen(true)}>
            Report Violation
          </Button>
        )}
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

      <ViolationList
        violations={filtered}
        loading={loading}
        onSelect={setSelectedViolation}
      />

      {isBoard && (
        <CreateViolationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          units={units}
          communityId={community.id}
          onCreated={fetchViolations}
        />
      )}

      <ViolationDetailDialog
        violation={selectedViolation}
        open={selectedViolation !== null}
        onOpenChange={(open) => { if (!open) setSelectedViolation(null); }}
        onUpdated={fetchViolations}
      />
    </div>
  );
}
