'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
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
import { Loader2, Printer, Ban, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCheckById,
  approveCheck,
  rejectCheck,
  printCheck,
  voidCheck,
} from '@/lib/actions/check-actions';
import { CheckPrintPreview } from './check-print-preview';
import type { CheckWithDetails } from '@/lib/types/check';

interface CheckDetailPanelProps {
  communityId: string;
  checkId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function CheckDetailPanel({
  communityId,
  checkId,
  open,
  onOpenChange,
  onUpdate,
}: CheckDetailPanelProps) {
  const [check, setCheck] = useState<CheckWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const fetchCheck = useCallback(async () => {
    setLoading(true);
    const data = await getCheckById(communityId, checkId);
    setCheck(data);
    setLoading(false);
  }, [communityId, checkId]);

  useEffect(() => {
    if (open) fetchCheck();
  }, [open, fetchCheck]);

  function formatAmount(cents: number) {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  async function handleApprove() {
    setActing(true);
    const result = await approveCheck(communityId, checkId);
    setActing(false);
    if (result.success) {
      toast.success('Check approved.');
      fetchCheck();
      onUpdate();
    } else {
      toast.error(result.error || 'Failed to approve check.');
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    setActing(true);
    const result = await rejectCheck(communityId, checkId, rejectReason);
    setActing(false);
    setRejectDialogOpen(false);
    if (result.success) {
      toast.success('Check rejected.');
      fetchCheck();
      onUpdate();
    } else {
      toast.error(result.error || 'Failed to reject check.');
    }
  }

  async function handlePrint() {
    setActing(true);
    const result = await printCheck(communityId, checkId);
    setActing(false);
    if (result.success) {
      toast.success('Check marked as printed. Journal entry created.');
      setShowPrintPreview(true);
      fetchCheck();
      onUpdate();
    } else {
      toast.error(result.error || 'Failed to print check.');
    }
  }

  async function handleVoid() {
    if (!voidReason.trim()) {
      toast.error('Please provide a reason for voiding.');
      return;
    }
    setActing(true);
    const result = await voidCheck(communityId, checkId, voidReason);
    setActing(false);
    setVoidDialogOpen(false);
    if (result.success) {
      toast.success('Check voided. Journal entry reversed.');
      fetchCheck();
      onUpdate();
    } else {
      toast.error(result.error || 'Failed to void check.');
    }
  }

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {check ? `Check #${check.check_number}` : 'Check Details'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : !check ? (
            <p className="py-8 text-center text-body text-text-muted-light dark:text-text-muted-dark">
              Check not found.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    check.status === 'voided'
                      ? 'destructive'
                      : check.status === 'pending_approval'
                        ? 'default'
                        : 'secondary'
                  }
                  className="text-meta"
                >
                  {check.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {new Date(check.date).toLocaleDateString()}
                </span>
              </div>

              {/* Details */}
              <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Payee</span>
                  <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                    {check.payee_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Amount</span>
                  <span className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark">
                    {formatAmount(check.amount)}
                  </span>
                </div>
                {check.memo && (
                  <div className="flex justify-between">
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Memo</span>
                    <span className="text-body text-text-secondary-light dark:text-text-secondary-dark text-right max-w-[60%]">
                      {check.memo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Expense Category</span>
                  <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    {check.expense_account
                      ? `${check.expense_account.code} - ${check.expense_account.name}`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Bank Account</span>
                  <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    {check.bank_account
                      ? `${check.bank_account.code} - ${check.bank_account.name}`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Approvals */}
              {check.approvals && check.approvals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                    Approvals
                  </h4>
                  <div className="space-y-1.5">
                    {check.approvals.map((approval) => (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-light-2 dark:bg-surface-dark-2"
                      >
                        <div className="flex items-center gap-2">
                          {approval.status === 'approved' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : approval.status === 'rejected' ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-yellow-500" />
                          )}
                          <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                            {approval.signer?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                          {approval.status === 'approved' && approval.approved_at
                            ? new Date(approval.approved_at).toLocaleDateString()
                            : approval.status === 'rejected' && approval.rejected_at
                              ? `Rejected: ${approval.rejection_reason || ''}`
                              : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-stroke-light dark:border-stroke-dark">
                {check.status === 'pending_approval' && (
                  <>
                    <Button size="sm" onClick={handleApprove} disabled={acting}>
                      {acting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={acting}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {(check.status === 'approved' || check.status === 'draft') && (
                  <Button size="sm" onClick={handlePrint} disabled={acting}>
                    {acting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Printer className="h-3.5 w-3.5 mr-1" />
                    )}
                    Print Check
                  </Button>
                )}
                {check.status === 'printed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPrintPreview(true)}
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Reprint
                  </Button>
                )}
                {check.status !== 'voided' && check.status !== 'cleared' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setVoidDialogOpen(true)}
                    disabled={acting}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Void
                  </Button>
                )}
              </div>

              {/* Voided info */}
              {check.status === 'voided' && check.void_reason && (
                <div className="rounded-inner-card border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-meta font-semibold text-red-600 dark:text-red-400">
                    Voided
                  </p>
                  <p className="text-meta text-red-600/80 dark:text-red-400/80">
                    {check.void_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Check</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the check and reverse any associated journal entry. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Input
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for voiding..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} disabled={acting}>
              {acting ? 'Voiding...' : 'Void Check'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Check</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejecting this check. The check will be returned to draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={acting}>
              {acting ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Preview */}
      {showPrintPreview && check && (
        <CheckPrintPreview
          check={check}
          communityId={communityId}
          open={showPrintPreview}
          onOpenChange={setShowPrintPreview}
        />
      )}
    </>
  );
}
