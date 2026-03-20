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

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-semibold mb-6"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {config.about_body}
          </p>
        </div>
      </section>
    );
  }

  /* ── Modern ──────────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section className="py-20 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row gap-10">
          {/* Left: title + accent border */}
          <div className="md:w-1/3 shrink-0">
            <div
              className="border-l-4 pl-5"
              style={{ borderColor: 'var(--landing-accent)' }}
            >
              <h2
                className="text-2xl font-semibold"
                style={{ color: 'var(--landing-primary)' }}
              >
                {title}
              </h2>
            </div>
          </div>
          {/* Right: body text */}
          <div className="md:w-2/3">
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {config.about_body}
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ───────────────────────────────────────────── */
  const maxW = overrides?.maxWidth ? MAX_WIDTH_MAP[overrides.maxWidth] : 'max-w-2xl';

  return (
    <section className="py-20 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className={`mx-auto ${maxW}`}>
        <h2
          className="text-2xl font-semibold mb-6 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-line first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none" style={{ color: 'var(--landing-primary)' }}>
          {config.about_body}
        </p>
      </div>
    </section>
  );
}
