import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
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

export function PublicAnnouncementsSection({ config, data }: Props) {
  if (data.announcements.length === 0) return null;

  const title = config.announcements_title || 'Community Updates';

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="space-y-4">
          {data.announcements.map((ann) => {
            const badgeClass = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.normal;
            return (
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
                      {ann.priority !== 'normal' && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${badgeClass}`}
                        >
                          {ann.priority === 'urgent' ? 'Urgent' : 'Important'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ann.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line line-clamp-4">
                      {ann.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
