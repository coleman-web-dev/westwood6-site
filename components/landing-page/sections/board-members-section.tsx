import { User } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
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
  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.board_members;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
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

  /* ── Modern ──────────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-thin">
            {data.boardMembers.map((member, i) => (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div
                  className="h-20 w-20 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 15%, transparent)' }}
                >
                  <User
                    className="h-8 w-8"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                </div>
                <p className="text-sm font-medium text-gray-900 text-center whitespace-nowrap">
                  {member.first_name} {member.last_name}
                </p>
                {config.show_board_titles && member.board_title && (
                  <p className="text-xs text-gray-500 mt-0.5 text-center">{member.board_title}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ───────────────────────────────────────────── */
  return (
    <section className="py-16 px-6 bg-gray-50" style={py ? { paddingTop: py, paddingBottom: py } : undefined}>
      <div className="mx-auto max-w-4xl">
        <h2
          className="text-2xl font-semibold mb-8 text-center"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>
        <div className="flex flex-wrap gap-6 justify-center">
          {data.boardMembers.map((member, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 15%, transparent)' }}
              >
                <User
                  className="h-5 w-5"
                  style={{ color: 'var(--landing-accent)' }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {member.first_name} {member.last_name}
                </p>
                {config.show_board_titles && member.board_title && (
                  <p className="text-xs text-gray-500">{member.board_title}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
