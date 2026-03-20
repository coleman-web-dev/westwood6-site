import { Users, Building2 } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate, SectionStyleOverride } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

const MAX_WIDTH_MAP: Record<NonNullable<SectionStyleOverride['maxWidth']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

export function AboutSection({ config, data }: Props) {
  if (!config.about_body) return null;

  const title = config.about_title || 'About Our Community';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.about;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────── */
  if (template === 'classic') {
    // Determine stat for the side card
    const statCount = data.boardMembers.length || data.amenities.length || 0;
    const statLabel = data.boardMembers.length > 0 ? 'Board Members' : data.amenities.length > 0 ? 'Amenities' : '';
    const StatIcon = data.boardMembers.length > 0 ? Users : Building2;

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
                  About Us
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Learn more about what makes our community a great place to call home.
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Large text card */}
            <div className="lg:col-span-2 rounded-2xl p-8 sm:p-10 bg-stone-50 relative overflow-hidden">
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base relative z-10">
                {config.about_body}
              </p>
              {/* Decorative accent circle */}
              <div
                className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-[0.06]"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              />
            </div>

            {/* Stat card */}
            {statCount > 0 ? (
              <div
                className="rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden flex flex-col justify-between"
                style={{ backgroundColor: 'var(--landing-primary)' }}
              >
                <div>
                  <StatIcon className="h-8 w-8 text-white/40 mb-4" />
                  <p className="text-5xl sm:text-6xl font-bold">{statCount}</p>
                  <p className="text-sm text-white/50 mt-2 font-medium">{statLabel}</p>
                </div>
                {/* Decorative shape */}
                <div
                  className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-[0.08]"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
              </div>
            ) : (
              <div className="rounded-2xl p-8 sm:p-10 bg-stone-50 flex items-center justify-center">
                <div
                  className="h-1 w-12 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern ──────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-sm">
          {/* Left panel: primary bg with title and decorative elements */}
          <div
            className="relative md:w-[40%] shrink-0 px-8 py-12 sm:px-10 sm:py-14 flex flex-col justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--landing-primary)' }}
          >
            {/* Decorative accent vertical bar */}
            <div
              className="absolute top-0 left-0 w-1.5 h-full"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            {/* Decorative accent square */}
            <div
              className="absolute -bottom-8 -right-8 h-28 w-28 rounded-lg rotate-12 opacity-[0.1]"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            <h2 className="relative text-2xl sm:text-3xl font-bold text-white leading-tight">
              {title}
            </h2>
            {/* Small accent underline */}
            <div
              className="mt-4 h-1 w-10 rounded-full"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          {/* Right panel: body text on white */}
          <div className="md:w-[60%] bg-white px-8 py-12 sm:px-12 sm:py-14 flex items-center">
            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
              {config.about_body}
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Luxury ──────────────────────────────────────────── */
  const statCount = data.boardMembers.length || data.amenities.length || 0;
  const statLabel = data.boardMembers.length > 0 ? 'Board Members' : data.amenities.length > 0 ? 'Amenities' : '';

  return (
    <section
      className="py-24 sm:py-32 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col lg:flex-row overflow-hidden">
          {/* Left dark panel */}
          <div
            className="lg:w-[45%] shrink-0 px-10 py-16 sm:px-14 sm:py-20 flex flex-col justify-center"
            style={{ backgroundColor: 'var(--landing-primary)' }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-[0.2em] mb-6"
              style={{ color: 'var(--landing-accent)' }}
            >
              About Us
            </p>

            {/* Gold accent line above title */}
            <div
              className="h-px w-12 mb-8"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />

            <h2 className="text-3xl sm:text-4xl font-light italic text-white leading-[1.2] mb-8">
              {title}
            </h2>

            {/* Gold accent line below title */}
            <div
              className="h-px w-12 mb-10"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />

            {/* Stat display on dark panel */}
            {statCount > 0 && (
              <div className="mt-auto pt-6 border-t border-white/10">
                <p className="text-4xl font-light text-white">{statCount}</p>
                <p
                  className="text-[11px] uppercase tracking-[0.2em] mt-1"
                  style={{ color: 'var(--landing-accent)' }}
                >
                  {statLabel}
                </p>
              </div>
            )}
          </div>

          {/* Right light panel */}
          <div className="lg:w-[55%] bg-[#FAF8F5] px-10 py-16 sm:px-14 sm:py-20 flex items-center">
            <p className="text-gray-600 leading-[1.9] whitespace-pre-line text-base">
              {config.about_body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
