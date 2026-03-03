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
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Loader2, Download, FileSignature } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { printAgreement } from '@/lib/utils/print-agreement';
import {
  buildSystemContext,
  fillAgreementTemplateHtml,
} from '@/lib/utils/agreement-template';
import { formatAgreementHtml, formatAgreementPlainText } from '@/lib/utils/format-agreement';
import type { SignedAgreement, Reservation } from '@/lib/types/database';

interface AgreementWithJoins extends SignedAgreement {
  amenities?: { name: string; agreement_template: string | null };
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
  const { community, member, unit } = useCommunity();
  const [agreement, setAgreement] = useState<AgreementWithJoins | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reservationId) return;
    setLoading(true);
    const supabase = createClient();
    async function loadAgreement() {
      const { data } = await supabase
        .from('signed_agreements')
        .select('*, amenities(name, agreement_template), reservations(start_datetime, end_datetime, purpose, guest_count, fee_amount, deposit_amount), units(unit_number)')
        .eq('reservation_id', reservationId)
        .single();

      setAgreement(data as AgreementWithJoins | null);
      setLoading(false);
    }
    loadAgreement();
  }, [open, reservationId]);

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

      // Look up the unit number from the agreement's unit_id
      // We'll fetch it in a moment, but for now use field_answers + system context
      const htmlRaw = fillAgreementTemplateHtml(template, systemContext, agreement.field_answers ?? {});
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
  );
}
