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
import type { LandingPageConfig, CommunityVendor, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

/* ── Shared detail dialog ──────────────────────────────────── */
function VendorDialog({
  vendor,
  onClose,
}: {
  vendor: CommunityVendor | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!vendor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {vendor && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {vendor.name}
                {vendor.category && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: 'var(--landing-accent)' }}
                  >
                    {vendor.category}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {vendor.image_url && (
              <div className="rounded-lg overflow-hidden -mx-1">
                <img
                  src={vendor.image_url}
                  alt={vendor.name}
                  className="w-full max-h-48 object-cover"
                />
              </div>
            )}

            <p className="text-sm text-gray-600 whitespace-pre-line">
              {vendor.description}
            </p>

            <div className="space-y-2 pt-2">
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <Phone className="h-4 w-4 text-gray-400" />
                  {vendor.phone}
                </a>
              )}
              {vendor.email && (
                <a
                  href={`mailto:${vendor.email}`}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <Mail className="h-4 w-4 text-gray-400" />
                  {vendor.email}
                </a>
              )}
              {vendor.website && (
                <a
                  href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <Globe className="h-4 w-4 text-gray-400" />
                  {vendor.website}
                </a>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function VendorsSection({ community, config }: Props) {
  const [selected, setSelected] = useState<CommunityVendor | null>(null);
  const vendorsConfig = community.theme?.vendors_config;
  const vendors = (vendorsConfig?.vendors ?? []).filter((v) => v.visibility === 'public');
  if (vendors.length === 0) return null;

  const title = vendorsConfig?.title || 'Local Vendors & Businesses';
  const disclaimer = vendorsConfig?.disclaimer
    ? vendorsConfig.disclaimer.replace('{community_name}', community.name)
    : null;

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.vendors;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    const cols = overrides?.columns;
    const [featured, ...rest] = vendors;

    return (
      <section
        className="py-24 sm:py-28 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-6xl">
          {/* Two-column section header */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-16 mb-14">
            <div className="lg:w-2/5">
              <div className="inline-flex items-center gap-2 mb-4">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Directory
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Trusted vendors and service providers
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                {title}
              </h2>
            </div>
          </div>

          {/* Bento grid */}
          <div
            className={
              cols
                ? 'grid gap-5'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
            }
            style={
              cols
                ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {/* Featured vendor: spans 2 cols */}
            <button
              type="button"
              onClick={() => setSelected(featured)}
              className="text-left rounded-2xl bg-stone-50 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg group sm:col-span-2"
            >
              {featured.image_url ? (
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img
                    src={featured.image_url}
                    alt={featured.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ) : (
                <div
                  className="aspect-[16/9] flex items-center justify-center"
                  style={{ backgroundColor: 'var(--landing-primary)' }}
                >
                  <span className="text-5xl font-bold text-white/60">
                    {featured.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-6">
                <h3
                  className="text-sm font-bold"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {featured.name}
                </h3>
                {featured.category && (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-xs font-medium mt-2"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--landing-accent) 10%, white)',
                      color: 'var(--landing-accent)',
                    }}
                  >
                    {featured.category}
                  </span>
                )}
                {featured.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {featured.description}
                  </p>
                )}
              </div>
            </button>

            {/* Remaining vendors */}
            {rest.map((vendor, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(vendor)}
                className="text-left rounded-2xl bg-stone-50 overflow-hidden transition-all duration-300 hover:bg-white hover:shadow-lg group"
              >
                {vendor.image_url ? (
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <img
                      src={vendor.image_url}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center mx-6 mt-6"
                    style={{ backgroundColor: 'var(--landing-primary)' }}
                  >
                    <span className="text-xl font-bold text-white/60">
                      {vendor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--landing-primary)' }}
                  >
                    {vendor.name}
                  </h3>
                  {vendor.category && (
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-medium mt-2"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--landing-accent) 10%, white)',
                        color: 'var(--landing-accent)',
                      }}
                    >
                      {vendor.category}
                    </span>
                  )}
                  {vendor.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {vendor.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {disclaimer && (
            <p className="mt-12 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
              {disclaimer}
            </p>
          )}
        </div>

        <VendorDialog vendor={selected} onClose={() => setSelected(null)} />
      </section>
    );
  }

  /* ── Modern ─────────────────────────────────────────────── */
  if (template === 'modern') {
    const [featured, ...rest] = vendors;

    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: 'var(--landing-primary)' }}
            >
              {title}
            </h2>
            <div
              className="w-12 h-1 rounded-full mx-auto"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Featured: spans 2 cols with larger presentation */}
            <button
              type="button"
              onClick={() => setSelected(featured)}
              className="text-left rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] sm:col-span-2"
              style={{ borderBottomWidth: 4, borderBottomColor: 'var(--landing-accent)' }}
            >
              {featured.image_url ? (
                <div className="aspect-[21/9] overflow-hidden relative">
                  <img
                    src={featured.image_url}
                    alt={featured.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              ) : (
                <div
                  className="aspect-[21/9] flex items-center justify-center relative"
                  style={{ backgroundColor: 'var(--landing-primary)' }}
                >
                  <span className="text-5xl font-bold text-white/60">
                    {featured.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3
                    className="font-bold text-base"
                    style={{ color: 'var(--landing-primary)' }}
                  >
                    {featured.name}
                  </h3>
                  {featured.category && (
                    <span
                      className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: 'var(--landing-accent)' }}
                    >
                      <Tag className="h-3 w-3" />
                      {featured.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-3">
                  {featured.description}
                </p>
              </div>
            </button>

            {/* Rest of vendors */}
            {rest.map((vendor, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(vendor)}
                className="text-left rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                style={{ borderBottomWidth: 4, borderBottomColor: 'var(--landing-accent)' }}
              >
                {vendor.image_url ? (
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <img
                      src={vendor.image_url}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
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
                    <h3
                      className="font-bold text-sm"
                      style={{ color: 'var(--landing-primary)' }}
                    >
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
            <p className="mt-12 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
              {disclaimer}
            </p>
          )}
        </div>

        <VendorDialog vendor={selected} onClose={() => setSelected(null)} />
      </section>
    );
  }

  /* ── Editorial ──────────────────────────────────────────── */
  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl font-bold mb-16 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        <div className="space-y-0">
          {vendors.map((vendor, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(vendor)}
              className="w-full text-left py-6 border-b border-gray-100 last:border-b-0 hover:opacity-70 transition-opacity"
            >
              <div className="flex items-baseline gap-3 mb-1.5">
                <h3
                  className="font-bold text-base"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {vendor.name}
                </h3>
                {vendor.category && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--landing-accent)' }}
                  >
                    {vendor.category}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                {vendor.description}
              </p>
            </button>
          ))}
        </div>

        {disclaimer && (
          <p className="mt-16 text-xs text-gray-400 text-center max-w-2xl mx-auto leading-relaxed">
            {disclaimer}
          </p>
        )}
      </div>

      <VendorDialog vendor={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
