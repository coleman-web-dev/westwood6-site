'use client';

import { useEffect, useState } from 'react';
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
import type { SignedAgreement } from '@/lib/types/database';

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
  const { community } = useCommunity();
  const [agreement, setAgreement] = useState<(SignedAgreement & { amenities?: { name: string } }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !reservationId) return;
    setLoading(true);
    const supabase = createClient();
    async function loadAgreement() {
      const { data } = await supabase
        .from('signed_agreements')
        .select('*, amenities(name)')
        .eq('reservation_id', reservationId)
        .single();

      setAgreement(data as (SignedAgreement & { amenities?: { name: string } }) | null);
      setLoading(false);
    }
    loadAgreement();
  }, [open, reservationId]);

  function handlePrint() {
    if (!agreement) return;
    printAgreement({
      communityName: community.name,
      communityAddress: community.address ?? '',
      amenityName: agreement.amenities?.name ?? 'Amenity',
      filledText: agreement.filled_text,
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
              <div className="whitespace-pre-line text-body text-text-primary-light dark:text-text-primary-dark leading-relaxed pr-3">
                {agreement.filled_text}
              </div>
            </ScrollArea>

            {/* Signature info */}
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1">
              <div className="flex justify-between text-body">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">
                  Signed by
                </span>
                <span className="text-text-primary-light dark:text-text-primary-dark italic">
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
