import Image from 'next/image';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function GallerySection({ config }: Props) {
  if (config.gallery_images.length === 0) return null;

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.gallery;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    const cols = overrides?.columns;
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

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
                  Gallery
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Explore our community through photos
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                Photo Gallery
              </h2>
            </div>
          </div>

          {/* Bento grid */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-[200px] sm:auto-rows-[240px]"
            style={gridStyle}
          >
            {config.gallery_images.map((img, i) => (
              <div
                key={i}
                className={`rounded-2xl overflow-hidden relative group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
              >
                {i === 0 ? (
                  <Image
                    src={img.url}
                    alt={img.caption || `Community photo ${i + 1}`}
                    fill
                    className="object-cover w-full h-full"
                    sizes="(max-width: 640px) 100vw, 66vw"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img.url}
                    alt={img.caption || `Community photo ${i + 1}`}
                    className="object-cover w-full h-full"
                  />
                )}
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs text-white font-medium">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (masonry, sharp edges, accent overlay) ─────── */
  if (template === 'modern') {
    const cols = overrides?.columns ?? 3;
    const colClass =
      cols === 1
        ? 'columns-1'
        : cols === 2
          ? 'columns-2'
          : cols === 4
            ? 'columns-2 sm:columns-4'
            : 'columns-2 sm:columns-3';

    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-10 justify-center">
            <div
              className="h-px w-12"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--landing-primary)' }}
            >
              Photo Gallery
            </h2>
            <div
              className="h-px w-12"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          <div className={`${colClass} gap-4`}>
            {config.gallery_images.map((img, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-4 overflow-hidden group relative"
              >
                {/* Accent bar on left, visible on hover */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <img
                  src={img.url}
                  alt={img.caption || `Community photo ${i + 1}`}
                  className="w-full h-auto object-cover"
                />
                {/* Accent-tinted overlay with centered caption */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      'linear-gradient(to top, color-mix(in srgb, var(--landing-accent) 60%, black) 0%, color-mix(in srgb, var(--landing-accent) 20%, transparent) 100%)',
                  }}
                >
                  {img.caption && (
                    <p className="text-sm text-white font-semibold px-6 text-center drop-shadow-md">
                      {img.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Luxury (cinematic gallery, sharp edges, hover overlays) ── */
  return (
    <section
      className="py-24 sm:py-32 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-6xl">
        {/* Minimal centered header with accent lines */}
        <div className="flex items-center justify-center gap-6 mb-16">
          <div
            className="h-px w-16 hidden sm:block"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: 'var(--landing-primary)' }}
          >
            Gallery
          </p>
          <div
            className="h-px w-16 hidden sm:block"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {config.gallery_images.map((img, i) => (
            <div
              key={i}
              className="relative overflow-hidden group aspect-[4/3]"
            >
              <Image
                src={img.url}
                alt={img.caption || `Community photo ${i + 1}`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              {/* Hover overlay with caption */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-500 flex items-end justify-center">
                {img.caption && (
                  <p className="text-sm text-white font-light tracking-wide px-6 pb-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    {img.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
