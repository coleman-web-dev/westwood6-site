'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { NoticeHistory } from '@/components/violations/notice-history';
import type { Violation, ViolationStatus, ViolationNotice, NoticeType, DeliveryMethod } from '@/lib/types/database';

const STATUS_LABELS: Record<ViolationStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  notice_sent: 'Notice Sent',
  in_compliance: 'In Compliance',
  escalated: 'Escalated',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const STATUS_VARIANT: Record<ViolationStatus, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  reported: 'destructive',
  under_review: 'default',
  notice_sent: 'default',
  in_compliance: 'secondary',
  escalated: 'destructive',
  resolved: 'secondary',
  dismissed: 'outline',
};

interface ViolationDetailDialogProps {
  violation: Violation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function ViolationDetailDialog({
  violation,
  open,
  onOpenChange,
  onUpdated,
}: ViolationDetailDialogProps) {
  const { isBoard, member, community } = useCommunity();
  const [status, setStatus] = useState<ViolationStatus>('reported');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notices, setNotices] = useState<ViolationNotice[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeType, setNoticeType] = useState<NoticeType>('courtesy');
  const [noticeNotes, setNoticeNotes] = useState('');

  useEffect(() => {
    if (violation) {
      setStatus(violation.status);
      setResolutionNotes(violation.resolution_notes ?? '');
    }
  }, [violation]);

  const fetchNotices = useCallback(async () => {
    if (!violation) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('violation_notices')
      .select('*')
      .eq('violation_id', violation.id)
      .order('sent_at', { ascending: false });
    setNotices((data as ViolationNotice[]) || []);
  }, [violation]);

  useEffect(() => {
    if (violation && open) {
      fetchNotices();
    }
  }, [violation, open, fetchNotices]);

  async function handleSave() {
    if (!violation) return;

    setSaving(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      status,
      resolution_notes: resolutionNotes.trim() || null,
    };

    if (status === 'resolved' && violation.status !== 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('violations')
      .update(updates)
      .eq('id', violation.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to update violation.');
      return;
    }

    toast.success('Violation updated.');
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'violation_updated',
      targetType: 'violation',
      targetId: violation.id,
      metadata: { status, previous_status: violation.status },
    });
    onOpenChange(false);
    onUpdated();
  }

  async function handleSendNotice() {
    if (!violation || !member) return;

    setSendingNotice(true);
    const supabase = createClient();

    const { error } = await supabase.from('violation_notices').insert({
      violation_id: violation.id,
      notice_type: noticeType,
      sent_by: member.id,
      delivery_method: 'email' as DeliveryMethod,
      notes: noticeNotes.trim() || null,
    });

    if (!error) {
      // Also update violation status to notice_sent if not already further along
      if (violation.status === 'reported' || violation.status === 'under_review') {
        await supabase
          .from('violations')
          .update({ status: 'notice_sent' })
          .eq('id', violation.id);
      }
    }

    setSendingNotice(false);

    if (error) {
      toast.error('Failed to send notice.');
      return;
    }

    toast.success('Notice recorded.');
    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'violation_notice_sent',
      targetType: 'violation',
      targetId: violation.id,
      metadata: { notice_type: noticeType },
    });
    setNoticeNotes('');
    fetchNotices();
    onUpdated();
  }

  if (!violation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{violation.title}</DialogTitle>
          <DialogDescription>
            {violation.category.charAt(0).toUpperCase() + violation.category.slice(1)} violation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status + severity */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[violation.status]}>
              {STATUS_LABELS[violation.status]}
            </Badge>
            <Badge variant="outline">
              {violation.severity.charAt(0).toUpperCase() + violation.severity.slice(1)}
            </Badge>
          </div>

          {/* Description */}
          {violation.description && (
            <div className="space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Description
              </span>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
                {violation.description}
              </p>
            </div>
          )}

          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Reported {new Date(violation.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>

          {/* Board: edit status + resolution */}
          {isBoard && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Status
                </label>
                <Select value={status} onValueChange={(v) => setStatus(v as ViolationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="notice_sent">Notice Sent</SelectItem>
                    <SelectItem value="in_compliance">In Compliance</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Resolution Notes
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Notes about resolution..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Send notice */}
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-3">
                <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                  Send Notice
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={noticeType} onValueChange={(v) => setNoticeType(v as NoticeType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="courtesy">Courtesy</SelectItem>
                      <SelectItem value="first_notice">First Notice</SelectItem>
                      <SelectItem value="second_notice">Second Notice</SelectItem>
                      <SelectItem value="final_notice">Final Notice</SelectItem>
                      <SelectItem value="hearing_notice">Hearing Notice</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleSendNotice}
                    disabled={sendingNotice}
                  >
                    {sendingNotice ? 'Sending...' : 'Record Notice'}
                  </Button>
                </div>
                <Textarea
                  value={noticeNotes}
                  onChange={(e) => setNoticeNotes(e.target.value)}
                  placeholder="Notice notes (optional)"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Resolution notes (resident read-only) */}
          {!isBoard && violation.resolution_notes && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Resolution Notes
              </span>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark whitespace-pre-line">
                {violation.resolution_notes}
              </p>
            </div>
          )}

          {/* Notice history */}
          {notices.length > 0 && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4">
              <NoticeHistory notices={notices} />
            </div>
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
