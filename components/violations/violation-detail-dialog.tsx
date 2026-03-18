'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { IssueFineDialog } from '@/components/violations/issue-fine-dialog';
import { sendViolationNoticeEmail } from '@/lib/actions/violation-actions';
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
import { CalendarClock, DollarSign } from 'lucide-react';
import { Input } from '@/components/shared/ui/input';
import type { ViolationStatus, ViolationNotice, NoticeType, DeliveryMethod, Invoice } from '@/lib/types/database';
import type { ViolationWithUnit } from '@/app/[slug]/(protected)/violations/page';

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
  violation: ViolationWithUnit | null;
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
  const [complianceDeadline, setComplianceDeadline] = useState('');
  const [fines, setFines] = useState<Invoice[]>([]);
  const [fineDialogOpen, setFineDialogOpen] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  const isDirty = useMemo(() => {
    if (!violation || !isBoard) return false;
    return (
      status !== violation.status ||
      resolutionNotes !== (violation.resolution_notes ?? '') ||
      complianceDeadline !== (violation.compliance_deadline ?? '')
    );
  }, [violation, isBoard, status, resolutionNotes, complianceDeadline]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      setShowDiscardAlert(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  useEffect(() => {
    if (violation) {
      setStatus(violation.status);
      setResolutionNotes(violation.resolution_notes ?? '');
      setComplianceDeadline(violation.compliance_deadline ?? '');
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

  const fetchFines = useCallback(async () => {
    if (!violation) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('violation_id', violation.id)
      .order('created_at', { ascending: false });
    setFines((data as Invoice[]) || []);
  }, [violation]);

  useEffect(() => {
    if (violation && open) {
      fetchNotices();
      fetchFines();
    }
  }, [violation, open, fetchNotices, fetchFines]);

  async function handleSave() {
    if (!violation) return;

    setSaving(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {
      status,
      resolution_notes: resolutionNotes.trim() || null,
      compliance_deadline: complianceDeadline || null,
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

    // Queue email to household
    sendViolationNoticeEmail(
      community.id,
      community.slug,
      violation.unit_id,
      violation.title,
      violation.category,
      violation.severity,
      noticeType,
      violation.description ?? undefined,
    ).catch(() => {
      // Fire-and-forget; notice is already recorded
    });

    setNoticeNotes('');
    fetchNotices();
    onUpdated();
  }

  if (!violation) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{violation.title}</DialogTitle>
          <DialogDescription>
            {violation.units?.unit_number && `Unit ${violation.units.unit_number} · `}
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

          {/* Reported location (from resident reports) */}
          {(violation.reported_units?.unit_number || violation.reported_location) && (
            <div className="px-3 py-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 space-y-1">
              <span className="text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Reported Location
              </span>
              <div className="text-body text-text-primary-light dark:text-text-primary-dark">
                {violation.reported_units?.unit_number && (
                  <p>Unit {violation.reported_units.unit_number}</p>
                )}
                {violation.reported_location && (
                  <p>{violation.reported_location}</p>
                )}
              </div>
            </div>
          )}

          {/* Compliance deadline */}
          {violation.compliance_deadline && (() => {
            const deadline = new Date(violation.compliance_deadline + 'T00:00:00');
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isPastDue = daysLeft < 0 && !['resolved', 'dismissed'].includes(violation.status);
            const isApproaching = daysLeft >= 0 && daysLeft <= 3 && !['resolved', 'dismissed'].includes(violation.status);
            return (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-inner-card text-label ${
                isPastDue ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300' :
                isApproaching ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' :
                'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark'
              }`}>
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span>
                  {isPastDue ? 'OVERDUE' : 'Compliance deadline'}:{' '}
                  {deadline.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  {isPastDue && ` (${Math.abs(daysLeft)} days past due)`}
                  {isApproaching && ` (${daysLeft} days remaining)`}
                </span>
              </div>
            );
          })()}

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

          {/* Photos */}
          {violation.photo_urls && violation.photo_urls.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                Photos
              </span>
              <div className="flex flex-wrap gap-2">
                {violation.photo_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-inner-card overflow-hidden border border-stroke-light dark:border-stroke-dark hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={url}
                      alt={`Violation photo ${i + 1}`}
                      className="h-24 w-24 object-cover"
                    />
                  </a>
                ))}
              </div>
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
                  Compliance Deadline
                </label>
                <Input
                  type="date"
                  value={complianceDeadline}
                  onChange={(e) => setComplianceDeadline(e.target.value)}
                />
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

          {/* Fines section (board) */}
          {isBoard && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                  Fines
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFineDialogOpen(true)}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Issue Fine
                </Button>
              </div>
              {fines.length > 0 ? (
                <div className="space-y-2">
                  {fines.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between px-3 py-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
                    >
                      <div>
                        <p className="text-label text-text-primary-light dark:text-text-primary-dark">
                          {f.title}
                        </p>
                        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                          Due {new Date(f.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-label text-text-primary-light dark:text-text-primary-dark">
                          ${(f.amount / 100).toFixed(2)}
                        </p>
                        <Badge variant={f.status === 'paid' ? 'secondary' : f.status === 'overdue' ? 'destructive' : 'default'} className="text-[10px]">
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  No fines issued.
                </p>
              )}
            </div>
          )}

          {/* Fines display (resident read-only) */}
          {!isBoard && fines.length > 0 && (
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4 space-y-3">
              <h4 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                Fines
              </h4>
              <div className="space-y-2">
                {fines.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-3 py-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
                  >
                    <div>
                      <p className="text-label text-text-primary-light dark:text-text-primary-dark">
                        {f.title}
                      </p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        Due {new Date(f.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-label text-text-primary-light dark:text-text-primary-dark">
                        ${(f.amount / 100).toFixed(2)}
                      </p>
                      <Badge variant={f.status === 'paid' ? 'secondary' : f.status === 'overdue' ? 'destructive' : 'default'} className="text-[10px]">
                        {f.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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

    {isBoard && violation && (
      <IssueFineDialog
        open={fineDialogOpen}
        onOpenChange={setFineDialogOpen}
        violation={violation}
        onFineIssued={() => { fetchFines(); onUpdated(); }}
      />
    )}

    <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close without saving?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowDiscardAlert(false);
              onOpenChange(false);
            }}
          >
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
