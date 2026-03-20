import type { Community } from '@/lib/types/database';
import type { LandingPageConfig, LandingSectionId, SectionStyleOverride } from '@/lib/types/landing';
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
import { ResizableSection } from './resizable-section';

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
  isEditing?: boolean;
  scale?: number;
  onSectionResize?: (sectionId: LandingSectionId, changes: Partial<SectionStyleOverride>) => void;
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

// Sections that support height resize
const HEIGHT_RESIZABLE: Set<LandingSectionId> = new Set(['hero', 'gallery']);
// Sections that support column count resize
const COLUMN_RESIZABLE: Set<LandingSectionId> = new Set([
  'gallery', 'quick_links', 'amenities', 'board_members', 'vendors',
]);

export function LandingPageShell({
  community,
  config,
  data,
  slug,
  isMember,
  isEditing = false,
  scale = 1,
  onSectionResize,
}: LandingPageShellProps) {
  const { primary, accent } = resolveLandingColors(config);
  const rawTemplate = config.layout_template || 'classic';
  // Migrate renamed template: 'editorial' was renamed to 'luxury'
  const template = (rawTemplate as string) === 'editorial' ? 'luxury' as const : rawTemplate;

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
          layoutTemplate={template}
        />
      )}

      {enabledSections.map((section) => {
        const Component = SECTION_COMPONENTS[section.id];
        if (!Component) return null;

        const overrides = config.section_overrides?.[section.id];

        const sectionElement = (
          <div
            key={section.id}
            id={`section-${section.id}`}
          >
            <Component
              community={community}
              config={config}
              data={data}
              slug={slug}
            />
          </div>
        );

        if (isEditing && onSectionResize) {
          return (
            <ResizableSection
              key={section.id}
              sectionId={section.id}
              scale={scale}
              canResizeHeight={HEIGHT_RESIZABLE.has(section.id)}
              canResizeColumns={COLUMN_RESIZABLE.has(section.id)}
              currentHeight={overrides?.height}
              currentColumns={overrides?.columns}
              onResize={(changes) => onSectionResize(section.id, changes)}
            >
              {sectionElement}
            </ResizableSection>
          );
        }

        return sectionElement;
      })}

      <LoginCtaSection slug={slug} isMember={isMember} communityName={community.name} config={config} />

      {config.footer_text && (
        <footer
          className={
            template === 'modern'
              ? 'py-10 px-6 text-center'
              : template === 'luxury'
              ? 'py-16 px-6 text-center'
              : 'py-12 px-6 text-center bg-stone-50'
          }
          style={
            template === 'modern'
              ? { backgroundColor: 'var(--landing-primary)' }
              : template === 'luxury'
              ? { backgroundColor: 'var(--landing-primary)' }
              : undefined
          }
        >
          {template === 'luxury' && (
            <div
              className="mx-auto w-12 h-px mb-8"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          )}
          {template === 'classic' && (
            <div
              className="mx-auto w-1.5 h-1.5 rounded-full mb-5"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          )}
          <p
            className={
              template === 'modern'
                ? 'text-sm text-white/60'
                : template === 'luxury'
                ? 'text-xs text-white/40 uppercase tracking-[0.15em]'
                : template === 'classic'
                ? 'text-xs text-gray-400'
                : 'text-sm text-gray-500'
            }
          >
            {config.footer_text}
          </p>
          {template === 'modern' && (
            <div
              className="mx-auto mt-4 w-12 h-0.5 rounded-full"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            />
          )}
        </footer>
      )}
    </div>
  );
}
