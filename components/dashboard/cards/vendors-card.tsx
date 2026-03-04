'use client';

import { useState } from 'react';
import { Phone, Mail, Globe, Tag } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import type { CommunityVendor } from '@/lib/types/landing';

export function VendorsCard() {
  const { community } = useCommunity();
  const [selected, setSelected] = useState<CommunityVendor | null>(null);

  const vendors = (community.theme?.vendors_config?.vendors ?? []).filter(
    (v) => v.visibility === 'public' || v.visibility === 'community'
  );

  return (
    <DashboardCardShell title="Vendors & Businesses">
      {vendors.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No vendors listed yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {vendors.map((vendor, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setSelected(vendor)}
                className="w-full flex items-center gap-3 rounded-xl border border-stroke-light dark:border-stroke-dark p-2.5 text-left hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
              >
                {vendor.image_url ? (
                  <img
                    src={vendor.image_url}
                    alt={vendor.name}
                    className="h-9 w-9 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-800">
                    <span className="text-sm font-bold text-gray-400">
                      {vendor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                    {vendor.name}
                  </p>
                  {vendor.category && (
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                      {vendor.category}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.name}
                  {selected.category && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-400/20 px-2 py-0.5 text-[11px] font-medium text-secondary-600 dark:text-secondary-400">
                      <Tag className="h-3 w-3" />
                      {selected.category}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              {selected.image_url && (
                <div className="rounded-lg overflow-hidden -mx-1">
                  <img
                    src={selected.image_url}
                    alt={selected.name}
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              )}

              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark whitespace-pre-line">
                {selected.description}
              </p>

              <div className="space-y-2 pt-2">
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
                  >
                    <Phone className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                    {selected.phone}
                  </a>
                )}
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
                  >
                    <Mail className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                    {selected.email}
                  </a>
                )}
                {selected.website && (
                  <a
                    href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
                  >
                    <Globe className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                    {selected.website}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardCardShell>
  );
}
