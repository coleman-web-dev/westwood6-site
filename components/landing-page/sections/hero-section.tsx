import Image from 'next/image';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, HeroLayout, HeroThickness, LayoutTemplate, SectionStyleOverride } from '@/lib/types/landing';
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

const TEXT_BLOCK_HEIGHT: Record<HeroThickness, string> = {
  compact: 'min-h-[200px]',
  medium: 'min-h-[300px]',
  tall: 'min-h-[420px]',
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

/* ── Classic layout (original) ─────────────────────────────── */
function ClassicHero({
  community,
  config,
  headline,
  subheadline,
  layout,
  thickness,
}: {
  community: Community;
  config: LandingPageConfig;
  headline: string;
  subheadline: string;
  layout: HeroLayout;
  thickness: HeroThickness;
}) {
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
          className={`flex items-center justify-center px-6 ${TEXT_BLOCK_HEIGHT[thickness]}`}
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
          className={`flex items-center justify-center px-6 ${TEXT_BLOCK_HEIGHT[thickness]}`}
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
        className={`flex items-center justify-center px-6 ${TEXT_BLOCK_HEIGHT[thickness]}`}
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

/* ── Modern layout (split_left / split_right) ──────────────── */
function ModernHero({
  community,
  config,
  headline,
  subheadline,
  layout,
  overrides,
}: {
  community: Community;
  config: LandingPageConfig;
  headline: string;
  subheadline: string;
  layout: HeroLayout;
  overrides?: SectionStyleOverride;
}) {
  const minHeight = overrides?.height ?? 560;
  const isRight = layout === 'split_right';

  const textPanel = (
    <div
      className="flex flex-col items-center justify-center px-8 sm:px-12 py-12 w-full lg:w-[45%]"
      style={{ backgroundColor: 'var(--landing-primary)', minHeight: `${minHeight / 2}px` }}
    >
      <div className="max-w-md mx-auto text-center lg:text-left">
        {community.logo_url && (
          <img
            src={community.logo_url}
            alt={`${community.name} logo`}
            className="mb-6 h-14 w-14 rounded-xl object-cover mx-auto lg:mx-0"
          />
        )}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-3 text-lg text-white/80">{subheadline}</p>
        )}
      </div>
    </div>
  );

  const imagePanel = config.hero_image_url ? (
    <div className="relative w-full lg:w-[55%]" style={{ minHeight: `${minHeight}px` }}>
      <Image
        src={config.hero_image_url}
        alt={headline}
        fill
        className="object-cover"
        priority
      />
    </div>
  ) : (
    <div
      className="w-full lg:w-[55%]"
      style={{ minHeight: `${minHeight}px`, backgroundColor: 'var(--landing-accent)', opacity: 0.1 }}
    />
  );

  return (
    <section className="relative overflow-hidden">
      <div className={`flex flex-col lg:flex-row ${isRight ? 'lg:flex-row' : 'lg:flex-row'}`} style={{ minHeight: `${minHeight}px` }}>
        {isRight ? (
          <>
            {textPanel}
            {imagePanel}
          </>
        ) : (
          <>
            {imagePanel}
            {textPanel}
          </>
        )}
      </div>
    </section>
  );
}

/* ── Editorial layout (text_only) ──────────────────────────── */
function EditorialHero({
  community,
  config,
  headline,
  subheadline,
  overrides,
}: {
  community: Community;
  config: LandingPageConfig;
  headline: string;
  subheadline: string;
  overrides?: SectionStyleOverride;
}) {
  const py = overrides?.paddingY ?? 128; // py-32

  return (
    <section className="relative overflow-hidden">
      {/* Blurred background image if available */}
      {config.hero_image_url && (
        <>
          <Image
            src={config.hero_image_url}
            alt=""
            fill
            className="object-cover blur-md scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}
      {!config.hero_image_url && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        />
      )}
      <div
        className="relative flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: `${py}px`, paddingBottom: `${py}px` }}
      >
        {community.logo_url && (
          <img
            src={community.logo_url}
            alt={`${community.name} logo`}
            className="mb-8 h-16 w-16 rounded-xl object-cover"
          />
        )}
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white max-w-4xl">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-6 text-xl text-white/70 max-w-2xl">{subheadline}</p>
        )}
      </div>
    </section>
  );
}

/* ── Main export ───────────────────────────────────────────── */
export function HeroSection({ community, config }: Props) {
  const headline = config.hero_headline || `Welcome to ${community.name}`;
  const subheadline = config.hero_subheadline || community.address || '';
  const layout: HeroLayout = config.hero_layout || 'image_only';
  const thickness: HeroThickness = config.hero_thickness || 'medium';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.hero;

  if (template === 'modern' && (layout === 'split_left' || layout === 'split_right')) {
    return (
      <ModernHero
        community={community}
        config={config}
        headline={headline}
        subheadline={subheadline}
        layout={layout}
        overrides={overrides}
      />
    );
  }

  if (template === 'editorial' && layout === 'text_only') {
    return (
      <EditorialHero
        community={community}
        config={config}
        headline={headline}
        subheadline={subheadline}
        overrides={overrides}
      />
    );
  }

  // Classic layout (default) or fallback for non-matching template+layout combos
  return (
    <ClassicHero
      community={community}
      config={config}
      headline={headline}
      subheadline={subheadline}
      layout={layout}
      thickness={thickness}
    />
  );
}
