'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import { FileSignature } from 'lucide-react';

interface SignedAgreementRow {
  id: string;
  reservation_id: string;
  signer_name: string;
  signed_at: string;
  amenities: { name: string };
  reservations: { start_datetime: string };
}

interface SignedAgreementsSectionProps {
  unitId: string;
}

export function SignedAgreementsSection({ unitId }: SignedAgreementsSectionProps) {
  const [agreements, setAgreements] = useState<SignedAgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAgreements() {
      const { data } = await supabase
        .from('signed_agreements')
        .select('id, reservation_id, signer_name, signed_at, amenities(name), reservations(start_datetime)')
        .eq('unit_id', unitId)
        .order('signed_at', { ascending: false })
        .limit(20);

      setAgreements((data as SignedAgreementRow[]) ?? []);
      setLoading(false);
    }

    fetchAgreements();
  }, [unitId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-12 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  if (agreements.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No signed agreements yet.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {agreements.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 py-dense-row-y px-dense-row-x rounded-inner-card bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark"
          >
            <div className="flex-1 min-w-0">
              <span className="text-label text-text-primary-light dark:text-text-primary-dark truncate block">
                {a.amenities?.name ?? 'Agreement'}
              </span>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                Signed by {a.signer_name} on {format(new Date(a.signed_at), 'MMM d, yyyy')}
                {a.reservations?.start_datetime && (
                  <span className="ml-2">
                    for {format(new Date(a.reservations.start_datetime), 'MMM d, yyyy')}
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingReservationId(a.reservation_id)}
            >
              <FileSignature className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        ))}
      </div>

      {viewingReservationId && (
        <SignedAgreementViewer
          open={viewingReservationId !== null}
          onOpenChange={(open) => { if (!open) setViewingReservationId(null); }}
          reservationId={viewingReservationId}
        />
      )}
    </>
  );
}
