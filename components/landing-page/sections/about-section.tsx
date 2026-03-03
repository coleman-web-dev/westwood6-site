import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function AboutSection({ config }: Props) {
  if (!config.about_body) return null;

  const title = config.about_title || 'About Our Community';

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-line">
          {config.about_body}
        </p>
      </div>
    </section>
  );
}
