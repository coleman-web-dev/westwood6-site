import Link from 'next/link';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';

interface Props {
  slug: string;
  isMember: boolean;
  communityName: string;
  config?: LandingPageConfig;
}

export function LoginCtaSection({ slug, isMember, communityName, config }: Props) {
  const template: LayoutTemplate = config?.layout_template || 'classic';

  const heading = isMember ? 'Welcome back!' : `Join ${communityName}`;
  const subtext = isMember
    ? 'Access your dashboard to manage payments, view documents, and stay connected with your community.'
    : 'Sign in to your account or request access to get started with your community portal.';

  /* ── Modern CTA: bold accent band with geometric decoration ─── */
  if (template === 'modern') {
    return (
      <section className="relative overflow-hidden">
        <div
          className="py-24 px-6"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          {/* Decorative accent circles */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <div
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.07]"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />

          <div className="relative mx-auto max-w-xl text-center">
            {/* Accent bar */}
            <div
              className="mx-auto w-12 h-1 rounded-full mb-8"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            <h2 className="text-3xl font-bold text-white mb-4">
              {heading}
            </h2>
            <p className="text-white/50 mb-10 text-sm leading-relaxed max-w-md mx-auto">
              {subtext}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isMember ? (
                <Link
                  href={`/${slug}/dashboard`}
                  className="inline-flex items-center justify-center rounded-full px-10 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-xl"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href={`/login?redirect=/${slug}/dashboard`}
                    className="inline-flex items-center justify-center rounded-full px-10 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-xl"
                    style={{ backgroundColor: 'var(--landing-accent)' }}
                  >
                    Member Login
                  </Link>
                  <Link
                    href={`/signup?community=${slug}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-10 py-3.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all"
                  >
                    Request Access
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Luxury CTA: dark bg, gold accents, elegant typography ───── */
  if (template === 'luxury') {
    return (
      <section
        className="relative overflow-hidden py-28 px-6"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        {/* Subtle decorative accent corners */}
        <div
          className="absolute top-0 left-0 w-24 h-px"
          style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.4 }}
        />
        <div
          className="absolute top-0 left-0 w-px h-24"
          style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.4 }}
        />
        <div
          className="absolute bottom-0 right-0 w-24 h-px"
          style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.4 }}
        />
        <div
          className="absolute bottom-0 right-0 w-px h-24"
          style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.4 }}
        />

        <div className="relative mx-auto max-w-lg text-center">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-6 block">
            Member Portal
          </span>
          <h2 className="text-3xl sm:text-4xl font-light italic text-white mb-5">
            {heading}
          </h2>
          {/* Accent line separator */}
          <div
            className="mx-auto w-16 h-px mb-8"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <p className="text-sm text-white/50 mb-12 leading-relaxed max-w-sm mx-auto">
            {subtext}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isMember ? (
              <Link
                href={`/${slug}/dashboard`}
                className="inline-flex items-center justify-center rounded px-10 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?redirect=/${slug}/dashboard`}
                  className="inline-flex items-center justify-center rounded px-10 py-3.5 text-xs font-medium uppercase tracking-[0.15em] text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  Member Login
                </Link>
                <Link
                  href={`/signup?community=${slug}`}
                  className="inline-flex items-center justify-center rounded border px-10 py-3.5 text-xs font-medium uppercase tracking-[0.15em] transition-all hover:bg-white/5"
                  style={{
                    borderColor: 'var(--landing-accent)',
                    color: 'var(--landing-accent)',
                  }}
                >
                  Request Access
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  /* ── Classic CTA: primary bg with floating elements + pill buttons ── */
  return (
    <section className="relative overflow-hidden">
      <div
        className="py-24 sm:py-28 px-6"
        style={{ backgroundColor: 'var(--landing-primary)' }}
      >
        {/* Decorative floating elements */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.06]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-[0.04]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />
        <div
          className="absolute top-1/2 right-[15%] w-20 h-20 rounded-2xl rotate-12 opacity-[0.05]"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />

        <div className="relative mx-auto max-w-2xl text-center">
          {/* Accent dot */}
          <div
            className="mx-auto w-2 h-2 rounded-full mb-8"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-5">
            {heading}
          </h2>
          <p className="text-white/50 mb-10 text-sm leading-relaxed max-w-md mx-auto">
            {subtext}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isMember ? (
              <Link
                href={`/${slug}/dashboard`}
                className="inline-flex items-center justify-center rounded-full px-10 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?redirect=/${slug}/dashboard`}
                  className="inline-flex items-center justify-center rounded-full px-10 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                >
                  Member Login
                </Link>
                <Link
                  href={`/signup?community=${slug}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-10 py-3.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all"
                >
                  Request Access
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
