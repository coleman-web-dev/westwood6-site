import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    .single();

  if (!community) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let member: Member | null = null;
  let unit: Unit | null = null;
  let householdMembers: Member[] = [];

  if (user) {
    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .eq('community_id', community.id)
      .eq('is_approved', true)
      .single();

    member = memberData as Member | null;

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
