'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { HardHat } from 'lucide-react';
import { VendorList } from '@/components/vendors/vendor-list';
import { CreateVendorDialog } from '@/components/vendors/create-vendor-dialog';
import { VendorDetailDialog } from '@/components/vendors/vendor-detail-dialog';
import type { Vendor, VendorCategory } from '@/lib/types/database';

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

export default function VendorsPage() {
  const { isBoard, community } = useCommunity();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const fetchVendors = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('community_id', community.id)
      .order('name');

    setVendors((data as Vendor[]) || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  if (!isBoard) {
    return (
      <div className="space-y-6">
        <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">Vendors</h1>
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          Vendor management is only available to board members.
        </p>
      </div>
    );
  }

  const filtered = categoryFilter === 'all'
    ? vendors
    : vendors.filter((v) => v.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardHat className="h-6 w-6 text-text-primary-light dark:text-text-primary-dark" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Vendors
          </h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add Vendor</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setCategoryFilter(filter.value)}
            className={`px-3 py-1.5 rounded-pill text-label transition-colors ${
              categoryFilter === filter.value
                ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark hover:bg-primary-100 dark:hover:bg-primary-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <VendorList
        vendors={filtered}
        loading={loading}
        onSelect={setSelectedVendor}
      />

      <CreateVendorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        onCreated={fetchVendors}
      />

      <VendorDetailDialog
        vendor={selectedVendor}
        open={selectedVendor !== null}
        onOpenChange={(open) => { if (!open) setSelectedVendor(null); }}
        onUpdated={fetchVendors}
      />
    </div>
  );
}
