'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/ui/tabs';
import { DocumentList } from '@/components/documents/document-list';
import { UploadDocumentDialog } from '@/components/documents/upload-document-dialog';
import type { Document, DocCategory } from '@/lib/types/database';

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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments =
    activeTab === 'all'
      ? documents
      : documents.filter((doc) => doc.category === activeTab);

  function handleUploadSuccess() {
    fetchDocuments();
  }

  function handleDeleted() {
    fetchDocuments();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <DocumentList
              documents={
                tab.value === 'all'
                  ? documents
                  : documents.filter((doc) => doc.category === tab.value)
              }
              loading={loading}
              onDeleted={handleDeleted}
            />
          </TabsContent>
        ))}
      </Tabs>

      <UploadDocumentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
