'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { DEFAULT_VENDORS_CONFIG } from '@/lib/types/landing';
import type { CommunityVendor, VendorVisibility } from '@/lib/types/landing';

export function LandingPageVendorsToggles() {
  const { community } = useCommunity();
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);

  const config = community.theme?.vendors_config ?? DEFAULT_VENDORS_CONFIG;
  const vendors = config.vendors ?? [];
  const nonHidden = vendors.filter((v) => v.visibility !== 'hidden');

  async function toggleVisibility(index: number, vendor: CommunityVendor) {
    const newVisibility: VendorVisibility =
      vendor.visibility === 'public' ? 'community' : 'public';

    const updatedVendors = vendors.map((v) =>
      v === vendor ? { ...v, visibility: newVisibility } : v
    );

    setSaving(vendor.name);
    const supabase = createClient();
    const { error } = await supabase
      .from('communities')
      .update({
        theme: {
          ...community.theme,
          vendors_config: {
            ...config,
            vendors: updatedVendors,
          },
        },
      })
      .eq('id', community.id);

    setSaving(null);
    if (error) {
      toast.error('Failed to update vendor visibility.');
      return;
    }
    router.refresh();
  }

  if (nonHidden.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark">
        No vendors configured yet. Add vendors in{' '}
        <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
          Settings &gt; Community
        </span>{' '}
        to manage them here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {config.title && (
        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Title: <span className="text-text-secondary-light dark:text-text-secondary-dark">{config.title}</span>
        </p>
      )}

      <div className="space-y-2">
        {nonHidden.map((vendor, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-stroke-light dark:border-stroke-dark p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {vendor.image_url ? (
                <img
                  src={vendor.image_url}
                  alt={vendor.name}
                  className="h-8 w-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                  <span className="text-xs font-bold text-gray-400">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                  {vendor.name}
                </p>
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  {vendor.visibility === 'public' ? 'Shown on landing page' : 'Dashboard only'}
                </p>
              </div>
            </div>
            <Switch
              checked={vendor.visibility === 'public'}
              onCheckedChange={() => toggleVisibility(i, vendor)}
              disabled={saving === vendor.name}
            />
          </div>
        ))}
      </div>

      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
        Toggle ON to show on the landing page. Manage vendors in Settings &gt; Community.
      </p>
    </div>
  );
}
