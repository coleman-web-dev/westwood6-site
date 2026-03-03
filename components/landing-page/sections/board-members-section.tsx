import { User } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import type { LandingPageData } from '../landing-page-shell';

interface Props {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
}

export function BoardMembersSection({ config, data }: Props) {
  if (data.boardMembers.length === 0) return null;

  const title = config.board_members_title || 'Board of Directors';

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {data.boardMembers.map((member, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 text-center shadow-sm"
            >
              <div
                className="mx-auto mb-3 h-12 w-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.15 }}
              >
                <User
                  className="h-6 w-6"
                  style={{ color: 'var(--landing-accent)' }}
                />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {member.first_name} {member.last_name}
              </p>
              {config.show_board_titles && member.board_title && (
                <p className="text-xs text-gray-500 mt-1">{member.board_title}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
