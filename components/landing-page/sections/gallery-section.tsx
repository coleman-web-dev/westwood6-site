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
    const gridClass = cols
      ? `grid gap-4`
      : 'grid grid-cols-2 sm:grid-cols-3 gap-4';
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Photo Gallery
          </h2>
          <div className={gridClass} style={gridStyle}>
            {config.gallery_images.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden group">
                <Image
                  src={img.url}
                  alt={img.caption || `Community photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (masonry) ────────────────────────────────────── */
  if (template === 'modern') {
    const cols = overrides?.columns ?? 3;
    const colClass =
      cols === 1 ? 'columns-1' :
      cols === 2 ? 'columns-2' :
      cols === 4 ? 'columns-2 sm:columns-4' :
      'columns-2 sm:columns-3';

    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Photo Gallery
          </h2>
          <div className={`${colClass} gap-4`}>
            {config.gallery_images.map((img, i) => (
              <div key={i} className="break-inside-avoid mb-4 rounded-xl overflow-hidden group relative">
                <img
                  src={img.url}
                  alt={img.caption || `Community photo ${i + 1}`}
                  className="w-full h-auto object-cover"
                />
                {img.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white">{img.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (full-width single column) ────────────────── */
  return (
    <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-2xl font-semibold mb-10 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Photo Gallery
        </h2>
        <div className="space-y-8">
          {config.gallery_images.map((img, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="relative aspect-[16/9]">
                <Image
                  src={img.url}
                  alt={img.caption || `Community photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              {img.caption && (
                <p className="text-sm text-gray-500 mt-3 text-center italic">
                  {img.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
