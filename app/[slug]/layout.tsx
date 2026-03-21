import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CommunityProvider } from '@/lib/providers/community-provider';
import type { Community, Member, Unit } from '@/lib/types/database';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CommunityLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .is('archived_at', null)
    .single();

  if (!community) notFound();

  // Dev bypass: provide mock member data in development
  const cookieStore = await cookies();
  const isDevBypass = process.env.NODE_ENV === 'development' && cookieStore.get('dev-bypass')?.value === '1';

  if (isDevBypass) {
    const mockMember = {
      id: 'dev-member',
      user_id: 'dev-user',
      community_id: community.id,
      unit_id: 'dev-unit',
      first_name: 'Dev',
      last_name: 'User',
      email: 'dev@localhost',
      phone: null,
      member_role: 'owner',
      system_role: 'super_admin',
      is_approved: true,
      show_in_directory: true,
      board_title: null,
      role_template_id: null,
      parent_member_id: null,
      setup_completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as Member;

    const mockUnit = {
      id: 'dev-unit',
      community_id: community.id,
      unit_number: '101',
      address: '123 Dev St',
      status: 'active',
      payment_frequency: null,
      created_at: new Date().toISOString(),
    } as Unit;

    return (
      <CommunityProvider initialData={{ community: community as Community, member: mockMember, unit: mockUnit, householdMembers: [mockMember], userCommunities: [{ id: community.id, slug: community.slug, name: community.name }] }}>
        {children}
      </CommunityProvider>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  let member: Member | null = null;
  let unit: Unit | null = null;
  let householdMembers: Member[] = [];
  let userCommunities: { id: string; slug: string; name: string }[] = [];

  if (user) {
    // Fetch current community member + all user's communities in parallel
    const [memberResult, allMembershipsResult] = await Promise.all([
      supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .eq('community_id', community.id)
        .eq('is_approved', true)
        .single(),
      supabase
        .from('members')
        .select('community_id, communities!inner(id, slug, name, archived_at)')
        .eq('user_id', user.id)
        .eq('is_approved', true)
        .is('communities.archived_at', null),
    ]);

    member = memberResult.data as Member | null;

    // Super admin auto-provisioning: if user has no member record in this
    // community but is a super_admin in ANY community, create one so they
    // get full access everywhere.
    if (!member) {
      const adminClient = createAdminClient();
      const { data: superAdminRecord } = await adminClient
        .from('members')
        .select('id, first_name, last_name, email')
        .eq('user_id', user.id)
        .eq('system_role', 'super_admin')
        .eq('is_approved', true)
        .limit(1)
        .maybeSingle();

      if (superAdminRecord) {
        const { data: newMember } = await adminClient
          .from('members')
          .insert({
            community_id: community.id,
            user_id: user.id,
            first_name: superAdminRecord.first_name,
            last_name: superAdminRecord.last_name,
            email: superAdminRecord.email,
            member_role: 'owner',
            system_role: 'super_admin',
            is_approved: true,
            show_in_directory: false,
          })
          .select('*')
          .single();

        member = newMember as Member | null;
      }
    }

    // Extract user's communities for the switcher
    if (allMembershipsResult.data) {
      userCommunities = allMembershipsResult.data
        .map((m: { communities: { id: string; slug: string; name: string; archived_at: string | null } | null }) => {
          if (!m.communities) return null;
          const { archived_at: _, ...rest } = m.communities;
          return rest;
        })
        .filter(Boolean) as { id: string; slug: string; name: string }[];
    }

    // If super_admin was just auto-provisioned, ensure current community is in the switcher
    if (member && !userCommunities.some((c) => c.id === community.id)) {
      userCommunities.push({ id: community.id, slug: community.slug, name: community.name });
    }

    if (member?.unit_id) {
      const [unitResult, householdResult] = await Promise.all([
        supabase.from('units').select('*').eq('id', member.unit_id).single(),
        supabase.from('members').select('*').eq('unit_id', member.unit_id).eq('is_approved', true),
      ]);
      unit = unitResult.data as Unit | null;
      householdMembers = (householdResult.data as Member[]) ?? [];
    }
  }

  return (
    <CommunityProvider
      initialData={{
        community: community as Community,
        member,
        unit,
        householdMembers,
        userCommunities,
      }}
    >
      {children}
    </CommunityProvider>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('slug', slug)
    .single();

  return {
    title: community?.name ?? 'Community',
    description: `Welcome to ${community?.name ?? 'your community'} portal.`,
  };
}
