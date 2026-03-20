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
    const cols = overrides?.columns;
    const gridClass = cols
      ? 'grid gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6';
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

    return (
      <section
        className="py-20 px-6 bg-gray-50"
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
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              Explore the shared spaces and amenities available to our community members.
            </p>
          </div>
          <div className={gridClass} style={gridStyle}>
            {data.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center"
              >
                {amenity.icon && (
                  <span className="text-3xl mb-3 block">{amenity.icon}</span>
                )}
                <h3
                  className="text-sm font-bold mb-1"
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
