'use client';

import { useEffect, useState } from 'react';
import { format, isFuture } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { DepositReturnDialog } from '@/components/amenities/deposit-return-dialog';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import { CompleteAgreementDialog } from '@/components/amenities/complete-agreement-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Textarea } from '@/components/shared/ui/textarea';
import { FileSignature, ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import type { AgreementField, SignedAgreement, Reservation, ReservationStatus } from '@/lib/types/database';

interface MyReservationsProps {
  amenityId?: string;
  refreshKey: number;
}

type ReservationWithAmenity = Reservation & {
  amenities: { name: string };
  units: { unit_number: string } | null;
  // PostgREST returns object (not array) due to UNIQUE(reservation_id) constraint
  signed_agreements: { id: string; post_event_completed: boolean; is_paper: boolean; paper_agreement_path: string | null } | null;
};

const STATUS_BADGE: Record<ReservationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  pending: { variant: 'outline', label: 'Pending' },
  approved: { variant: 'secondary', label: 'Approved' },
  denied: { variant: 'destructive', label: 'Denied' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

export function MyReservations({ amenityId, refreshKey }: MyReservationsProps) {
  const { community, unit, isBoard } = useCommunity();
  const [reservations, setReservations] = useState<ReservationWithAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningReservation, setReturningReservation] = useState<ReservationWithAmenity | null>(null);
  const [unitOwnerMap, setUnitOwnerMap] = useState<Record<string, string>>({});
  const [viewingAgreementId, setViewingAgreementId] = useState<string | null>(null);
  const [unitStandingMap, setUnitStandingMap] = useState<Record<string, boolean>>({});
  const [inspectingAgreement, setInspectingAgreement] = useState<(SignedAgreement & {
    amenities?: { name: string; agreement_template: string | null; agreement_fields: AgreementField[] | null };
    reservations?: Reservation;
    units?: { unit_number: string };
  }) | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<string | null>(null);
  const [payingDepositId, setPayingDepositId] = useState<string | null>(null);
  // Approval/denial dialog state
  const [approvingReservation, setApprovingReservation] = useState<ReservationWithAmenity | null>(null);
  const [denyingReservation, setDenyingReservation] = useState<ReservationWithAmenity | null>(null);
  const [boardMessage, setBoardMessage] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  useEffect(() => {
    if (!unit && !isBoard) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetch() {
      let query = supabase
        .from('reservations')
        .select('*, amenities(name), units(unit_number), signed_agreements(id, post_event_completed, is_paper, paper_agreement_path)')
        .order('start_datetime', { ascending: false })
        .limit(20);

      if (isBoard) {
        query = query.eq('community_id', community.id);
      } else if (unit) {
        query = query.eq('unit_id', unit.id);
      }

      if (amenityId) {
        query = query.eq('amenity_id', amenityId);
      }

      const { data } = await query;
      setReservations((data as ReservationWithAmenity[]) ?? []);

      // Load unit owners for deposit return dialog (board only)
      if (isBoard) {
        const { data: owners } = await supabase
          .from('members')
          .select('unit_id, first_name, last_name')
          .eq('community_id', community.id)
          .eq('member_role', 'owner')
          .is('parent_member_id', null);

        const ownerMap: Record<string, string> = {};
        for (const o of (owners ?? []) as { unit_id: string | null; first_name: string; last_name: string }[]) {
          if (o.unit_id) ownerMap[o.unit_id] = `${o.first_name} ${o.last_name}`;
        }
        setUnitOwnerMap(ownerMap);

        // Fetch financial standing for pending reservations
        const pendingUnitIds = [...new Set(
          ((data as ReservationWithAmenity[]) ?? [])
            .filter((r) => r.status === 'pending' && r.unit_id)
            .map((r) => r.unit_id as string)
        )];

        if (pendingUnitIds.length > 0) {
          const { data: overdueInvoices } = await supabase
            .from('invoices')
            .select('unit_id')
            .in('unit_id', pendingUnitIds)
            .in('status', ['overdue', 'partial']);

          const standingMap: Record<string, boolean> = {};
          for (const uid of pendingUnitIds) standingMap[uid] = false;
          for (const inv of (overdueInvoices ?? []) as { unit_id: string }[]) {
            standingMap[inv.unit_id] = true;
          }
          setUnitStandingMap(standingMap);
        }
      }

      setLoading(false);
    }

    fetch();
  }, [community.id, unit, isBoard, amenityId, refreshKey]);

  async function handleCancel(reservationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' as ReservationStatus })
      .eq('id', reservationId);

    if (error) {
      toast.error('Failed to cancel reservation.');
      return;
    }

    toast.success('Reservation cancelled.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, status: 'cancelled' as ReservationStatus } : r
      )
    );
  }

  async function handleDepositPaid(reservationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reservations')
      .update({ deposit_paid: true, deposit_paid_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) {
      toast.error('Failed to update security deposit.');
      return;
    }

    toast.success('Security deposit marked as paid.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, deposit_paid: true, deposit_paid_at: new Date().toISOString() } : r
      )
    );
  }

  async function handleFeePaid(reservationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('reservations')
      .update({ fee_paid: true, fee_paid_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) {
      toast.error('Failed to update fee status.');
      return;
    }

    toast.success('Rental fee marked as paid.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservationId ? { ...r, fee_paid: true, fee_paid_at: new Date().toISOString() } : r
      )
    );
  }

  async function handleViewPaperAgreement(filePath: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(filePath, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      toast.error('Failed to open agreement.');
    }
  }

  async function handlePayDeposit(reservation: ReservationWithAmenity) {
    setPayingDepositId(reservation.id);

    try {
      const baseUrl = window.location.origin + window.location.pathname;
      const response = await fetch('/api/amenities/deposit-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: reservation.id,
          communityId: community.id,
          successUrl: `${baseUrl}?deposit=success`,
          cancelUrl: `${baseUrl}?deposit=cancelled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to start deposit payment.');
        setPayingDepositId(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      toast.error('Something went wrong.');
      setPayingDepositId(null);
    }
  }

  async function handleApproveConfirm() {
    const reservation = approvingReservation;
    if (!reservation) return;

    setApprovalSubmitting(true);
    const supabase = createClient();
    const updateData: Record<string, unknown> = { status: 'approved' as ReservationStatus };
    if (boardMessage.trim()) updateData.board_note = boardMessage.trim();

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservation.id);

    if (error) {
      setApprovalSubmitting(false);
      toast.error('Failed to approve reservation.');
      return;
    }

    toast.success('Reservation approved.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id ? { ...r, status: 'approved' as ReservationStatus, board_note: boardMessage.trim() || null } : r
      )
    );
    setApprovingReservation(null);
    setBoardMessage('');
    setApprovalSubmitting(false);

    // Notify the member's household (only if unit assigned)
    if (reservation.unit_id) {
      const { data: unitMembers } = await supabase
        .from('members')
        .select('id')
        .eq('unit_id', reservation.unit_id)
        .eq('community_id', community.id);

      const body = boardMessage.trim()
        ? `Your reservation for ${reservation.amenities?.name ?? 'the amenity'} has been approved.\n\nMessage from the board: ${boardMessage.trim()}`
        : `Your reservation for ${reservation.amenities?.name ?? 'the amenity'} has been approved.`;

      await supabase.rpc('create_member_notifications', {
        p_community_id: community.id,
        p_type: 'reservation_approved',
        p_title: `${reservation.amenities?.name ?? 'Amenity'} reservation approved`,
        p_body: body,
        p_reference_id: reservation.id,
        p_reference_type: 'reservation',
        p_member_ids: (unitMembers ?? []).map((m) => m.id),
      }).catch(() => {});
    }
  }

  async function handleDenyConfirm() {
    const reservation = denyingReservation;
    if (!reservation) return;

    setApprovalSubmitting(true);
    const supabase = createClient();
    const updateData: Record<string, unknown> = { status: 'denied' as ReservationStatus };
    if (boardMessage.trim()) updateData.board_note = boardMessage.trim();

    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservation.id);

    if (error) {
      setApprovalSubmitting(false);
      toast.error('Failed to deny reservation.');
      return;
    }

    toast.success('Reservation denied.');
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id ? { ...r, status: 'denied' as ReservationStatus, board_note: boardMessage.trim() || null } : r
      )
    );
    setDenyingReservation(null);
    setBoardMessage('');
    setApprovalSubmitting(false);

    // Notify the member's household (only if unit assigned)
    if (reservation.unit_id) {
      const { data: unitMembers } = await supabase
        .from('members')
        .select('id')
        .eq('unit_id', reservation.unit_id)
        .eq('community_id', community.id);

      const body = boardMessage.trim()
        ? `Your reservation for ${reservation.amenities?.name ?? 'the amenity'} has been denied.\n\nMessage from the board: ${boardMessage.trim()}`
        : `Your reservation for ${reservation.amenities?.name ?? 'the amenity'} has been denied.`;

      await supabase.rpc('create_member_notifications', {
        p_community_id: community.id,
        p_type: 'reservation_denied',
        p_title: `${reservation.amenities?.name ?? 'Amenity'} reservation denied`,
        p_body: body,
        p_reference_id: reservation.id,
        p_reference_type: 'reservation',
        p_member_ids: (unitMembers ?? []).map((m) => m.id),
      }).catch(() => {});
    }
  }

  async function handleInspect(reservation: ReservationWithAmenity) {
    if (!reservation.signed_agreements) return;
    setLoadingInspect(reservation.id);
    const supabase = createClient();
    const { data } = await supabase
      .from('signed_agreements')
      .select('*, amenities(name, agreement_template, agreement_fields), reservations(start_datetime, end_datetime, purpose, guest_count, fee_amount, deposit_amount), units(unit_number)')
      .eq('reservation_id', reservation.id)
      .single();

    setLoadingInspect(null);
    if (data) {
      setInspectingAgreement(data as typeof inspectingAgreement);
    } else {
      toast.error('Could not load agreement for inspection.');
    }
  }

  function handleDepositReturnSuccess() {
    // Refetch reservations to get updated deposit status
    const supabase = createClient();
    let query = supabase
      .from('reservations')
      .select('*, amenities(name), units(unit_number), signed_agreements(id, post_event_completed, is_paper, paper_agreement_path)')
      .order('start_datetime', { ascending: false })
      .limit(20);

    if (isBoard) {
      query = query.eq('community_id', community.id);
    } else if (unit) {
      query = query.eq('unit_id', unit.id);
    }

    if (amenityId) {
      query = query.eq('amenity_id', amenityId);
    }

    query.then(({ data }) => {
      setReservations((data as ReservationWithAmenity[]) ?? []);
    });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-14 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No reservations yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((r) => {
        const isFullDay =
          new Date(r.end_datetime).getTime() - new Date(r.start_datetime).getTime() >= 23 * 60 * 60 * 1000;
        const canCancel =
          (r.status === 'pending' || r.status === 'approved') &&
          isFuture(new Date(r.start_datetime));
        const badge = STATUS_BADGE[r.status];

        return (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 py-dense-row-y px-dense-row-x rounded-inner-card bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {!amenityId && r.amenities && (
                  <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate">
                    {r.amenities.name}
                  </span>
                )}
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {r.is_manual && (
                  <Badge variant="outline" className="text-[10px]">Manual</Badge>
                )}
                {r.is_manual && r.payment_method && (
                  <Badge variant="outline" className="text-[10px]">
                    {r.payment_method === 'check' && r.check_number
                      ? `Check #${r.check_number}`
                      : r.payment_method.charAt(0).toUpperCase() + r.payment_method.slice(1)}
                  </Badge>
                )}
              </div>
              {isBoard && r.is_manual && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {r.manual_contact_name}
                    {r.manual_contact_phone ? ` · ${r.manual_contact_phone}` : ''}
                    {r.units ? ` · Unit ${r.units.unit_number}` : ''}
                  </p>
                </div>
              )}
              {isBoard && !r.is_manual && r.units && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    Unit {r.units.unit_number}{r.unit_id && unitOwnerMap[r.unit_id] ? ` - ${unitOwnerMap[r.unit_id]}` : ''}
                  </p>
                  {r.status === 'pending' && r.unit_id && unitStandingMap[r.unit_id] !== undefined && (
                    unitStandingMap[r.unit_id] ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Has Overdue Dues
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Good Standing
                      </span>
                    )
                  )}
                  {r.status === 'pending' && r.unit_id && (
                    <a
                      href={`/${community.slug}/household?unit=${r.unit_id}&back=amenities`}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-secondary-400 hover:text-secondary-400/80 transition-colors"
                    >
                      View Account
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              )}
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                {isFullDay
                  ? format(new Date(r.start_datetime), 'MMM d, yyyy')
                  : `${format(new Date(r.start_datetime), 'MMM d, h:mm a')} - ${format(new Date(r.end_datetime), 'h:mm a')}`}
                {r.fee_amount > 0 && (
                  <span className="ml-2 tabular-nums">
                    ${(r.fee_amount / 100).toFixed(2)}
                    {r.is_manual && (r.fee_paid ? ' (paid)' : ' (unpaid)')}
                  </span>
                )}
                {r.deposit_amount > 0 && (
                  <span className="ml-2">
                    {r.deposit_paid
                      ? r.deposit_refunded
                        ? r.deposit_return_method === 'wallet'
                          ? '(security deposit → wallet)'
                          : r.deposit_return_method === 'card'
                            ? '(security deposit → refunded to card)'
                            : '(security deposit refunded)'
                        : r.deposit_stripe_payment_intent
                          ? '(security deposit paid by card)'
                          : '(security deposit paid)'
                      : `(security deposit: $${(r.deposit_amount / 100).toFixed(2)})`}
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Board approve/deny for pending reservations */}
              {isBoard && r.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/40"
                    onClick={() => { setApprovingReservation(r); setBoardMessage(''); }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => { setDenyingReservation(r); setBoardMessage(''); }}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Deny
                  </Button>
                </>
              )}

              {canCancel && !isBoard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(r.id)}
                >
                  Cancel
                </Button>
              )}

              {/* Member: Pay deposit online */}
              {!isBoard && r.deposit_amount > 0 && !r.deposit_paid && (r.status === 'approved' || r.status === 'pending') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePayDeposit(r)}
                  disabled={payingDepositId === r.id}
                >
                  {payingDepositId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                  )}
                  Pay Security Deposit
                </Button>
              )}

              {/* Fee paid management (board, manual reservations) */}
              {isBoard && r.is_manual && r.fee_amount > 0 && !r.fee_paid && r.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeePaid(r.id)}
                >
                  Mark Fee Paid
                </Button>
              )}

              {/* Deposit management (board only) */}
              {isBoard && r.deposit_amount > 0 && !r.deposit_paid && r.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDepositPaid(r.id)}
                >
                  Mark Security Deposit Paid
                </Button>
              )}
              {isBoard && r.deposit_amount > 0 && r.deposit_paid && !r.deposit_refunded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReturningReservation(r)}
                >
                  Return Security Deposit
                </Button>
              )}

              {/* View signed agreement + inspection */}
              {r.signed_agreements && (
                <>
                  {isBoard && !isFuture(new Date(r.start_datetime)) && !r.signed_agreements.post_event_completed && (
                    <>
                      <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-600 dark:text-amber-400">
                        <ClipboardCheck className="h-3 w-3 mr-0.5" />
                        Pending inspection
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        onClick={() => handleInspect(r)}
                        disabled={loadingInspect === r.id}
                      >
                        {loadingInspect === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                        )}
                        Inspect
                      </Button>
                    </>
                  )}
                  {r.signed_agreements.is_paper && r.signed_agreements.paper_agreement_path ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPaperAgreement(r.signed_agreements!.paper_agreement_path!)}
                    >
                      <FileSignature className="h-4 w-4 mr-1" />
                      Paper Agreement
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingAgreementId(r.id)}
                    >
                      <FileSignature className="h-4 w-4 mr-1" />
                      Agreement
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Deposit return dialog */}
      <DepositReturnDialog
        reservation={returningReservation}
        unitOwnerName={returningReservation?.unit_id ? unitOwnerMap[returningReservation.unit_id] ?? '' : ''}
        open={returningReservation !== null}
        onOpenChange={(open) => { if (!open) setReturningReservation(null); }}
        onSuccess={handleDepositReturnSuccess}
      />

      {/* Signed agreement viewer */}
      {viewingAgreementId && (
        <SignedAgreementViewer
          open={viewingAgreementId !== null}
          onOpenChange={(open) => { if (!open) setViewingAgreementId(null); }}
          reservationId={viewingAgreementId}
        />
      )}

      {/* Direct inspection dialog */}
      {inspectingAgreement && !inspectingAgreement.post_event_completed && (
        <CompleteAgreementDialog
          open={inspectingAgreement !== null}
          onOpenChange={(open) => { if (!open) setInspectingAgreement(null); }}
          agreement={inspectingAgreement}
          onSuccess={handleDepositReturnSuccess}
        />
      )}

      {/* Approval dialog */}
      <Dialog
        open={approvingReservation !== null}
        onOpenChange={(open) => { if (!open) { setApprovingReservation(null); setBoardMessage(''); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Reservation</DialogTitle>
            <DialogDescription>
              {approvingReservation?.amenities?.name ?? 'Amenity'} on{' '}
              {approvingReservation ? format(new Date(approvingReservation.start_datetime), 'MMM d, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Message (optional)
            </label>
            <Textarea
              placeholder="Add a note for the resident..."
              value={boardMessage}
              onChange={(e) => setBoardMessage(e.target.value)}
              maxLength={500}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setApprovingReservation(null); setBoardMessage(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={approvalSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approvalSubmitting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Denial dialog */}
      <Dialog
        open={denyingReservation !== null}
        onOpenChange={(open) => { if (!open) { setDenyingReservation(null); setBoardMessage(''); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deny Reservation</DialogTitle>
            <DialogDescription>
              {denyingReservation?.amenities?.name ?? 'Amenity'} on{' '}
              {denyingReservation ? format(new Date(denyingReservation.start_datetime), 'MMM d, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Reason (optional)
            </label>
            <Textarea
              placeholder="Explain why this reservation is being denied..."
              value={boardMessage}
              onChange={(e) => setBoardMessage(e.target.value)}
              maxLength={500}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDenyingReservation(null); setBoardMessage(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={approvalSubmitting}
            >
              {approvalSubmitting ? 'Denying...' : 'Deny'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
