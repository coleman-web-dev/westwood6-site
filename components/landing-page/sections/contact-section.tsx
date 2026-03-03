import { Mail, Phone, MapPin } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function ContactSection({ community, config }: Props) {
  const title = config.contact_title || 'Contact Us';
  const hasInfo = community.email || community.phone || community.address;

  if (!hasInfo && !config.contact_body) return null;

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {config.contact_body && (
          <p className="text-gray-600 text-center mb-8 whitespace-pre-line">
            {config.contact_body}
          </p>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          {community.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400 shrink-0" />
              <a
                href={`mailto:${community.email}`}
                className="text-sm hover:underline"
                style={{ color: 'var(--landing-accent)' }}
              >
                {community.email}
              </a>
            </div>
          )}
          {community.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400 shrink-0" />
              <a
                href={`tel:${community.phone}`}
                className="text-sm hover:underline"
                style={{ color: 'var(--landing-accent)' }}
              >
                {community.phone}
              </a>
            </div>
          )}
          {community.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{community.address}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
