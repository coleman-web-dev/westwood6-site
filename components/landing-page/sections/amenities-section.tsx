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
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div className={gridClass} style={gridStyle}>
            {data.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="bg-white rounded-xl p-5 shadow-sm"
              >
                {amenity.icon && (
                  <span className="text-2xl mb-2 block">{amenity.icon}</span>
                )}
                <h3 className="text-sm font-semibold text-gray-900">
                  {amenity.name}
                </h3>
                {amenity.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">
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

  /* ── Modern (alternating left/right) ─────────────────────── */
  if (template === 'modern') {
    return (
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div className="space-y-6">
            {data.amenities.map((amenity, i) => {
              const isOdd = i % 2 === 0;
              return (
                <div
                  key={amenity.id}
                  className={`flex items-center gap-5 bg-white rounded-xl p-5 shadow-sm ${
                    isOdd ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {amenity.icon && (
                    <div
                      className="shrink-0 h-14 w-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 12%, transparent)' }}
                    >
                      {amenity.icon}
                    </div>
                  )}
                  <div className={isOdd ? 'text-left' : 'text-right'}>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {amenity.name}
                    </h3>
                    {amenity.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                        {amenity.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (icon-forward, 4-col grid) ────────────────── */
  const cols = overrides?.columns ?? 4;
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-5xl">
        <h2
          className="text-2xl font-semibold mb-10 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="grid gap-8" style={gridStyle}>
          {data.amenities.map((amenity) => (
            <div key={amenity.id} className="text-center group">
              {amenity.icon && (
                <span className="text-4xl block mb-3">{amenity.icon}</span>
              )}
              <h3 className="text-sm font-semibold text-gray-900">
                {amenity.name}
              </h3>
              {amenity.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
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
