'use client';

import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Loader2, Download, FileSignature, ClipboardCheck, CheckCircle2, Clock } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { printAgreement } from '@/lib/utils/print-agreement';
import {
  buildSystemContext,
  fillAgreementTemplateHtml,
  partitionFieldsByPhase,
} from '@/lib/utils/agreement-template';
import { formatAgreementHtml, formatAgreementPlainText } from '@/lib/utils/format-agreement';
import { CompleteAgreementDialog } from '@/components/amenities/complete-agreement-dialog';
import type { AgreementField, SignedAgreement, Reservation } from '@/lib/types/database';

interface AgreementWithJoins extends SignedAgreement {
  amenities?: { name: string; agreement_template: string | null; agreement_fields: AgreementField[] | null };
  reservations?: Reservation;
  units?: { unit_number: string };
}

interface SignedAgreementViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
}

export function SignedAgreementViewer({
  open,
  onOpenChange,
  reservationId,
}: SignedAgreementViewerProps) {
  const { community, isBoard } = useCommunity();
  const [agreement, setAgreement] = useState<AgreementWithJoins | null>(null);
  const [loading, setLoading] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  function loadAgreement() {
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('signed_agreements')
      .select('*, amenities(name, agreement_template, agreement_fields), reservations(start_datetime, end_datetime, purpose, guest_count, fee_amount, deposit_amount), units(unit_number)')
      .eq('reservation_id', reservationId)
      .single()
      .then(({ data }) => {
        setAgreement(data as AgreementWithJoins | null);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!open || !reservationId) return;
    loadAgreement();
  }, [open, reservationId]);

  // Check if this agreement has post-event fields
  const hasPostEventFields = useMemo(() => {
    if (!agreement?.amenities?.agreement_fields) return false;
    const { postEventFields } = partitionFieldsByPhase(agreement.amenities.agreement_fields);
    return postEventFields.length > 0;
  }, [agreement]);

  // Build formatted HTML from the original template + field answers + reservation data
  const displayHtml = useMemo(() => {
    if (!agreement) return '';

    const template = agreement.amenities?.agreement_template;
    const reservation = agreement.reservations;

    // If we have the original template and reservation data, reconstruct with underlines
    if (template && reservation) {
      const startDate = new Date(reservation.start_datetime);
      const endDate = new Date(reservation.end_datetime);

      const systemContext = buildSystemContext({
        memberName: agreement.signer_name,
        unitNumber: agreement.units?.unit_number ?? '',
        amenityName: agreement.amenities?.name ?? '',
        communityName: community.name,
        communityAddress: community.address ?? '',
        reservationDate: format(startDate, 'EEEE, MMMM d, yyyy'),
        startTime: format(startDate, 'h:mm a'),
        endTime: format(endDate, 'h:mm a'),
        fee: reservation.fee_amount > 0 ? `$${(reservation.fee_amount / 100).toFixed(2)}` : '$0.00',
        deposit: reservation.deposit_amount > 0 ? `$${(reservation.deposit_amount / 100).toFixed(2)}` : '$0.00',
        guestCount: reservation.guest_count?.toString() ?? 'N/A',
        purpose: reservation.purpose ?? 'N/A',
        signingDate: format(new Date(agreement.signed_at), 'MMMM d, yyyy'),
      });

      // Merge reservation answers + post-event answers for full display
      const allAnswers: Record<string, string> = {
        ...(agreement.field_answers ?? {}),
        ...(agreement.post_event_field_answers ?? {}),
      };

      const htmlRaw = fillAgreementTemplateHtml(template, systemContext, allAnswers);
      return formatAgreementHtml(htmlRaw);
    }

    // Fallback: just format the plain filled text with paragraph structure
    return formatAgreementPlainText(agreement.filled_text);
  }, [agreement, community]);

  // Also build the HTML for printing (same formatted version)
  const printHtml = useMemo(() => {
    if (!agreement) return '';
    return displayHtml;
  }, [agreement, displayHtml]);

  function handlePrint() {
    if (!agreement) return;
    printAgreement({
      communityName: community.name,
      communityAddress: community.address ?? '',
      amenityName: agreement.amenities?.name ?? 'Amenity',
      filledText: agreement.filled_text,
      filledHtml: printHtml,
      signerName: agreement.signer_name,
      signedAt: format(new Date(agreement.signed_at), 'MMMM d, yyyy \'at\' h:mm a'),
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-secondary-500" />
              Signed Agreement
            </DialogTitle>
            <DialogDescription>
              {agreement
                ? `${agreement.amenities?.name ?? 'Amenity'} rental agreement`
                : 'Loading agreement...'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
            </div>
          ) : agreement ? (
            <div className="space-y-4 py-2">
              {/* Post-event status indicator */}
              {hasPostEventFields && (
                <div className={`flex items-center gap-2 rounded-inner-card p-3 ${
                  agreement.post_event_completed
                    ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  {agreement.post_event_completed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-body text-green-700 dark:text-green-300 font-medium">
                          Post-event inspection completed
                        </p>
                        {agreement.post_event_completed_at && (
                          <p className="text-meta text-green-600/70 dark:text-green-400/70">
                            {format(new Date(agreement.post_event_completed_at), 'MMM d, yyyy \'at\' h:mm a')}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-body text-amber-700 dark:text-amber-300 font-medium">
                          Pending post-event inspection
                        </p>
                      </div>
                      {isBoard && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompleteDialogOpen(true)}
                          className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Complete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              <ScrollArea className="h-[350px] rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4">
                <div
                  className="text-body text-text-primary-light dark:text-text-primary-dark leading-relaxed pr-3 [&_u]:underline [&_u]:decoration-secondary-500/60 [&_u]:underline-offset-2 [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
              </ScrollArea>

              {/* Signature info */}
              <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
                <div className="flex justify-between items-baseline text-body">
                  <span className="text-text-secondary-light dark:text-text-secondary-dark">
                    Signed by
                  </span>
                  <span className="font-signature text-xl text-text-primary-light dark:text-text-primary-dark">
                    {agreement.signer_name}
                  </span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-text-secondary-light dark:text-text-secondary-dark">
                    Date signed
                  </span>
                  <span className="text-text-primary-light dark:text-text-primary-dark">
                    {format(new Date(agreement.signed_at), 'MMMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                Agreement not found.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {agreement && (
              <Button variant="outline" onClick={handlePrint}>
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-event completion dialog */}
      {agreement && !agreement.post_event_completed && hasPostEventFields && (
        <CompleteAgreementDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          agreement={agreement}
          onSuccess={() => {
            // Reload agreement to show updated status
            loadAgreement();
          }}
        />
      )}
    </>
  );
}
