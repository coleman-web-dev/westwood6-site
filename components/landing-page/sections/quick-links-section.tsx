import { ExternalLink } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function QuickLinksSection({ config }: Props) {
  if (config.quick_links.length === 0) return null;

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.quick_links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors group"
            >
              <div
                className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 15%, transparent)' }}
              >
                <ExternalLink
                  className="h-5 w-5"
                  style={{ color: 'var(--landing-accent)' }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                {link.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
