import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function AmenitiesSection({ config, data }: Props) {
  if (data.amenities.length === 0) return null;

  const title = config.amenities_title || 'Community Amenities';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.amenities;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    const [featured, ...rest] = data.amenities;

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
                  Amenities
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Everything you need, right at your doorstep
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Featured card */}
            <div
              className="lg:col-span-2 rounded-2xl p-8 min-h-[200px] text-white relative overflow-hidden"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            >
              {featured.icon && (
                <span className="text-4xl mb-4 block">{featured.icon}</span>
              )}
              <h3 className="text-lg font-bold">{featured.name}</h3>
              {featured.description && (
                <p className="text-sm text-white/70 mt-1">
                  {featured.description}
                </p>
              )}
              {/* Decorative circle */}
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white opacity-[0.15]" />
            </div>

            {/* Remaining amenity cards */}
            {rest.map((amenity) => (
              <div
                key={amenity.id}
                className="rounded-2xl bg-stone-50 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg"
              >
                {amenity.icon && (
                  <span className="text-3xl mb-3 block">{amenity.icon}</span>
                )}
                <h3
                  className="text-sm font-bold"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {amenity.name}
                </h3>
                {amenity.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                    {amenity.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern ─────────────────────────────────────────────── */
  if (template === 'modern') {
    const cols = overrides?.columns;
    const gridClass = cols
      ? 'grid gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-6';
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

    return (
      <section
        className="py-20 px-6 bg-white"
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

          <div className={gridClass} style={gridStyle}>
            {data.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="group bg-white rounded-xl p-6 border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ borderTopWidth: 4, borderTopColor: 'var(--landing-accent)' }}
              >
                <div className="mb-4">
                  {amenity.icon ? (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--landing-accent) 12%, transparent)',
                      }}
                    >
                      {amenity.icon}
                    </div>
                  ) : (
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: 'var(--landing-accent)' }}
                    >
                      {amenity.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3
                  className="text-sm font-bold mb-1.5"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {amenity.name}
                </h3>
                {amenity.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                    {amenity.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ──────────────────────────────────────────── */
  const cols = overrides?.columns ?? 4;
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-5xl">
        <h2
          className="text-3xl font-bold mb-16 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="grid gap-10" style={gridStyle}>
          {data.amenities.map((amenity) => (
            <div
              key={amenity.id}
              className="text-center pb-8 border-b border-gray-100 last:border-b-0"
            >
              {amenity.icon && (
                <span className="text-5xl block mb-4">{amenity.icon}</span>
              )}
              <h3
                className="text-sm font-medium tracking-wide mb-2"
                style={{ color: 'var(--landing-primary)' }}
              >
                {amenity.name}
              </h3>
              {amenity.description && (
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 max-w-[200px] mx-auto">
                  {amenity.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
