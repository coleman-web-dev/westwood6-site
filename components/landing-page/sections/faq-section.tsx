import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function FaqSection({ config }: Props) {
  if (config.faq_items.length === 0) return null;

  return (
    <section className="py-16 px-6 bg-gray-50">
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
