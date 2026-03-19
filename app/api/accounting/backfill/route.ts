import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { backfillJournalEntries } from '@/lib/utils/accounting-backfill';

export async function POST(req: NextRequest) {
  // Verify the user is a board member
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  let communityId = body.community_id;

  // Allow slug as alternative to community_id
  if (!communityId && body.slug) {
    const admin = createAdminClient();
    const { data: community } = await admin
      .from('communities')
      .select('id')
      .eq('slug', body.slug)
      .single();
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }
    communityId = community.id;
  }

  if (!communityId) {
    return NextResponse.json({ error: 'community_id or slug required' }, { status: 400 });
  }

  // Check user is board member for this community
  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await backfillJournalEntries(communityId);
  return NextResponse.json(stats);
}
