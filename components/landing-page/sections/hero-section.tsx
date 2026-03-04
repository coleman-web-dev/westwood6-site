import Image from 'next/image';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, HeroLayout, HeroThickness } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

const IMAGE_HEIGHT: Record<HeroThickness, string> = {
  compact: 'h-[280px]',
  medium: 'h-[400px]',
  tall: 'h-[560px]',
};

const TEXT_PADDING: Record<HeroThickness, string> = {
  compact: 'py-12',
  medium: 'py-20',
  tall: 'py-28',
};

function LogoAndText({
  community,
  headline,
  subheadline,
  textColor = 'text-white',
  subColor = 'text-white/80',
}: {
  community: Community;
  headline: string;
  subheadline: string;
  textColor?: string;
  subColor?: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      {community.logo_url && (
        <img
          src={community.logo_url}
          alt={`${community.name} logo`}
          className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover"
        />
      )}
      <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight ${textColor}`}>
        {headline}
      </h1>
      {subheadline && (
        <p className={`mt-3 text-lg ${subColor}`}>{subheadline}</p>
      )}
    </div>
  );
}

export function HeroSection({ community, config }: Props) {
  const headline = config.hero_headline || `Welcome to ${community.name}`;
  const subheadline = config.hero_subheadline || community.address || '';
  const layout: HeroLayout = config.hero_layout || 'image_only';
  const thickness: HeroThickness = config.hero_thickness || 'medium';

  // image_only with image: full-bleed image with overlay
  if (layout === 'image_only' && config.hero_image_url) {
    return (
      <section className="relative overflow-hidden">
        <div className={`relative ${IMAGE_HEIGHT[thickness]}`}>
          <Image
            src={config.hero_image_url}
            alt={headline}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <LogoAndText
              community={community}
              headline={headline}
              subheadline={subheadline}
            />
          </div>
        </div>
      </section>
    );
  }

  // image_only without image: solid color banner
  if (layout === 'image_only') {
    return (
      <section className="relative overflow-hidden">
        <div
          className={`${TEXT_PADDING[thickness]} px-6`}
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <LogoAndText
            community={community}
            headline={headline}
            subheadline={subheadline}
          />
        </div>
      </section>
    );
  }

  // image_above: image block (no overlay/text) above, then color banner with text below
  if (layout === 'image_above') {
    return (
      <section className="relative overflow-hidden">
        {config.hero_image_url && (
          <div className={`relative ${IMAGE_HEIGHT[thickness]}`}>
            <Image
              src={config.hero_image_url}
              alt={community.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div
          className={`${TEXT_PADDING[thickness]} px-6`}
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <LogoAndText
            community={community}
            headline={headline}
            subheadline={subheadline}
          />
        </div>
      </section>
    );
  }

  // image_below: color banner with text above, then image block below
  return (
    <section className="relative overflow-hidden">
      <div
        className={`${TEXT_PADDING[thickness]} px-6`}
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        <LogoAndText
          community={community}
          headline={headline}
          subheadline={subheadline}
        />
      </div>
      {config.hero_image_url && (
        <div className={`relative ${IMAGE_HEIGHT[thickness]}`}>
          <Image
            src={config.hero_image_url}
            alt={community.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}
    </section>
  );
}
