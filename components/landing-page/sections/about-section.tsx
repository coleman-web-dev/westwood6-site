import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate, SectionStyleOverride } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

const MAX_WIDTH_MAP: Record<NonNullable<SectionStyleOverride['maxWidth']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

export function AboutSection({ config }: Props) {
  if (!config.about_body) return null;

  const title = config.about_title || 'About Our Community';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.about;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section
        className="py-16 px-6 bg-stone-50/60"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-3xl text-center">
          {/* Decorative accent bar */}
          <div
            className="mx-auto mb-5 h-1 w-12 rounded-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
            {config.about_body}
          </p>
        </div>
      </section>
    );
  }

  /* ── Modern ──────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row overflow-hidden rounded-2xl shadow-sm">
          {/* Left panel: primary bg with title and decorative elements */}
          <div
            className="relative md:w-[40%] shrink-0 px-8 py-12 sm:px-10 sm:py-14 flex flex-col justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--landing-primary)' }}
          >
            {/* Decorative accent vertical bar */}
            <div
              className="absolute top-0 left-0 w-1.5 h-full"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            {/* Decorative accent square */}
            <div
              className="absolute -bottom-8 -right-8 h-28 w-28 rounded-lg rotate-12 opacity-[0.1]"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
            <h2 className="relative text-2xl sm:text-3xl font-bold text-white leading-tight">
              {title}
            </h2>
            {/* Small accent underline */}
            <div
              className="mt-4 h-1 w-10 rounded-full"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          {/* Right panel: body text on white */}
          <div className="md:w-[60%] bg-white px-8 py-12 sm:px-12 sm:py-14 flex items-center">
            <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
              {config.about_body}
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ───────────────────────────────────────── */
  const maxW = overrides?.maxWidth ? MAX_WIDTH_MAP[overrides.maxWidth] : 'max-w-2xl';

  return (
    <section
      className="py-24 sm:py-32 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className={`mx-auto ${maxW}`}>
        {/* Thin hairline divider above */}
        <div className="mb-10 h-px w-full bg-gray-200" />

        <h2
          className="text-3xl sm:text-4xl font-bold mb-10 text-center tracking-tight"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {/* Thin hairline divider below title */}
        <div className="mb-10 h-px w-full bg-gray-200" />

        {/* Body text with drop cap */}
        <div className="text-gray-600 leading-[1.85] whitespace-pre-line text-base">
          {/* Drop cap first letter */}
          <span
            className="float-left text-6xl font-bold leading-none mr-3 mt-1"
            style={{ color: 'var(--landing-primary)' }}
          >
            {config.about_body.charAt(0)}
          </span>
          {config.about_body.slice(1)}
        </div>
      </div>
    </section>
  );
}
