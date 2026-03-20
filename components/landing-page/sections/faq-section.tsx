import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function FaqSection({ config }: Props) {
  if (config.faq_items.length === 0) return null;

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.faq;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section
        className="py-24 sm:py-28 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-6xl">
          {/* Two-column section header */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-16 mb-14">
            <div className="lg:w-2/5">
              <div className="inline-flex items-center gap-2 mb-4">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  FAQ
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Find answers to commonly asked questions
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                Frequently Asked Questions
              </h2>
            </div>
          </div>

          {/* 2-column card grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {config.faq_items.map((item, i) => (
              <div key={i} className="rounded-2xl bg-stone-50 p-6 relative">
                {/* Numbered badge */}
                <span
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm"
                  style={{ color: 'var(--landing-accent)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3
                  className="text-sm font-bold mb-3 pr-10"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {item.question}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (accent left border, hover lift) ─────────────── */
  if (template === 'modern') {
    return (
      <section
        className="py-20 px-6"
        style={{
          background:
            'linear-gradient(to bottom, #fafaf9 0%, #ffffff 100%)',
          ...(py ? { paddingTop: py, paddingBottom: py } : {}),
        }}
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-bold mb-10 text-center tracking-tight"
            style={{ color: 'var(--landing-primary)' }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {config.faq_items.map((item, i) => (
              <details
                key={i}
                className="bg-white rounded-xl border border-gray-100 shadow-sm group transition-shadow duration-300 hover:shadow-lg border-l-4"
                style={{ borderLeftColor: 'var(--landing-accent)' }}
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 select-none [&::-webkit-details-marker]:hidden list-none">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--landing-primary)' }}
                  >
                    {item.question}
                  </span>
                  <svg
                    className="h-4 w-4 shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180"
                    style={{ color: 'var(--landing-accent)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (numbered, all visible, hairline dividers) ── */
  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl font-light mb-16 text-center tracking-wide"
          style={{ color: 'var(--landing-primary)' }}
        >
          Frequently Asked Questions
        </h2>
        <div>
          {config.faq_items.map((item, i) => (
            <div key={i}>
              {i > 0 && <hr className="border-t border-gray-200" />}
              <div className="py-10 first:pt-0 last:pb-0">
                <div className="flex gap-6">
                  <span
                    className="text-4xl font-light shrink-0 leading-none tabular-nums"
                    style={{ color: 'var(--landing-accent)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      {item.question}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
