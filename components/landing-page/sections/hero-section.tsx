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

export function HeroSection({ community, config }: Props) {
  const headline = config.hero_headline || `Welcome to ${community.name}`;
  const subheadline = config.hero_subheadline || community.address || '';

  return (
    <section className="relative overflow-hidden">
      {config.hero_image_url ? (
        <div className="relative h-[400px] sm:h-[500px]">
          <Image
            src={config.hero_image_url}
            alt={headline}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
              {community.logo_url && (
                <img
                  src={community.logo_url}
                  alt={`${community.name} logo`}
                  className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover"
                />
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {headline}
              </h1>
              {subheadline && (
                <p className="mt-3 text-lg text-white/80">{subheadline}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="py-20 px-6"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <div className="mx-auto max-w-2xl text-center">
            {community.logo_url && (
              <img
                src={community.logo_url}
                alt={`${community.name} logo`}
                className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover"
              />
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-3 text-lg text-white/80">{subheadline}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
