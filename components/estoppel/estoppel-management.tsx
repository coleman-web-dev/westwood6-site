'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import { FileText, RefreshCw } from 'lucide-react';
import type { EstoppelRequest } from '@/lib/types/database';
import { EstoppelReviewDialog } from '@/components/estoppel/estoppel-review-dialog';

interface EstoppelManagementProps {
  communityId: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  in_review: { label: 'In Review', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
};

function getDeadline(request: EstoppelRequest): { date: Date; overdue: boolean } {
  const created = new Date(request.created_at);
  const businessDays = request.request_type === 'expedited' ? 3 : 10;
  let daysAdded = 0;
  const deadline = new Date(created);
  while (daysAdded < businessDays) {
    deadline.setDate(deadline.getDate() + 1);
    const day = deadline.getDay();
    if (day !== 0 && day !== 6) daysAdded++;
  }
  return { date: deadline, overdue: new Date() > deadline && request.status !== 'completed' && request.status !== 'cancelled' };
}

export function EstoppelManagement({ communityId }: EstoppelManagementProps) {
  const [requests, setRequests] = useState<EstoppelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviewRequest, setReviewRequest] = useState<EstoppelRequest | null>(null);

  async function fetchRequests() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from('estoppel_requests')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load estoppel requests.');
      console.error(error);
    } else {
      setRequests(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, [communityId, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Estoppel Requests
          </h2>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-8 w-8 mx-auto mb-2 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            {statusFilter === 'all' ? 'No estoppel requests yet.' : `No ${statusFilter} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const requesterCompany = (req.requester_fields as Record<string, string>)?.requester_company || 'Unknown';
            const lotNumber = (req.requester_fields as Record<string, string>)?.lot_number || '?';
            const ownerNames = (req.requester_fields as Record<string, string>)?.owner_names || '';
            const { date: deadline, overdue } = getDeadline(req);
            const badge = STATUS_BADGES[req.status] ?? STATUS_BADGES.pending;

            return (
              <div
                key={req.id}
                className="flex items-center justify-between border border-stroke-light dark:border-stroke-dark rounded-inner-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                      {requesterCompany}
                    </span>
                    <Badge variant="secondary" className={badge.className}>
                      {badge.label}
                    </Badge>
                    {req.request_type === 'expedited' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Expedited
                      </Badge>
                    )}
                    {overdue && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Lot {lotNumber}{ownerNames ? ` - ${ownerNames}` : ''} | Due: {deadline.toLocaleDateString()} | ${(req.fee_amount / 100).toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewRequest(req)}
                >
                  Review
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {reviewRequest && (
        <EstoppelReviewDialog
          open={!!reviewRequest}
          onOpenChange={(open) => {
            if (!open) {
              setReviewRequest(null);
              fetchRequests();
            }
          }}
          request={reviewRequest}
          communityId={communityId}
        />
      )}
    </div>
  );
}
