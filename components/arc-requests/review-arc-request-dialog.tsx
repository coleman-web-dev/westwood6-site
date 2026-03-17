'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Textarea } from '@/components/shared/ui/textarea';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import type { ArcRequest, ArcStatus } from '@/lib/types/database';

const STATUS_LABELS: Record<ArcStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  approved_with_conditions: 'Approved (Conditions)',
  denied: 'Denied',
};

const STATUS_VARIANT: Record<ArcStatus, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  submitted: 'default',
  under_review: 'default',
  approved: 'secondary',
  approved_with_conditions: 'secondary',
  denied: 'destructive',
};

interface ReviewArcRequestDialogProps {
  request: ArcRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function ReviewArcRequestDialog({
  request,
  open,
  onOpenChange,
  onUpdated,
}: ReviewArcRequestDialogProps) {
  const { isBoard, member, community } = useCommunity();
  const [status, setStatus] = useState<ArcStatus>('submitted');
  const [conditions, setConditions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setConditions(request.conditions ?? '');
      setExpiresAt(request.expires_at ?? '');
    }
  }, [request]);

  async function handleSave() {
    if (!request || !member) return;

    setSaving(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      status,
      conditions: conditions.trim() || null,
      expires_at: expiresAt || null,
    };

    // Set reviewed_by and reviewed_at if status changed to a review outcome
    if (['approved', 'approved_with_conditions', 'denied'].includes(status) && request.status !== status) {
      updates.reviewed_by = member.id;
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('arc_requests')
      .update(updates)
      .eq('id', request.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update request.');
      return;
    }

    toast.success('ARC request updated.');
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'arc_request_reviewed',
      targetType: 'arc_request',
      targetId: request.id,
      metadata: { status, previous_status: request.status, title: request.title },
    });

    // Notify submitter of decision
    if (['approved', 'approved_with_conditions', 'denied'].includes(status) && request.status !== status) {
      const isApproved = status === 'approved' || status === 'approved_with_conditions';
      const notifType = isApproved ? 'arc_request_approved' : 'arc_request_denied';
      const label = isApproved ? 'approved' : 'denied';
      void supabase.rpc('create_member_notifications', {
        p_community_id: community.id,
        p_type: notifType,
        p_title: `ARC request ${label}: ${request.title}`,
        p_body: conditions.trim() ? `Conditions: ${conditions.trim()}` : null,
        p_reference_id: request.id,
        p_reference_type: 'arc_request',
        p_member_ids: [request.submitted_by],
      });
    }

    onOpenChange(false);
    onUpdated();
  }

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>
            {request.project_type.charAt(0).toUpperCase() + request.project_type.slice(1)} project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[request.status]}>
              {STATUS_LABELS[request.status]}
            </Badge>
            {request.estimated_cost !== null && request.estimated_cost > 0 && (
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Est. ${(request.estimated_cost / 100).toLocaleString()}
              </span>
            )}
          </div>

          {/* Description */}
          {request.description && (
            <div className="space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description
              </span>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
                {request.description}
              </p>
            </div>
          )}

          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Submitted {new Date(request.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>

          {/* Board review controls */}
          {isBoard && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Status
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ArcStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="approved_with_conditions">Approved with Conditions</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Conditions / Notes
                </Label>
                <Textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="Conditions or notes for the homeowner..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Approval expires
                </Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Resident: show conditions */}
          {!isBoard && request.conditions && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Board Conditions
              </span>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
                {request.conditions}
              </p>
            </div>
          )}

          {request.expires_at && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Approval expires: {new Date(request.expires_at + 'T00:00:00').toLocaleDateString()}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">
              {isBoard ? 'Cancel' : 'Close'}
            </Button>
          </DialogClose>
          {isBoard && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
