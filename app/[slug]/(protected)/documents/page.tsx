'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Plus, FileSignature, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { DocumentList } from '@/components/documents/document-list';
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog';
import { SignedAgreementViewer } from '@/components/amenities/signed-agreement-viewer';
import type { Document, SignedAgreement } from '@/lib/types/database';

interface AgreementRow extends SignedAgreement {
  amenities?: { name: string };
  units?: { unit_number: string };
}

const CATEGORY_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rules', label: 'Rules' },
  { value: 'financial', label: 'Financial' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'forms', label: 'Forms' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsPage() {
  const { community, isBoard } = useCommunity();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Signed agreements state (for board/admin)
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [agreementsLoading, setAgreementsLoading] = useState(true);
  const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    const supabase = createClient();

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });

    setDocuments((data as Document[]) ?? []);
    setLoading(false);
  }, [community.id]);

  const fetchAgreements = useCallback(async () => {
    if (!isBoard) {
      setAgreementsLoading(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('signed_agreements')
      .select('*, amenities(name), units(unit_number)')
      .eq('community_id', community.id)
      .order('signed_at', { ascending: false });

    setAgreements((data as AgreementRow[]) ?? []);
    setAgreementsLoading(false);
  }, [community.id, isBoard]);

  useEffect(() => {
    fetchDocuments();
    fetchAgreements();
  }, [fetchDocuments, fetchAgreements]);

  function handleUploadSuccess() {
    fetchDocuments();
  }

  function handleDeleted() {
    fetchDocuments();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
          Documents
        </h1>
        {isBoard && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {CATEGORY_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="space-y-6">
              <DocumentList
                documents={
                  tab.value === 'all'
                    ? documents
                    : documents.filter((doc) => doc.category === tab.value)
                }
                loading={loading}
                onDeleted={handleDeleted}
              />

              {/* Signed agreements section (board only, on "all" and "forms" tabs) */}
              {isBoard && (tab.value === 'all' || tab.value === 'forms') && (
                <SignedAgreementsDocSection
                  agreements={agreements}
                  loading={agreementsLoading}
                  onView={(reservationId) => setViewingReservationId(reservationId)}
                />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <UploadDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleUploadSuccess}
      />

      {/* Agreement viewer */}
      {viewingReservationId && (
        <SignedAgreementViewer
          open={!!viewingReservationId}
          onOpenChange={(isOpen) => { if (!isOpen) setViewingReservationId(null); }}
          reservationId={viewingReservationId}
        />
      )}
    </div>
  );
}

// ─── Signed Agreements Sub-Section ──────────────────────
function SignedAgreementsDocSection({
  agreements,
  loading,
  onView,
}: {
  agreements: AgreementRow[];
  loading: boolean;
  onView: (reservationId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <FileSignature className="h-5 w-5 text-secondary-500" />
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Signed Agreements
          </h2>
        </div>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
          >
            <div className="animate-pulse h-9 w-9 rounded bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="animate-pulse h-4 w-2/3 rounded bg-muted" />
              <div className="animate-pulse h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agreements.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Signed Agreements
        </h2>
      </div>

      {agreements.map((a) => (
        <div
          key={a.id}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding flex items-center gap-4"
        >
          <div className="shrink-0 text-secondary-500">
            <FileSignature className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                {a.amenities?.name ?? 'Agreement'} - Unit {a.units?.unit_number ?? '?'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Signed by {a.signer_name}
              </span>
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {format(new Date(a.signed_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(a.reservation_id)}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View agreement</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
