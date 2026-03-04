import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFundSummary } from '@/lib/utils/accounting-reports';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get('community_id');
  if (!communityId) {
    return NextResponse.json({ error: 'community_id required' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const summary = await getFundSummary(communityId);
  return NextResponse.json(summary);
}
