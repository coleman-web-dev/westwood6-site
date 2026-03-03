import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
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

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
