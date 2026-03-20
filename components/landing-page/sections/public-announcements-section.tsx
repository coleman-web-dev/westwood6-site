import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-50 border-red-200 text-red-700',
  important: 'bg-amber-50 border-amber-200 text-amber-700',
  normal: 'bg-gray-50 border-gray-200 text-gray-600',
};

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal') return null;
  const badgeClass = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${badgeClass}`}
    >
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

export function PublicAnnouncementsSection({ config, data }: Props) {
  if (data.announcements.length === 0) return null;

  const title = config.announcements_title || 'Community Updates';
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.announcements;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div className="space-y-4">
            {data.announcements.map((ann) => (
              <div
                key={ann.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {ann.title}
                      </h3>
                      <PriorityBadge priority={ann.priority} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(ann.created_at)}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line line-clamp-4">
                      {ann.body}
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

  /* ── Modern (featured first + compact rows) ──────────────── */
  if (template === 'modern') {
    const [featured, ...rest] = data.announcements;
    return (
      <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>

          {/* Featured announcement */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 mb-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                {featured.title}
              </h3>
              <PriorityBadge priority={featured.priority} />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {formatDate(featured.created_at)}
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {featured.body}
            </p>
          </div>

          {/* Compact rows for the rest */}
          {rest.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {rest.map((ann) => (
                <div key={ann.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {ann.title}
                    </h3>
                    <PriorityBadge priority={ann.priority} />
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
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

  /* ── Editorial (newspaper: featured + 2-col grid) ────────── */
  const [featured, ...rest] = data.announcements;
  return (
    <section className="py-16 px-6" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-2xl font-semibold mb-10 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {/* Featured announcement */}
        <div className="mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-xl font-bold text-gray-900">
              {featured.title}
            </h3>
            <PriorityBadge priority={featured.priority} />
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {formatDate(featured.created_at)}
          </p>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
            {featured.body}
          </p>
        </div>

        {/* 2-column grid for the rest */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {rest.map((ann) => (
              <div key={ann.id}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {ann.title}
                  </h3>
                  <PriorityBadge priority={ann.priority} />
                </div>
                <p className="text-xs text-gray-400 mb-1.5">
                  {formatDate(ann.created_at)}
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">
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
