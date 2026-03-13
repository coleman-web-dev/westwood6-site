import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/communities/[id]/archive
 * Archive or unarchive a community (super_admin only).
 * Body: { archive: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Authenticate
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify super_admin in any community
    const { data: membership } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('system_role', 'super_admin')
      .eq('is_approved', true)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { archive } = await req.json();

    if (typeof archive !== 'boolean') {
      return NextResponse.json({ error: 'archive must be a boolean' }, { status: 400 });
    }

    const { data: community, error: updateError } = await supabase
      .from('communities')
      .update({ archived_at: archive ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !community) {
      console.error('Failed to archive/unarchive community:', updateError);
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 });
    }

    return NextResponse.json({ community });
  } catch (error) {
    console.error('Error archiving community:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
