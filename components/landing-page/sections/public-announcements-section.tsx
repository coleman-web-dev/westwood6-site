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
    const [featured, ...rest] = data.announcements;
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
                  News
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Stay informed with community updates
              </p>
            </div>
            <div className="lg:w-3/5">
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                {title}
              </h2>
            </div>
          </div>

          {/* Featured first announcement */}
          <div
            className="rounded-2xl p-8 sm:p-10 min-h-[200px] text-white relative overflow-hidden"
            style={{ backgroundColor: 'var(--landing-primary)' }}
          >
            {featured.priority !== 'normal' && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/20">
                {featured.priority === 'urgent' ? 'Urgent' : 'Important'}
              </span>
            )}
            <h3 className="text-xl sm:text-2xl font-bold mt-3">
              {featured.title}
            </h3>
            <p className="text-sm text-white/70 mt-3 whitespace-pre-line line-clamp-3">
              {featured.body}
            </p>
            <p className="text-xs text-white/40 mt-4">
              {formatDate(featured.created_at)}
            </p>
            <div
              className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-[0.1]"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          </div>

          {/* Remaining announcements */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              {rest.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-2xl bg-stone-50 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg"
                >
                  {ann.priority !== 'normal' && (
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mb-2"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--landing-accent) 10%, white)',
                        color: 'var(--landing-accent)',
                      }}
                    >
                      {ann.priority === 'urgent' ? 'Urgent' : 'Important'}
                    </span>
                  )}
                  <h3
                    className="text-sm font-bold"
                    style={{ color: 'var(--landing-primary)' }}
                  >
                    {ann.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 whitespace-pre-line line-clamp-2 leading-relaxed">
                    {ann.body}
                  </p>
                  <p className="text-xs text-gray-400 mt-3">
                    {formatDateShort(ann.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
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

  /* ── Luxury (cream bg, accent line, elegant featured card) ── */
  const [featured, ...rest] = data.announcements;
  return (
    <section
      className="py-28 px-6"
      style={{
        backgroundColor: '#FDFAF6',
        ...(py ? { paddingTop: py, paddingBottom: py } : {}),
      }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Centered title with accent line */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-light italic mb-4"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div
            className="mx-auto w-16 h-px"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
        </div>

        {/* Featured announcement: full-width dark card */}
        <div
          className="px-10 py-12 mb-12"
          style={{ backgroundColor: 'var(--landing-primary)' }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 block mb-4">
            {formatDate(featured.created_at)}
          </span>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <h3 className="text-2xl sm:text-3xl font-light italic text-white leading-tight">
              {featured.title}
            </h3>
            <PriorityBadge priority={featured.priority} />
          </div>
          <p className="text-sm text-white/70 whitespace-pre-line leading-relaxed max-w-2xl">
            {featured.body}
          </p>
        </div>

        {/* Remaining: clean divider rows */}
        {rest.length > 0 && (
          <div>
            {rest.map((ann) => (
              <div
                key={ann.id}
                className="py-8 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">
                    {formatDateShort(ann.created_at)}
                  </span>
                  <PriorityBadge priority={ann.priority} />
                </div>
                <h3
                  className="text-lg font-medium mb-2 leading-snug"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {ann.title}
                </h3>
                <p className="text-sm text-gray-500 whitespace-pre-line line-clamp-3 leading-relaxed">
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
