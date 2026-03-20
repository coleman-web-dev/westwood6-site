import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';
import { LandingPageShell } from '@/components/landing-page/landing-page-shell';
import type { LandingPageData } from '@/components/landing-page/landing-page-shell';
import type { Community } from '@/lib/types/database';
import type { LandingPageConfig } from '@/lib/types/landing';
import { DEFAULT_LANDING_CONFIG } from '@/lib/types/landing';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CommunityLandingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!community) return null;

  const c = community as Community;

  const { data: { user } } = await supabase.auth.getUser();
  let isMember = false;

  if (user) {
    const { data: member } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', c.id)
      .eq('is_approved', true)
      .single();
    isMember = !!member;
  }

  const rawLandingConfig: LandingPageConfig | undefined = c.theme?.landing_page;

  // If no landing page config exists, auto-generate one from community data
  // so communities get a beautiful landing page out of the box
  const landingConfig: LandingPageConfig = rawLandingConfig
    ? {
        ...DEFAULT_LANDING_CONFIG,
        ...rawLandingConfig,
        sections: rawLandingConfig.sections ?? DEFAULT_LANDING_CONFIG.sections,
      }
    : {
        ...DEFAULT_LANDING_CONFIG,
        hero_headline: `Welcome to ${c.name}`,
        hero_subheadline: c.address || null,
        hero_layout: 'text_only',
        hero_thickness: 'tall',
        about_title: `About ${c.name}`,
        about_body: null,
        contact_title: 'Contact Us',
        contact_body: null,
        footer_text: `\u00A9 ${new Date().getFullYear()} ${c.name}. All rights reserved.`,
        sections: [
          { id: 'hero', enabled: true, order: 0 },
          { id: 'about', enabled: false, order: 1 },
          { id: 'announcements', enabled: true, order: 2 },
          { id: 'board_members', enabled: true, order: 3 },
          { id: 'amenities', enabled: true, order: 4 },
          { id: 'documents', enabled: true, order: 5 },
          { id: 'vendors', enabled: false, order: 6 },
          { id: 'quick_links', enabled: false, order: 7 },
          { id: 'gallery', enabled: false, order: 8 },
          { id: 'faq', enabled: false, order: 9 },
          { id: 'contact', enabled: true, order: 10 },
        ],
      };

  // Fetch all public data in parallel using admin client (bypasses RLS for unauthenticated visitors)
  let landingData: LandingPageData = {
    boardMembers: [],
    publicDocs: [],
    amenities: [],
    announcements: [],
  };

  try {
    const admin = createAdminClient();
    const enabledSectionIds = new Set(
      landingConfig.sections.filter((s) => s.enabled).map((s) => s.id)
    );

    const [boardResult, docsResult, amenitiesResult, announcementsResult] =
      await Promise.all([
        enabledSectionIds.has('board_members')
          ? admin
              .from('members')
              .select('first_name, last_name, board_title, system_role')
              .eq('community_id', c.id)
              .in('system_role', ['board', 'manager', 'super_admin'])
              .eq('is_approved', true)
          : Promise.resolve({ data: [] }),

        enabledSectionIds.has('documents')
          ? admin
              .from('documents')
              .select('id, title, category, file_path, file_size')
              .eq('community_id', c.id)
              .eq('visibility', 'public')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),

        enabledSectionIds.has('amenities')
          ? admin
              .from('amenities')
              .select('id, name, description, icon')
              .eq('community_id', c.id)
              .eq('active', true)
          : Promise.resolve({ data: [] }),

        enabledSectionIds.has('announcements')
          ? admin
              .from('announcements')
              .select('id, title, body, priority, created_at')
              .eq('community_id', c.id)
              .eq('is_public', true)
              .order('created_at', { ascending: false })
              .limit(landingConfig.max_public_announcements || 5)
          : Promise.resolve({ data: [] }),
      ]);

    // Generate signed URLs for public documents (they're in the private hoa-documents bucket)
    const publicDocs = await Promise.all(
      (docsResult.data || []).map(async (doc: { id: string; title: string; category: string; file_path: string; file_size: number | null }) => {
        const { data } = await admin.storage
          .from('hoa-documents')
          .createSignedUrl(doc.file_path, 3600);
        return {
          id: doc.id,
          title: doc.title,
          category: doc.category,
          file_size: doc.file_size,
          signed_url: data?.signedUrl || '#',
        };
      })
    );

    landingData = {
      boardMembers: (boardResult.data || []) as LandingPageData['boardMembers'],
      publicDocs,
      amenities: (amenitiesResult.data || []) as LandingPageData['amenities'],
      announcements: (announcementsResult.data || []) as LandingPageData['announcements'],
    };
  } catch (err) {
    console.error('Landing page data fetch error:', err);
  }

  return (
    <LandingPageShell
      community={c}
      config={landingConfig}
      data={landingData}
      slug={slug}
      isMember={isMember}
    />
  );
}

/** Backwards-compatible minimal landing page for communities without landing config */
function LegacyLandingPage({
  community: c,
  slug,
  isMember,
}: {
  community: Community;
  slug: string;
  isMember: boolean;
}) {
  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-12">
          {c.logo_url && (
            <img
              src={c.logo_url}
              alt={`${c.name} logo`}
              className="mx-auto mb-6 h-20 w-20 rounded-panel object-cover"
            />
          )}
          <h1 className="text-page-title font-display text-3xl font-bold tracking-tight">
            {c.name}
          </h1>
          {c.address && (
            <p className="mt-2 text-body text-text-secondary-light dark:text-text-secondary-dark">
              {c.address}
            </p>
          )}
        </div>

        <div className="rounded-panel bg-card p-8 shadow-surface-light dark:shadow-surface-dark mb-8">
          <h2 className="text-section-title mb-4">Community Information</h2>
          <div className="space-y-2 text-body">
            {c.email && (
              <p>
                <span className="text-text-muted-light dark:text-text-muted-dark">Email:</span>{' '}
                <a href={`mailto:${c.email}`} className="text-secondary-500 hover:underline">{c.email}</a>
              </p>
            )}
            {c.phone && (
              <p>
                <span className="text-text-muted-light dark:text-text-muted-dark">Phone:</span>{' '}
                <a href={`tel:${c.phone}`} className="text-secondary-500 hover:underline">{c.phone}</a>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {isMember ? (
            <Link href={`/${slug}/dashboard`}>
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href={`/login?redirect=/${slug}/dashboard`}>
                <Button size="lg">Member Login</Button>
              </Link>
              <Link href={`/signup?community=${slug}`}>
                <Button variant="outline" size="lg">Request Access</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
