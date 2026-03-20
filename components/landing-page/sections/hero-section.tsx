import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
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
  data,
  headline,
  subheadline,
  layout,
  thickness,
  slug,
}: {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  headline: string;
  subheadline: string;
  layout: HeroLayout;
  thickness: HeroThickness;
  slug: string;
}) {
  /* ── Shared pill CTA buttons ─────────────────────────── */
  const ctaButtons = (variant: 'light' | 'dark' = 'light') => (
    <div className="mt-8 flex flex-wrap gap-3">
      <a
        href={`/${slug}/login`}
        className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:opacity-90 hover:shadow-lg"
        style={{ backgroundColor: 'var(--landing-accent)' }}
      >
        Get Started
      </a>
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById('section-about') || document.getElementById('section-contact');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        className={`inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all duration-300 ${
          variant === 'light'
            ? 'border border-white/25 text-white hover:bg-white/10'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
        }`}
      >
        Learn More
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  /* ── Floating elements removed — kept hero clean ────── */

  /* ── image_only WITH image: full-bleed premium hero ──── */
  if (layout === 'image_only' && config.hero_image_url) {
    return (
      <section className="relative overflow-hidden">
        <div className="relative min-h-[560px] sm:min-h-[640px]">
          <Image
            src={config.hero_image_url}
            alt={headline}
            fill
            className="object-cover"
            priority
          />
          {/* Horizontal gradient for left-aligned text */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
          {/* Bottom gradient for floating elements */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Left-aligned content */}
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
              <div className="max-w-xl">
                {/* Pill badge */}
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 mb-6">
                  {community.logo_url && (
                    <img
                      src={community.logo_url}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  )}
                  {community.name}
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[0.95]">
                  {headline}
                </h1>

                {/* Accent underline */}
                <div
                  className="mt-5 h-1 w-16 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />

                {subheadline && (
                  <p className="mt-5 text-base sm:text-lg text-white/70 max-w-md leading-relaxed">
                    {subheadline}
                  </p>
                )}

                {ctaButtons('light')}
              </div>
            </div>
          </div>

        </div>
      </section>
    );
  }

  /* ── image_only WITHOUT image: primary bg with decorative elements ── */
  if (layout === 'image_only') {
    return (
      <section className="relative overflow-hidden">
        <div
          className="relative flex items-center min-h-[480px] sm:min-h-[560px] px-6"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          {/* Decorative accent shapes */}
          <div
            className="absolute top-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full opacity-[0.06]"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <div
            className="absolute bottom-[-15%] left-[-5%] h-[300px] w-[300px] rounded-full opacity-[0.04]"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />

          <div className="relative mx-auto w-full max-w-6xl px-0 sm:px-4">
            <div className="max-w-xl">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 border border-white/10 text-white/80 mb-6">
                {community.logo_url && (
                  <img src={community.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                )}
                {community.name}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[0.95]">
                {headline}
              </h1>

              <div
                className="mt-5 h-1 w-16 rounded-full"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              />

              {subheadline && (
                <p className="mt-5 text-base sm:text-lg text-white/60 max-w-md leading-relaxed">
                  {subheadline}
                </p>
              )}

              {ctaButtons('light')}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── image_above: image + accent divider + text banner ─ */
  if (layout === 'image_above') {
    return (
      <section className="relative overflow-hidden">
        {config.hero_image_url && (
          <div className={`relative ${IMAGE_HEIGHT[thickness]}`}>
            <Image src={config.hero_image_url} alt={community.name} fill className="object-cover" priority />
          </div>
        )}
        <div className="h-1 w-full" style={{ backgroundColor: 'var(--landing-accent)' }} />
        <div
          className="relative flex items-center px-6 py-16 sm:py-20"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 border border-white/10 text-white/80 mb-6">
                {community.name}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[0.95]">
                {headline}
              </h1>
              {subheadline && (
                <p className="mt-4 text-base text-white/60 max-w-md">{subheadline}</p>
              )}
              {ctaButtons('light')}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── image_below: text banner + accent divider + image ─ */
  if (layout === 'image_below') {
    return (
      <section className="relative overflow-hidden">
        <div
          className="relative flex items-center px-6 py-16 sm:py-20"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 border border-white/10 text-white/80 mb-6">
                {community.name}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[0.95]">
                {headline}
              </h1>
              {subheadline && (
                <p className="mt-4 text-base text-white/60 max-w-md">{subheadline}</p>
              )}
              {ctaButtons('light')}
            </div>
          </div>
        </div>
        <div className="h-1 w-full" style={{ backgroundColor: 'var(--landing-accent)' }} />
        {config.hero_image_url && (
          <div className={`relative ${IMAGE_HEIGHT[thickness]}`}>
            <Image src={config.hero_image_url} alt={community.name} fill className="object-cover" priority />
          </div>
        )}
      </section>
    );
  }

  /* ── split_left / split_right: premium split ─────────── */
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';

    const textPanel = (
      <div
        className="relative flex flex-col justify-center px-8 sm:px-12 py-16 w-full lg:w-[45%] overflow-hidden"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        {/* Decorative accent circle */}
        <div
          className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full opacity-[0.06]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div className="relative max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 border border-white/10 text-white/80 mb-6">
            {community.logo_url && (
              <img src={community.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            )}
            {community.name}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[0.95]">
            {headline}
          </h1>
          <div className="mt-4 h-1 w-14 rounded-full" style={{ backgroundColor: 'var(--landing-accent)' }} />
          {subheadline && (
            <p className="mt-4 text-base text-white/60 max-w-md">{subheadline}</p>
          )}
          {ctaButtons('light')}
        </div>
      </div>
    );

    const imagePanel = config.hero_image_url ? (
      <div className={`relative w-full lg:w-[55%] ${IMAGE_HEIGHT[thickness]} min-h-[320px]`}>
        <Image src={config.hero_image_url} alt={headline} fill className="object-cover" priority />
      </div>
    ) : (
      <div
        className={`w-full lg:w-[55%] ${IMAGE_HEIGHT[thickness]} min-h-[320px]`}
        style={{ backgroundColor: 'var(--landing-primary)', opacity: 0.85 }}
      />
    );

    return (
      <section className="relative overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {isRight ? <>{textPanel}{imagePanel}</> : <>{imagePanel}{textPanel}</>}
        </div>
      </section>
    );
  }

  /* ── text_only: solid primary with floating decorative elements ── */
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative flex items-center min-h-[420px] sm:min-h-[480px] px-6"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        {/* Decorative floating shapes */}
        <div
          className="absolute top-12 right-[15%] h-20 w-20 rounded-2xl rotate-12 opacity-[0.06]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute bottom-16 left-[10%] h-32 w-32 rounded-full opacity-[0.04]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute top-[40%] right-[8%] h-16 w-16 rounded-full border-2 opacity-[0.08]"
          style={{ borderColor: 'var(--landing-accent)' }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-white/10 border border-white/10 text-white/80 mb-6">
              {community.logo_url && (
                <img src={community.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              )}
              {community.name}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[0.95]">
              {headline}
            </h1>
            <div className="mt-5 h-1 w-16 rounded-full" style={{ backgroundColor: 'var(--landing-accent)' }} />
            {subheadline && (
              <p className="mt-5 text-base sm:text-lg text-white/60 max-w-md leading-relaxed">{subheadline}</p>
            )}
            {ctaButtons('light')}
          </div>
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

/* ── Luxury layout ──────────────────────────────────────── */
function LuxuryHero({
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

  /* text_only or no image: dark rich background, centered elegant text */
  if (layout === 'text_only' || !config.hero_image_url) {
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
              className="mb-10 h-14 w-14 rounded-xl object-cover opacity-80"
            />
          )}
          {/* Gold decorative line above */}
          <div className="mb-6 h-px w-24" style={{ backgroundColor: 'var(--landing-accent)' }} />

          {subheadline && (
            <p className="mb-8 text-xs sm:text-sm text-white/50 max-w-xl tracking-[0.3em] uppercase font-light">
              {subheadline}
            </p>
          )}

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-light italic tracking-tight text-white max-w-5xl leading-[0.9]">
            {headline}
          </h1>

          {/* Gold decorative line below */}
          <div className="mt-10 h-px w-24" style={{ backgroundColor: 'var(--landing-accent)' }} />
        </div>
      </section>
    );
  }

  /* image_only / image_above / image_below with image: full-bleed, dark gradient from bottom */
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
          {/* Dark gradient overlay from bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          <div
            className="absolute inset-0 flex flex-col items-center justify-end px-6 text-center"
            style={{ paddingBottom: `${py * 0.75}px` }}
          >
            {/* Thin gold accent line */}
            <div className="mb-6 h-px w-16" style={{ backgroundColor: 'var(--landing-accent)' }} />

            <p className="mb-4 text-[10px] sm:text-xs text-white/40 tracking-[0.3em] uppercase font-light">
              {community.name}
            </p>

            <h1 className="text-5xl sm:text-7xl font-light italic tracking-tight text-white max-w-4xl leading-[0.9]">
              {headline}
            </h1>

            {subheadline && (
              <p className="mt-6 text-xs sm:text-sm text-white/40 max-w-lg tracking-[0.2em] uppercase font-light">
                {subheadline}
              </p>
            )}

            {/* Thin gold accent line */}
            <div className="mt-8 h-px w-16" style={{ backgroundColor: 'var(--landing-accent)' }} />
          </div>
        </div>
      </section>
    );
  }

  /* Split layouts: one side dark with elegant text, other side image */
  if (layout === 'split_left' || layout === 'split_right') {
    const isRight = layout === 'split_right';
    const minH = overrides?.height ?? 560;

    const textPanel = (
      <div
        className="flex flex-col items-center justify-center px-10 sm:px-16 w-full lg:w-1/2"
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
            className="mb-8 h-12 w-12 rounded-xl object-cover opacity-70"
          />
        )}

        {/* Gold accent line above */}
        <div className="mb-6 h-px w-16" style={{ backgroundColor: 'var(--landing-accent)' }} />

        {subheadline && (
          <p className="mb-6 text-[10px] sm:text-xs text-white/40 tracking-[0.3em] uppercase font-light text-center">
            {subheadline}
          </p>
        )}

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light italic tracking-tight text-white leading-[0.9] text-center">
          {headline}
        </h1>

        {/* Gold accent line below */}
        <div className="mt-8 h-px w-16" style={{ backgroundColor: 'var(--landing-accent)' }} />
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

  /* Fallback: dark background, centered elegant text */
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
            className="mb-10 h-14 w-14 rounded-xl object-cover opacity-80"
          />
        )}
        {/* Gold decorative line above */}
        <div className="mb-6 h-px w-24" style={{ backgroundColor: 'var(--landing-accent)' }} />

        {subheadline && (
          <p className="mb-8 text-xs sm:text-sm text-white/50 max-w-xl tracking-[0.3em] uppercase font-light">
            {subheadline}
          </p>
        )}

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-light italic tracking-tight text-white max-w-5xl leading-[0.9]">
          {headline}
        </h1>

        {/* Gold decorative line below */}
        <div className="mt-10 h-px w-24" style={{ backgroundColor: 'var(--landing-accent)' }} />
      </div>
    </section>
  );
}

/* ── Main export ───────────────────────────────────────── */
export function HeroSection({ community, config, data, slug }: Props) {
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

  if (template === 'luxury') {
    return (
      <LuxuryHero
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
      data={data}
      headline={headline}
      subheadline={subheadline}
      layout={layout}
      thickness={thickness}
      slug={slug}
    />
  );
}
