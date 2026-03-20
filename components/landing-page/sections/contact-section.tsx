import { Mail, Phone, MapPin } from 'lucide-react';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LayoutTemplate } from '@/lib/types/landing';
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

  const template: LayoutTemplate = config.layout_template || 'classic';
  const overrides = config.section_overrides?.contact;
  const py = overrides?.paddingY;

  /* ── Classic ─────────────────────────────────────────────── */
  if (template === 'classic') {
    return (
      <section
        className="py-24 sm:py-28 px-6"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            {/* Left column */}
            <div className="lg:w-1/2">
              <div className="inline-flex items-center gap-2 mb-4">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--landing-accent)' }}
                />
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Contact
                </span>
              </div>
              <h2
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]"
                style={{ color: 'var(--landing-primary)' }}
              >
                {title}
              </h2>
              {config.contact_body && (
                <p className="text-sm text-gray-500 leading-relaxed mt-4 whitespace-pre-line">
                  {config.contact_body}
                </p>
              )}
            </div>

            {/* Right column */}
            <div className="lg:w-1/2">
              <div className="rounded-2xl bg-stone-50 p-8">
                {community.email && (
                  <div className="flex items-center gap-4 rounded-full bg-white px-5 py-3 mb-3 shadow-sm">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--landing-accent) 10%, white)',
                      }}
                    >
                      <Mail
                        className="h-5 w-5"
                        style={{ color: 'var(--landing-accent)' }}
                      />
                    </div>
                    <a
                      href={`mailto:${community.email}`}
                      className="text-sm text-gray-700 hover:underline"
                      style={{ textDecorationColor: 'var(--landing-accent)' }}
                    >
                      {community.email}
                    </a>
                  </div>
                )}
                {community.phone && (
                  <div className="flex items-center gap-4 rounded-full bg-white px-5 py-3 mb-3 shadow-sm">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--landing-accent) 10%, white)',
                      }}
                    >
                      <Phone
                        className="h-5 w-5"
                        style={{ color: 'var(--landing-accent)' }}
                      />
                    </div>
                    <a
                      href={`tel:${community.phone}`}
                      className="text-sm text-gray-700 hover:underline"
                      style={{ textDecorationColor: 'var(--landing-accent)' }}
                    >
                      {community.phone}
                    </a>
                  </div>
                )}
                {community.address && (
                  <div className="flex items-center gap-4 rounded-full bg-white px-5 py-3 shadow-sm">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--landing-accent) 10%, white)',
                      }}
                    >
                      <MapPin
                        className="h-5 w-5"
                        style={{ color: 'var(--landing-accent)' }}
                      />
                    </div>
                    <span className="text-sm text-gray-700">
                      {community.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Modern (full-width primary band, 3-column) ──────────── */
  if (template === 'modern') {
    return (
      <section
        className="relative py-20 px-6"
        style={{
          backgroundColor: 'var(--landing-primary)',
          ...(py ? { paddingTop: py, paddingBottom: py } : {}),
        }}
      >
        {/* Decorative accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        />

        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold mb-12 text-center text-white tracking-tight">
            {title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-white">
            {/* Column 1: Address */}
            <div className="text-center md:text-left">
              {community.address ? (
                <div>
                  <MapPin className="h-5 w-5 mb-3 mx-auto md:mx-0 text-white/60" />
                  <p className="text-sm text-white/90 leading-relaxed">
                    {community.address}
                  </p>
                </div>
              ) : (
                <div />
              )}
            </div>
            {/* Column 2: Phone & Email */}
            <div className="text-center space-y-4">
              {community.phone && (
                <div>
                  <Phone className="h-5 w-5 mb-2 mx-auto text-white/60" />
                  <a
                    href={`tel:${community.phone}`}
                    className="text-sm text-white/90 hover:text-white transition-colors"
                  >
                    {community.phone}
                  </a>
                </div>
              )}
              {community.email && (
                <div>
                  <Mail className="h-5 w-5 mb-2 mx-auto text-white/60" />
                  <a
                    href={`mailto:${community.email}`}
                    className="text-sm text-white/90 hover:text-white transition-colors"
                  >
                    {community.email}
                  </a>
                </div>
              )}
            </div>
            {/* Column 3: Body text */}
            <div className="text-center md:text-right">
              {config.contact_body && (
                <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">
                  {config.contact_body}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ── Luxury (dark bg, gold accents, elegant typography) ──── */
  const infoItems: { icon: React.ReactNode; content: React.ReactNode }[] = [];

  if (community.address) {
    infoItems.push({
      icon: <MapPin className="h-5 w-5" style={{ color: 'var(--landing-accent)' }} />,
      content: <span className="text-sm text-white/80">{community.address}</span>,
    });
  }

  if (community.phone) {
    infoItems.push({
      icon: <Phone className="h-5 w-5" style={{ color: 'var(--landing-accent)' }} />,
      content: (
        <a
          href={`tel:${community.phone}`}
          className="text-sm text-white/80 hover:text-white transition-colors"
        >
          {community.phone}
        </a>
      ),
    });
  }

  if (community.email) {
    infoItems.push({
      icon: <Mail className="h-5 w-5" style={{ color: 'var(--landing-accent)' }} />,
      content: (
        <a
          href={`mailto:${community.email}`}
          className="text-sm text-white/80 hover:text-white transition-colors"
        >
          {community.email}
        </a>
      ),
    });
  }

  return (
    <section
      className="py-28 px-6"
      style={{
        backgroundColor: 'var(--landing-primary)',
        ...(py ? { paddingTop: py, paddingBottom: py } : {}),
      }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50 mb-6 block">
          Get in Touch
        </span>
        <h2 className="text-3xl sm:text-4xl font-light italic text-white mb-6">
          {title}
        </h2>

        {config.contact_body && (
          <p className="text-sm text-white/60 mb-14 whitespace-pre-line leading-relaxed max-w-lg mx-auto">
            {config.contact_body}
          </p>
        )}

        <div className="flex flex-col items-center gap-0">
          {infoItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              {i > 0 && (
                <div
                  className="w-px h-8 my-1"
                  style={{ backgroundColor: 'var(--landing-accent)', opacity: 0.3 }}
                />
              )}
              <div className="flex items-center gap-3 py-3">
                {item.icon}
                {item.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
