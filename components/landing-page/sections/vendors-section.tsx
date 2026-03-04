'use client';

import { useState } from 'react';
import { Phone, Mail, Globe, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, CommunityVendor } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function VendorsSection({ community }: Props) {
  const [selected, setSelected] = useState<CommunityVendor | null>(null);
  const vendorsConfig = community.theme?.vendors_config;
  const vendors = (vendorsConfig?.vendors ?? []).filter((v) => v.visibility === 'public');
  if (vendors.length === 0) return null;

  const title = vendorsConfig?.title || 'Local Vendors & Businesses';
  const disclaimer = vendorsConfig?.disclaimer
    ? vendorsConfig.disclaimer.replace('{community_name}', community.name)
    : null;

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-10">
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(vendor)}
              className="text-left rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              {vendor.image_url ? (
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={vendor.image_url}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="aspect-[16/9] flex items-center justify-center"
                  style={{ backgroundColor: 'var(--landing-primary)' }}
                >
                  <span className="text-3xl font-bold text-white/60">
                    {vendor.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {vendor.name}
                  </h3>
                  {vendor.category && (
                    <span
                      className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: 'var(--landing-accent)' }}
                    >
                      <Tag className="h-3 w-3" />
                      {vendor.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {vendor.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {disclaimer && (
          <p className="mt-10 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
            {disclaimer}
          </p>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.name}
                  {selected.category && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: 'var(--landing-accent)' }}
                    >
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

              <p className="text-sm text-gray-600 whitespace-pre-line">
                {selected.description}
              </p>

              <div className="space-y-2 pt-2">
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <Phone className="h-4 w-4 text-gray-400" />
                    {selected.phone}
                  </a>
                )}
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selected.email}
                  </a>
                )}
                {selected.website && (
                  <a
                    href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <Globe className="h-4 w-4 text-gray-400" />
                    {selected.website}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
