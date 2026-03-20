import { ExternalLink, ArrowRight } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function QuickLinksSection({ config }: Props) {
  if (config.quick_links.length === 0) return null;

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.quick_links;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    const cols = overrides?.columns;
    const gridClass = cols
      ? 'grid gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Quick Links
          </h2>
          <div className={gridClass} style={gridStyle}>
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

  /* ── Modern (pill buttons) ───────────────────────────────── */
  if (template === 'modern') {
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {config.quick_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                <ExternalLink className="h-4 w-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (text links with arrows) ──────────────────── */
  const cols = overrides?.columns ?? 2;
  const gridClass = cols === 1
    ? 'grid grid-cols-1 gap-2'
    : `grid grid-cols-1 sm:grid-cols-${Math.min(cols, 3)} gap-2`;
  const gridStyle = cols > 3
    ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
    : undefined;

  return (
    <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          Quick Links
        </h2>
        <div className={gridClass} style={gridStyle}>
          {config.quick_links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--landing-accent)' }}
            >
              <ArrowRight className="h-4 w-4 shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
