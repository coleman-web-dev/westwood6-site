import Image from 'next/image';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function GallerySection({ config }: Props) {
  if (config.gallery_images.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Photo Gallery
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
