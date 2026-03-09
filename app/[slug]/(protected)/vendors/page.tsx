'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { HardHat, Upload } from 'lucide-react';
import { VendorList } from '@/components/vendors/vendor-list';
import { CreateVendorDialog } from '@/components/vendors/create-vendor-dialog';
import { VendorDetailDialog } from '@/components/vendors/vendor-detail-dialog';
import { RecordVendorPaymentDialog } from '@/components/vendors/record-vendor-payment-dialog';
import { VendorCategoryManager } from '@/components/vendors/vendor-category-manager';
import { ImportVendorsDialog } from '@/components/vendors/import-vendors-dialog';
import { WriteCheckDialog } from '@/components/accounting/checks/write-check-dialog';
import { useVendorCategories } from '@/lib/hooks/use-vendor-categories';
import type { Vendor } from '@/lib/types/database';

export default function VendorsPage() {
  const { isBoard, canRead, canWrite, community, member } = useCommunity();
  const { categories, refetch: refetchCategories } = useVendorCategories(community.id);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [paymentVendor, setPaymentVendor] = useState<Vendor | null>(null);
  const [checkVendor, setCheckVendor] = useState<Vendor | null>(null);

  const fetchVendors = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('vendors')
      .select('*, vendor_categories(*)')
      .eq('community_id', community.id)
      .order('name');

    setVendors((data as Vendor[]) || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  if (!canRead('vendors')) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Vendors</h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Vendor management is only available to authorized members.
        </p>
      </div>
    );
  }

  const filtered = categoryFilter === 'all'
    ? vendors
    : vendors.filter((v) => v.category_id === categoryFilter);

  // Count vendors per category for the filter pills
  const countByCategory: Record<string, number> = {};
  for (const v of vendors) {
    countByCategory[v.category_id] = (countByCategory[v.category_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Vendors
          </h1>
        </div>
        {canWrite('vendors') && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </Button>
            <Button onClick={() => setCreateOpen(true)}>Add Vendor</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
            categoryFilter === 'all'
              ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
              : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
          }`}
        >
          All
          <span className={`ml-1.5 text-meta ${categoryFilter === 'all' ? 'opacity-70' : 'opacity-50'}`}>
            {vendors.length}
          </span>
        </button>
        {categories.map((cat) => {
          const count = countByCategory[cat.id] ?? 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
              }`}
            >
              {cat.name}
              {count > 0 && (
                <span className={`ml-1.5 text-meta ${categoryFilter === cat.id ? 'opacity-70' : 'opacity-50'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {canWrite('vendors') && (
          <button
            type="button"
            onClick={() => setCategoryManagerOpen(true)}
            className="px-2 py-1.5 rounded-pill text-label text-text-muted-light dark:text-text-muted-dark hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
            title="Manage categories"
          >
            ⚙
          </button>
        )}
      </div>

      <VendorList
        vendors={filtered}
        loading={loading}
        onSelect={setSelectedVendor}
        onWriteCheck={canWrite('vendors') ? (v) => setCheckVendor(v) : undefined}
      />

      <CreateVendorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        categories={categories}
        onCreated={fetchVendors}
      />

      <VendorDetailDialog
        vendor={selectedVendor}
        categories={categories}
        open={selectedVendor !== null}
        onOpenChange={(open) => { if (!open) setSelectedVendor(null); }}
        onUpdated={fetchVendors}
        onRecordPayment={(v) => setPaymentVendor(v)}
        onWriteCheck={(v) => setCheckVendor(v)}
      />

      <VendorCategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        communityId={community.id}
        categories={categories}
        onUpdated={refetchCategories}
      />

      <ImportVendorsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        communityId={community.id}
        categories={categories}
        onImported={fetchVendors}
      />

      <RecordVendorPaymentDialog
        vendor={paymentVendor}
        open={paymentVendor !== null}
        onOpenChange={(open) => { if (!open) setPaymentVendor(null); }}
        communityId={community.id}
        memberId={member?.id}
        onRecorded={fetchVendors}
      />

      <WriteCheckDialog
        communityId={community.id}
        open={checkVendor !== null}
        onOpenChange={(open) => { if (!open) setCheckVendor(null); }}
        onCheckCreated={fetchVendors}
        preselectedVendorId={checkVendor?.id}
      />
    </div>
  );
}
