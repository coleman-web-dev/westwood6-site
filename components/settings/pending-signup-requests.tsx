'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { approveSignupRequest, denySignupRequest } from '@/lib/actions/signup-actions';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { CheckCircle2, XCircle, Clock, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { SignupRequest, Unit } from '@/lib/types/database';

type StatusFilter = 'pending' | 'all';

export function PendingSignupRequests() {
  const { community } = useCommunity();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('pending');

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<SignupRequest | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'member' | 'tenant'>('member');
  const [approving, setApproving] = useState(false);

  // Deny dialog
  const [denyTarget, setDenyTarget] = useState<SignupRequest | null>(null);
  const [denying, setDenying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const query = supabase
      .from('signup_requests')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query.eq('status', 'pending');
    }

    const [{ data: reqData }, { data: unitData }] = await Promise.all([
      query,
      supabase
        .from('units')
        .select('id, unit_number, address')
        .eq('community_id', community.id)
        .order('unit_number'),
    ]);

    setRequests((reqData as SignupRequest[]) ?? []);
    setUnits((unitData as Unit[]) ?? []);
    setLoading(false);
  }, [community.id, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleApprove() {
    if (!approveTarget) return;
    setApproving(true);

    const result = await approveSignupRequest(
      approveTarget.id,
      selectedUnitId || null,
      selectedRole,
    );

    if (result.success) {
      toast.success(`${approveTarget.first_name} ${approveTarget.last_name} has been approved.`);
      setApproveTarget(null);
      setSelectedUnitId('');
      setSelectedRole('member');
      fetchData();
    } else {
      toast.error(result.error || 'Failed to approve request.');
    }
    setApproving(false);
  }

  async function handleDeny() {
    if (!denyTarget) return;
    setDenying(true);

    const result = await denySignupRequest(denyTarget.id);

    if (result.success) {
      toast.success(`Request from ${denyTarget.first_name} ${denyTarget.last_name} has been denied.`);
      setDenyTarget(null);
      fetchData();
    } else {
      toast.error(result.error || 'Failed to deny request.');
    }
    setDenying(false);
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Access Requests
          </h2>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px] h-8 text-meta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="all">All requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-20 rounded-inner-card bg-muted" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark">
          <UserPlus className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark mb-2" />
          <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
            No {filter === 'pending' ? 'pending ' : ''}requests
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
            When residents request access, they will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark">
                      {req.first_name} {req.last_name}
                    </p>
                    {req.status === 'pending' && (
                      <Badge variant="outline" className="text-meta border-amber-400/50 text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {req.status === 'approved' && (
                      <Badge variant="outline" className="text-meta border-green-400/50 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {req.status === 'denied' && (
                      <Badge variant="outline" className="text-meta border-red-400/50 text-red-600 dark:text-red-400">
                        <XCircle className="h-3 w-3 mr-1" />
                        Denied
                      </Badge>
                    )}
                  </div>
                  <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                    {req.email}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    {req.unit_number && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Unit: {req.unit_number}
                      </p>
                    )}
                    {req.phone && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Phone: {req.phone}
                      </p>
                    )}
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {new Date(req.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setApproveTarget(req);
                        // Pre-match unit if they provided a unit number
                        if (req.unit_number) {
                          const match = units.find(
                            (u) => u.unit_number.toLowerCase() === req.unit_number!.toLowerCase(),
                          );
                          if (match) setSelectedUnitId(match.id);
                        }
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDenyTarget(req)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) { setApproveTarget(null); setSelectedUnitId(''); setSelectedRole('member'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              Approve {approveTarget?.first_name} {approveTarget?.last_name} ({approveTarget?.email}) to join {community.name}.
              Assign them to a household and set their role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5">
                Assign to household
              </label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unit_number}{u.address ? ` - ${u.address}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {approveTarget?.unit_number && (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                  They entered "{approveTarget.unit_number}" as their unit/address.
                </p>
              )}
              {!selectedUnitId && (
                <div className="flex items-start gap-2 mt-2 p-2 rounded-inner-card bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-meta text-amber-700 dark:text-amber-400">
                    No unit assigned. They will be able to log in but won't see invoices or household data until assigned to a unit.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-label text-text-secondary-light dark:text-text-secondary-dark block mb-1.5">
                Member role
              </label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'owner' | 'member' | 'tenant')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="member">Member (household member)</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveTarget(null); setSelectedUnitId(''); setSelectedRole('member'); }}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={!!denyTarget} onOpenChange={(open) => { if (!open) setDenyTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Access Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to deny the request from {denyTarget?.first_name} {denyTarget?.last_name} ({denyTarget?.email})?
              Their account will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeny} disabled={denying}>
              {denying ? 'Denying...' : 'Deny Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
