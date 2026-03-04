import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LandingSectionId } from '@/lib/types/landing';
import { resolveLandingColors } from '@/lib/types/landing';
import { HeroSection } from './sections/hero-section';
import { AboutSection } from './sections/about-section';
import { BoardMembersSection } from './sections/board-members-section';
import { PublicDocumentsSection } from './sections/public-documents-section';
import { ContactSection } from './sections/contact-section';
import { QuickLinksSection } from './sections/quick-links-section';
import { AmenitiesSection } from './sections/amenities-section';
import { GallerySection } from './sections/gallery-section';
import { FaqSection } from './sections/faq-section';
import { PublicAnnouncementsSection } from './sections/public-announcements-section';
import { VendorsSection } from './sections/vendors-section';
import { LoginCtaSection } from './sections/login-cta-section';
import { LandingNavBar } from './landing-nav-bar';

interface BoardMember {
  first_name: string;
  last_name: string;
  board_title: string | null;
  system_role: string;
}

interface PublicDoc {
  id: string;
  title: string;
  category: string;
  file_size: number | null;
  signed_url: string;
}

interface PublicAmenity {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

interface PublicAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: string;
  created_at: string;
}

export interface LandingPageData {
  boardMembers: BoardMember[];
  publicDocs: PublicDoc[];
  amenities: PublicAmenity[];
  announcements: PublicAnnouncement[];
}

interface LandingPageShellProps {
  community: Community;
  config: LandingPageConfig;
  data: LandingPageData;
  slug: string;
  isMember: boolean;
}

const SECTION_COMPONENTS: Record<
  LandingSectionId,
  React.ComponentType<{ community: Community; config: LandingPageConfig; data: LandingPageData; slug: string }>
> = {
  hero: HeroSection,
  about: AboutSection,
  board_members: BoardMembersSection,
  documents: PublicDocumentsSection,
  contact: ContactSection,
  quick_links: QuickLinksSection,
  amenities: AmenitiesSection,
  gallery: GallerySection,
  faq: FaqSection,
  announcements: PublicAnnouncementsSection,
  vendors: VendorsSection,
};

export function LandingPageShell({
  community,
  config,
  data,
  slug,
  isMember,
}: LandingPageShellProps) {
  const { primary, accent } = resolveLandingColors(config);

  const enabledSections = config.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Show nav bar when 2+ non-hero sections are enabled
  const nonHeroEnabled = enabledSections.filter((s) => s.id !== 'hero');
  const showNavBar = nonHeroEnabled.length >= 2;

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          '--landing-primary': primary,
          '--landing-accent': accent,
        } as React.CSSProperties
      }
    >
      {showNavBar && (
        <LandingNavBar
          communityName={community.name}
          logoUrl={community.logo_url}
          sections={config.sections}
          slug={slug}
          isMember={isMember}
        />
      )}

      {enabledSections.map((section) => {
        const Component = SECTION_COMPONENTS[section.id];
        if (!Component) return null;
        return (
          <div key={section.id} id={`section-${section.id}`}>
            <Component
              community={community}
              config={config}
              data={data}
              slug={slug}
            />
          </div>
        );
      })}

      <LoginCtaSection slug={slug} isMember={isMember} communityName={community.name} />

      {config.footer_text && (
        <footer className="border-t border-gray-200 py-8 px-6 text-center">
          <p className="text-sm text-gray-500">{config.footer_text}</p>
        </footer>
      )}
    </div>
  );
}
