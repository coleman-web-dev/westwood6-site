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

  /* ── Classic ─────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section
        className="py-16 px-6 bg-stone-50/60"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-2xl font-bold mb-10 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {data.boardMembers.map((member, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-6 text-center shadow-sm"
              >
                {/* Circular avatar with accent-tinted background */}
                <div
                  className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 12%, white)' }}
                >
                  <User
                    className="h-6 w-6"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                </div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--landing-primary)' }}
                >
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

  /* ── Modern ──────────────────────────────────────────── */
  if (template === 'modern') {
    return (
      <section
        className="py-20 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-5xl">
          {/* Decorative accent bar above title */}
          <div
            className="mx-auto mb-5 h-1 w-12 rounded-full"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
          <h2
            className="text-2xl font-bold mb-6 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>

          {/* Overlapping avatar row preview */}
          <div className="flex justify-center mb-10">
            <div className="flex -space-x-3">
              {data.boardMembers.slice(0, 6).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 15%, white)' }}
                >
                  <User
                    className="h-5 w-5"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                </div>
              ))}
              {data.boardMembers.length > 6 && (
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--landing-primary)' }}
                >
                  +{data.boardMembers.length - 6}
                </div>
              )}
            </div>
          </div>

          {/* Individual member cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.boardMembers.map((member, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-default"
                style={{ borderTop: '3px solid var(--landing-accent)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 12%, white)' }}
                  >
                    <User
                      className="h-5 w-5"
                      style={{ color: 'var(--landing-accent)' }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--landing-primary)' }}
                    >
                      {member.first_name} {member.last_name}
                    </p>
                    {config.show_board_titles && member.board_title && (
                      <span
                        className="inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--landing-accent) 10%, white)',
                          color: 'var(--landing-accent)',
                        }}
                      >
                        {member.board_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Editorial ───────────────────────────────────────── */
  return (
    <section
      className="py-24 sm:py-28 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <h2
          className="text-3xl sm:text-4xl font-bold mb-4 text-center tracking-tight"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {/* Thin horizontal divider */}
        <div className="mt-8 mb-12 h-px w-full bg-gray-200" />

        {/* Clean minimal grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-0">
          {data.boardMembers.map((member, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-6 border-b border-gray-100"
            >
              {/* Small avatar */}
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--landing-accent) 8%, #f5f5f4)' }}
              >
                <User
                  className="h-6 w-6"
                  style={{ color: 'var(--landing-accent)', opacity: 0.7 }}
                />
              </div>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--landing-primary)' }}
                >
                  {member.first_name} {member.last_name}
                </p>
                {config.show_board_titles && member.board_title && (
                  <p className="text-xs text-gray-400 mt-0.5">{member.board_title}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
