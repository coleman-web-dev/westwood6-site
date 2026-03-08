import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAndProcessStatements } from '@/lib/utils/plaid-statements';

export const maxDuration = 300; // 5 minutes for multiple downloads + AI processing

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, connectionId } = await request.json();
    if (!communityId || !connectionId) {
      return NextResponse.json(
        { error: 'communityId and connectionId are required' },
        { status: 400 },
      );
    }

    // Verify board member
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await fetchAndProcessStatements(communityId, connectionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch statements' },
      { status: 500 },
    );
  }
}
