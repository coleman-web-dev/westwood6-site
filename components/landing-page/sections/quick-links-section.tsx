import { ExternalLink, ArrowRight, ArrowUpRight } from 'lucide-react';
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
                  Quick Links
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Helpful resources and shortcuts
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                Quick Links
              </h2>
            </div>
          </div>

          {/* Pill-shaped link buttons */}
          <div className="flex flex-wrap gap-3">
            {config.quick_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium border border-gray-200 bg-white hover:bg-stone-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 group"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <span className="text-gray-700">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (cards with accent top border, hover lift) ──── */
  if (template === 'modern') {
    const cols = overrides?.columns;
    const gridClass = cols
      ? 'grid gap-4'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4';
    const gridStyle = cols
      ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
      : undefined;

    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-2xl font-bold mb-10 text-center tracking-tight"
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
                className="relative bg-white rounded-xl border border-gray-100 p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group overflow-hidden"
              >
                {/* Accent top border */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <div className="flex items-center gap-3">
                  <ExternalLink
                    className="h-5 w-5 shrink-0"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {link.label}
                  </span>
                </div>
                <ArrowUpRight
                  className="h-4 w-4 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: 'var(--landing-accent)' }}
                />
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial (simple text links, minimal) ──────────────── */
  const cols = overrides?.columns ?? 2;
  const gridStyle =
    cols === 1
      ? { gridTemplateColumns: '1fr' }
      : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl font-light mb-6 text-center tracking-wide"
          style={{ color: 'var(--landing-primary)' }}
        >
          Quick Links
        </h2>
        <hr className="border-t border-gray-200 mb-10 mx-auto max-w-xs" />
        <div className="grid gap-x-8 gap-y-4" style={gridStyle}>
          {config.quick_links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 text-sm font-medium transition-all duration-200 hover:underline underline-offset-4"
              style={{ color: 'var(--landing-accent)' }}
            >
              <ArrowUpRight className="h-4 w-4 shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
