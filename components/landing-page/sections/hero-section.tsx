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

/* ── Shared Logo + Text block ───────────────────────────── */
function LogoAndText({
  community,
  headline,
  subheadline,
  textColor = 'text-white',
  subColor = 'text-white/80',
  headlineClass = 'text-4xl sm:text-5xl',
  align = 'center',
}: {
  community: Community;
  headline: string;
  subheadline: string;
  textColor?: string;
  subColor?: string;
  headlineClass?: string;
  align?: 'center' | 'left';
}) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  const logoAlign = align === 'center' ? 'mx-auto' : '';

  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>
      {community.logo_url && (
        <img
          src={community.logo_url}
          alt={`${community.name} logo`}
          className={`mb-6 h-16 w-16 rounded-xl object-cover ${logoAlign}`}
        />
      )}
      <h1 className={`${headlineClass} font-bold tracking-tight ${textColor} ${alignClass}`}>
        {headline}
      </h1>
      {subheadline && (
        <p className={`mt-3 text-lg ${subColor} ${alignClass}`}>{subheadline}</p>
      )}
    </div>
  );
}

/* ── Classic layout ─────────────────────────────────────── */
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
  /* image_only WITH image: full-bleed, darker gradient, accent underline */
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
          {/* Darker, richer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/35 to-black/20" />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center max-w-2xl mx-auto">
              {community.logo_url && (
                <img
                  src={community.logo_url}
                  alt={`${community.name} logo`}
                  className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover shadow-lg"
                />
              )}
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                {headline}
              </h1>
              {/* Decorative accent underline */}
              <div
                className="mx-auto mt-4 h-0.5 w-16 rounded-full"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              />
              {subheadline && (
                <p className="mt-4 text-lg text-white/80">{subheadline}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* image_only WITHOUT image: primary bg with radial gradient pattern */
  if (layout === 'image_only') {
    return (
      <section className="relative overflow-hidden">
        <div
          className={`relative flex items-center justify-center px-6 ${TEXT_BLOCK_HEIGHT[thickness]}`}
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          {/* Subtle radial gradient pattern for visual interest */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, var(--landing-accent) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--landing-accent) 0%, transparent 40%), radial-gradient(circle at 60% 80%, var(--landing-accent) 0%, transparent 45%)',
            }}
          />
          <div className="relative">
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

  /* image_above: image block, decorative divider, then color banner with text */
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
        {/* Decorative divider between image and text */}
        <div className="relative">
          <div
            className="h-1 w-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
        </div>
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

  /* image_below: color banner with text, decorative divider, then image block */
  if (layout === 'image_below') {
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
        {/* Decorative divider between text and image */}
        <div className="relative">
          <div
            className="h-1 w-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
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

  /* split_left / split_right: basic split for classic */
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';

    const textPanel = (
      <div
        className="flex flex-col items-center justify-center px-8 sm:px-12 py-12 w-full lg:w-[45%]"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        <LogoAndText
          community={community}
          headline={headline}
          subheadline={subheadline}
        />
      </div>
    );

    const imagePanel = config.hero_image_url ? (
      <div className={`relative w-full lg:w-[55%] ${IMAGE_HEIGHT[thickness]}`}>
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
        className={`w-full lg:w-[55%] ${IMAGE_HEIGHT[thickness]}`}
        style={{ backgroundColor: 'var(--landing-primary)', opacity: 0.85 }}
      />
    );

    return (
      <section className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row">
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

  /* text_only: solid primary with subtle accent pattern */
  return (
    <section className="relative overflow-hidden">
      <div
        className={`relative flex items-center justify-center px-6 ${TEXT_BLOCK_HEIGHT[thickness]}`}
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, var(--landing-accent) 0%, transparent 50%)',
          }}
        />
        <div className="relative">
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

/* ── Modern layout ──────────────────────────────────────── */
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

  /* Split layouts (split_left / split_right) */
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';

    const textPanel = (
      <div
        className="relative flex flex-col items-center justify-center px-8 sm:px-14 py-14 w-full lg:w-[45%] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--landing-primary) 0%, color-mix(in srgb, var(--landing-primary) 85%, white) 100%)',
          minHeight: `${minHeight / 2}px`,
        }}
      >
        {/* Decorative accent circle, clipped */}
        <div
          className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full opacity-[0.12]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute -top-16 -left-16 h-40 w-40 rounded-full opacity-[0.08]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />

        <div className="relative max-w-md mx-auto text-center lg:text-left z-10">
          {community.logo_url && (
            <img
              src={community.logo_url}
              alt={`${community.name} logo`}
              className="mb-6 h-14 w-14 rounded-xl object-cover mx-auto lg:mx-0 shadow-lg shadow-black/20"
            />
          )}
          {/* Bold geometric accent bar */}
          <div
            className="hidden lg:block mb-6 h-1.5 w-12 rounded-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {headline}
          </h1>
          {subheadline && (
            <p className="mt-4 text-lg text-white/75">{subheadline}</p>
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
        {/* Gradient overlay at the edge meeting text panel */}
        <div
          className={`absolute inset-0 ${isRight ? 'bg-gradient-to-l' : 'bg-gradient-to-r'}`}
          style={{
            backgroundImage: isRight
              ? 'linear-gradient(to left, transparent 70%, var(--landing-primary))'
              : 'linear-gradient(to right, transparent 70%, var(--landing-primary))',
            opacity: 0.3,
          }}
        />
      </div>
    ) : (
      <div
        className="relative w-full lg:w-[55%] overflow-hidden"
        style={{ minHeight: `${minHeight}px`, backgroundColor: 'color-mix(in srgb, var(--landing-primary) 95%, white)' }}
      >
        {/* Decorative accent elements when no image */}
        <div
          className="absolute top-1/4 left-1/4 h-48 w-48 rounded-full opacity-[0.08]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute bottom-1/3 right-1/6 h-32 w-32 rounded-full opacity-[0.06]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
      </div>
    );

    return (
      <section className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row" style={{ minHeight: `${minHeight}px` }}>
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

  /* Non-split layouts: full-bleed with dramatic angled primary-color gradient */
  if (config.hero_image_url) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative" style={{ minHeight: `${minHeight}px` }}>
          <Image
            src={config.hero_image_url}
            alt={headline}
            fill
            className="object-cover"
            priority
          />
          {/* Dramatic angled gradient using primary color */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg, var(--landing-primary) 0%, color-mix(in srgb, var(--landing-primary) 70%, transparent) 40%, rgba(0,0,0,0.3) 100%)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="text-center max-w-3xl mx-auto">
              {community.logo_url && (
                <img
                  src={community.logo_url}
                  alt={`${community.name} logo`}
                  className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover shadow-xl shadow-black/30"
                />
              )}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                {headline}
              </h1>
              {/* Thin accent underline decoration */}
              <div
                className="mx-auto mt-5 h-0.5 w-20 rounded-full"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              />
              {subheadline && (
                <p className="mt-5 text-lg sm:text-xl text-white/80">{subheadline}</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* No image: bold primary block with accent geometric elements */
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative flex items-center justify-center px-6"
        style={{
          minHeight: `${minHeight}px`,
          background: 'linear-gradient(135deg, var(--landing-primary) 0%, color-mix(in srgb, var(--landing-primary) 80%, black) 100%)',
        }}
      >
        {/* Large decorative accent shapes */}
        <div
          className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-[0.08]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-[0.06]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div className="relative text-center max-w-3xl mx-auto z-10">
          {community.logo_url && (
            <img
              src={community.logo_url}
              alt={`${community.name} logo`}
              className="mx-auto mb-6 h-16 w-16 rounded-xl object-cover shadow-xl shadow-black/30"
            />
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            {headline}
          </h1>
          <div
            className="mx-auto mt-5 h-0.5 w-20 rounded-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          {subheadline && (
            <p className="mt-5 text-lg sm:text-xl text-white/75">{subheadline}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Editorial layout ───────────────────────────────────── */
function EditorialHero({
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
  const py = overrides?.paddingY ?? 128;

  /* text_only: oversized typography, magazine feel */
  if (layout === 'text_only') {
    return (
      <section className="relative overflow-hidden">
        {/* Blurred ambient background image if available */}
        {config.hero_image_url && (
          <>
            <Image
              src={config.hero_image_url}
              alt=""
              fill
              className="object-cover blur-xl scale-110"
              priority
            />
            <div className="absolute inset-0 bg-black/70" />
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
              className="mb-10 h-14 w-14 rounded-xl object-cover opacity-90"
            />
          )}
          {/* Thin decorative line above headline */}
          <div className="mb-8 h-px w-16 bg-white/20" />
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight text-white max-w-5xl leading-[0.9]">
            {headline}
          </h1>
          {subheadline && (
            <p className="mt-8 text-sm sm:text-base text-white/50 max-w-xl tracking-[0.2em] uppercase font-light">
              {subheadline}
            </p>
          )}
          {/* Thin decorative line below */}
          <div className="mt-10 h-px w-16 bg-white/20" />
        </div>
      </section>
    );
  }

  /* image_only with image: editorial full-bleed, minimal text, refined overlay */
  if ((layout === 'image_only' || layout === 'image_above' || layout === 'image_below') && config.hero_image_url) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative" style={{ minHeight: `${py * 2 + 200}px` }}>
          <Image
            src={config.hero_image_url}
            alt={headline}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          <div
            className="absolute inset-0 flex flex-col items-center justify-end px-6 text-center"
            style={{ paddingBottom: `${py * 0.75}px` }}
          >
            {/* Thin line above text cluster */}
            <div className="mb-6 h-px w-12 bg-white/30" />
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[0.9]">
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-6 text-sm text-white/50 max-w-lg tracking-[0.15em] uppercase font-light">
                {subheadline}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* Split layouts: editorial interpretation with massive type */
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';
    const minH = overrides?.height ?? 560;

    const textPanel = (
      <div
        className="flex flex-col items-center lg:items-start justify-center px-10 sm:px-16 w-full lg:w-1/2"
        style={{
          backgroundColor: 'var(--landing-primary)',
          paddingTop: `${py * 0.6}px`,
          paddingBottom: `${py * 0.6}px`,
        }}
      >
        {community.logo_url && (
          <img
            src={community.logo_url}
            alt={`${community.name} logo`}
            className="mb-8 h-12 w-12 rounded-xl object-cover opacity-80"
          />
        )}
        <div className="mb-6 h-px w-10 bg-white/20" />
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[0.9] text-center lg:text-left">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-6 text-sm text-white/45 tracking-[0.15em] uppercase font-light text-center lg:text-left">
            {subheadline}
          </p>
        )}
      </div>
    );

    const imagePanel = config.hero_image_url ? (
      <div className="relative w-full lg:w-1/2" style={{ minHeight: `${minH}px` }}>
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
        className="w-full lg:w-1/2"
        style={{ minHeight: `${minH}px`, backgroundColor: 'color-mix(in srgb, var(--landing-primary) 90%, white)' }}
      />
    );

    return (
      <section className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row" style={{ minHeight: `${minH}px` }}>
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

  /* Fallback: no image, any layout */
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      />
      <div
        className="relative flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: `${py}px`, paddingBottom: `${py}px` }}
      >
        {community.logo_url && (
          <img
            src={community.logo_url}
            alt={`${community.name} logo`}
            className="mb-10 h-14 w-14 rounded-xl object-cover opacity-90"
          />
        )}
        <div className="mb-8 h-px w-16 bg-white/20" />
        <h1 className="text-6xl sm:text-8xl font-bold tracking-tight text-white max-w-5xl leading-[0.9]">
          {headline}
        </h1>
        {subheadline && (
          <p className="mt-8 text-sm sm:text-base text-white/50 max-w-xl tracking-[0.2em] uppercase font-light">
            {subheadline}
          </p>
        )}
        <div className="mt-10 h-px w-16 bg-white/20" />
      </div>
    </section>
  );
}

/* ── Main export ───────────────────────────────────────── */
export function HeroSection({ community, config }: Props) {
  const headline = config.hero_headline || `Welcome to ${community.name}`;
  const subheadline = config.hero_subheadline || community.address || '';
  const layout: HeroLayout = config.hero_layout || 'image_only';
  const thickness: HeroThickness = config.hero_thickness || 'medium';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.hero;

  if (template === 'modern') {
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

  if (template === 'editorial') {
    return (
      <EditorialHero
        community={community}
        config={config}
        headline={headline}
        subheadline={subheadline}
        layout={layout}
        overrides={overrides}
      />
    );
  }

  // Classic layout (default)
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
