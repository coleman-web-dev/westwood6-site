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
        className="py-16 px-6 bg-[#fafaf9]"
        style={py ? { paddingTop: py, paddingBottom: py } : undefined}
      >
        <div className="mx-auto max-w-2xl">
          <h2
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: 'var(--landing-primary)' }}
          >
            {title}
          </h2>

          {config.contact_body && (
            <p className="text-sm text-gray-600 text-center mb-8 whitespace-pre-line leading-relaxed">
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
                <span className="text-sm text-gray-700">
                  {community.address}
                </span>
              </div>
            )}
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

  /* ── Editorial (centered, oversized icons, hairline dividers) */
  const infoBlocks: React.ReactNode[] = [];

  if (community.address) {
    infoBlocks.push(
      <div key="address" className="text-center py-8">
        <MapPin
          className="h-10 w-10 mx-auto mb-4"
          style={{ color: 'var(--landing-accent)' }}
        />
        <p className="text-sm text-gray-700 leading-relaxed">
          {community.address}
        </p>
      </div>
    );
  }

  if (community.phone) {
    infoBlocks.push(
      <div key="phone" className="text-center py-8">
        <Phone
          className="h-10 w-10 mx-auto mb-4"
          style={{ color: 'var(--landing-accent)' }}
        />
        <a
          href={`tel:${community.phone}`}
          className="text-sm hover:underline underline-offset-4"
          style={{ color: 'var(--landing-accent)' }}
        >
          {community.phone}
        </a>
      </div>
    );
  }

  if (community.email) {
    infoBlocks.push(
      <div key="email" className="text-center py-8">
        <Mail
          className="h-10 w-10 mx-auto mb-4"
          style={{ color: 'var(--landing-accent)' }}
        />
        <a
          href={`mailto:${community.email}`}
          className="text-sm hover:underline underline-offset-4"
          style={{ color: 'var(--landing-accent)' }}
        >
          {community.email}
        </a>
      </div>
    );
  }

  return (
    <section
      className="py-24 px-6"
      style={py ? { paddingTop: py, paddingBottom: py } : undefined}
    >
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-3xl font-light mb-6 text-center tracking-wide"
          style={{ color: 'var(--landing-primary)' }}
        >
          {title}
        </h2>

        {config.contact_body && (
          <p className="text-sm text-gray-500 text-center mb-12 whitespace-pre-line leading-relaxed max-w-lg mx-auto">
            {config.contact_body}
          </p>
        )}

        <div>
          {infoBlocks.map((block, i) => (
            <div key={i}>
              {i > 0 && (
                <hr className="border-t border-gray-200 mx-auto max-w-[60px]" />
              )}
              {block}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
