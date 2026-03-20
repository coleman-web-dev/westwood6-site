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
                  Our Team
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                Meet the people who serve our community
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

          {/* Overlapping avatar cluster */}
          <div className="flex items-center -space-x-4 mb-10">
            {data.boardMembers.slice(0, 6).map((_, i) => (
              <div
                key={i}
                className="h-14 w-14 rounded-full flex items-center justify-center border-[3px] border-white shadow-md"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--landing-accent) 12%, white)',
                }}
              >
                <User
                  className="h-6 w-6"
                  style={{ color: 'var(--landing-accent)' }}
                />
              </div>
            ))}
            {data.boardMembers.length > 6 && (
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center border-[3px] border-white shadow-md text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                +{data.boardMembers.length - 6}
              </div>
            )}
          </div>

          {/* Member cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.boardMembers.map((member, i) => (
              <div
                key={i}
                className="rounded-2xl bg-stone-50 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--landing-accent) 12%, white)',
                    }}
                  >
                    <User
                      className="h-5 w-5"
                      style={{ color: 'var(--landing-accent)' }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: 'var(--landing-primary)' }}
                    >
                      {member.first_name} {member.last_name}
                    </p>
                    {config.show_board_titles && member.board_title && (
                      <span
                        className="inline-block mt-1 rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--landing-accent) 10%, white)',
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

  /* ── Luxury ──────────────────────────────────────────── */
  return (
    <section
      className="py-24 sm:py-32 px-6"
      style={{
        backgroundColor: 'var(--landing-primary)',
        ...(py ? { paddingTop: py, paddingBottom: py } : {}),
      }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.2em] mb-4"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            Our Leadership
          </p>
          <h2 className="text-3xl sm:text-4xl font-light italic text-white leading-[1.2] mb-6">
            {title}
          </h2>
          {/* Thin accent line */}
          <div
            className="mx-auto h-px w-16"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          />
        </div>

        {/* Member grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.boardMembers.map((member, i) => (
            <div
              key={i}
              className="border border-white/10 px-7 py-6 transition-colors duration-300 hover:border-white/20"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {member.first_name} {member.last_name}
                  </p>
                  {config.show_board_titles && member.board_title && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--landing-accent)' }}
                    >
                      {member.board_title}
                    </p>
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
