'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Plus, Printer, Ban, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { WriteCheckDialog } from './write-check-dialog';
import { CheckDetailPanel } from './check-detail-panel';
import { getChecks } from '@/lib/actions/check-actions';
import type { CheckStatus, CheckWithDetails } from '@/lib/types/check';

interface CheckRegisterProps {
  communityId: string;
  initialCheckId?: string;
}

const STATUS_BADGES: Record<CheckStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ElementType }> = {
  draft: { label: 'Draft', variant: 'outline', icon: Clock },
  pending_approval: { label: 'Pending Approval', variant: 'default', icon: AlertTriangle },
  approved: { label: 'Approved', variant: 'secondary', icon: CheckCircle },
  printed: { label: 'Printed', variant: 'secondary', icon: Printer },
  voided: { label: 'Voided', variant: 'destructive', icon: Ban },
  cleared: { label: 'Cleared', variant: 'secondary', icon: CheckCircle },
};

export function CheckRegister({ communityId, initialCheckId }: CheckRegisterProps) {
  const [checks, setChecks] = useState<CheckWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [writeOpen, setWriteOpen] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(initialCheckId || null);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    const data = await getChecks(communityId, {
      status: statusFilter,
      limit: 100,
    });
    setChecks(data);
    setLoading(false);
  }, [communityId, statusFilter]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  function formatAmount(cents: number) {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 text-meta">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="printed">Printed</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {checks.length} check{checks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button size="sm" onClick={() => setWriteOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Write Check
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-light-2 dark:bg-surface-dark-2 border-b border-stroke-light dark:border-stroke-dark">
              <th className="text-left px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Check #
              </th>
              <th className="text-left px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Date
              </th>
              <th className="text-left px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Payee
              </th>
              <th className="text-left px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Category
              </th>
              <th className="text-right px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Amount
              </th>
              <th className="text-center px-card-padding py-2 text-meta font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-card-padding py-8 text-center">
                  <div className="animate-pulse h-4 w-32 mx-auto bg-muted rounded" />
                </td>
              </tr>
            ) : checks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-card-padding py-8 text-center text-body text-text-muted-light dark:text-text-muted-dark"
                >
                  No checks found. Click &quot;Write Check&quot; to get started.
                </td>
              </tr>
            ) : (
              checks.map((check) => {
                const statusInfo = STATUS_BADGES[check.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <tr
                    key={check.id}
                    className="border-b border-stroke-light dark:border-stroke-dark hover:bg-surface-light-2/50 dark:hover:bg-surface-dark-2/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCheckId(check.id)}
                  >
                    <td className="px-card-padding py-2.5 text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      {check.check_number}
                    </td>
                    <td className="px-card-padding py-2.5 text-body text-text-secondary-light dark:text-text-secondary-dark">
                      {new Date(check.date).toLocaleDateString()}
                    </td>
                    <td className="px-card-padding py-2.5">
                      <div className="text-body text-text-primary-light dark:text-text-primary-dark">
                        {check.payee_name}
                      </div>
                      {check.memo && (
                        <div className="text-meta text-text-muted-light dark:text-text-muted-dark truncate max-w-[200px]">
                          {check.memo}
                        </div>
                      )}
                    </td>
                    <td className="px-card-padding py-2.5 text-meta text-text-secondary-light dark:text-text-secondary-dark">
                      {check.expense_account
                        ? `${check.expense_account.code} - ${check.expense_account.name}`
                        : '-'}
                    </td>
                    <td className="px-card-padding py-2.5 text-right text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      {formatAmount(check.amount)}
                    </td>
                    <td className="px-card-padding py-2.5 text-center">
                      <Badge variant={statusInfo.variant} className="text-meta gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Write Check Dialog */}
      <WriteCheckDialog
        communityId={communityId}
        open={writeOpen}
        onOpenChange={setWriteOpen}
        onCheckCreated={fetchChecks}
      />

      {/* Check Detail Panel */}
      {selectedCheckId && (
        <CheckDetailPanel
          communityId={communityId}
          checkId={selectedCheckId}
          open={!!selectedCheckId}
          onOpenChange={(open) => !open && setSelectedCheckId(null)}
          onUpdate={fetchChecks}
        />
      )}
    </div>
  );
}
