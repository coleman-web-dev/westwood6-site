import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

const PRIORITY_STYLES: Record<string, { badge: string; dot: string }> = {
  urgent: {
    badge: 'bg-red-50 border-red-200 text-red-700',
    dot: 'bg-red-500',
  },
  important: {
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
  },
  normal: {
    badge: 'bg-gray-50 border-gray-200 text-gray-600',
    dot: 'bg-gray-400',
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${style.badge}`}
    >
      {priority === 'urgent' ? 'Urgent' : 'Important'}
    </span>
  );
}

function PriorityBadgeModern({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-white/20 text-white border border-white/20">
      {priority === 'urgent' ? 'Urgent' : 'Important'}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PublicAnnouncementsSection({ config, data }: Props) {
  if (data.announcements.length === 0) return null;

  const title = config.announcements_title || 'Community Updates';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.announcements;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: 'var(--landing-primary)' }}
            >
              {title}
            </h2>
            <p className="text-sm text-gray-500">
              Stay informed with the latest news from your community.
            </p>
          </div>
          <div className="space-y-4">
            {data.announcements.map((ann) => (
              <div
                key={ann.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--landing-primary)' }}
                  >
                    {ann.title}
                  </h3>
                  <PriorityBadge priority={ann.priority} />
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {formatDate(ann.created_at)}
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4 leading-relaxed">
                  {ann.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern ─────────────────────────────────────────────── */
  if (template === 'modern') {
    const [featured, ...rest] = data.announcements;
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ color: 'var(--landing-primary)' }}
            >
              {title}
            </h2>
            <div
              className="w-12 h-1 rounded-full mx-auto"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          {/* Featured announcement: full-width, primary bg */}
          <div
            className="rounded-xl p-8 mb-6"
            style={{ backgroundColor: 'var(--landing-primary)' }}
          >
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h3 className="text-lg font-bold text-white">{featured.title}</h3>
              <PriorityBadgeModern priority={featured.priority} />
            </div>
            <p className="text-xs text-white/50 mb-4 uppercase tracking-wider">
              {formatDate(featured.created_at)}
            </p>
            <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">
              {featured.body}
            </p>
          </div>

          {/* Remaining: compact rows with accent left border on hover */}
          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:shadow-lg"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: 'var(--landing-accent)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className="text-sm font-bold flex-1"
                      style={{ color: 'var(--landing-primary)' }}
                    >
                      {ann.title}
                    </h3>
                    <PriorityBadge priority={ann.priority} />
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDateShort(ann.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                    {ann.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ── Editorial ──────────────────────────────────────────── */
  const [featured, ...rest] = data.announcements;
  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-3xl font-bold mb-16 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {/* Featured announcement: large display */}
        <div className="mb-12 pb-12 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">
              {formatDate(featured.created_at)}
            </span>
            <PriorityBadge priority={featured.priority} />
          </div>
          <h3
            className="text-2xl font-bold mb-5 leading-tight"
            style={{ color: 'var(--landing-primary)' }}
          >
            {featured.title}
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed max-w-2xl">
            {featured.body}
          </p>
        </div>

        {/* Remaining: 2-column grid with minimal styling */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {rest.map((ann) => (
              <div key={ann.id}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                    {formatDateShort(ann.created_at)}
                  </span>
                  <PriorityBadge priority={ann.priority} />
                </div>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {ann.title}
                </h3>
                <p className="text-sm text-gray-500 whitespace-pre-line line-clamp-4 leading-relaxed">
                  {ann.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
