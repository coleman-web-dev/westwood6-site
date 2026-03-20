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
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {config.faq_items.map((item, i) => (
              <details
                key={i}
                className="bg-white rounded-xl border border-gray-200 group"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-medium text-gray-900 select-none [&::-webkit-details-marker]:hidden list-none">
                  <span>{item.question}</span>
                  <svg
                    className="h-4 w-4 text-gray-400 shrink-0 ml-4 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (accent left border, collapsible) ────────────── */
  if (template === 'modern') {
    return (
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {config.faq_items.map((item, i) => (
              <details
                key={i}
                className="bg-white rounded-xl border border-gray-200 group border-l-4"
                style={{ borderLeftColor: 'var(--landing-accent)' }}
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 text-sm font-medium text-gray-900 select-none [&::-webkit-details-marker]:hidden list-none">
                  <span>{item.question}</span>
                  <svg
                    className="h-4 w-4 text-gray-400 shrink-0 ml-4 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (numbered, all visible, dividers) ─────────── */
  return (
    <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-10 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-gray-200">
          {config.faq_items.map((item, i) => (
            <div key={i} className="py-8 first:pt-0 last:pb-0">
              <div className="flex gap-5">
                <span
                  className="text-3xl font-bold shrink-0 leading-none"
                  style={{ color: 'var(--landing-accent)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
