import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const RESERVED_SLUGS = new Set([
  'login', 'signup', 'reset-password', 'privacy', 'terms',
  'cookies', 'security', 'status', 'auth', 'api', '_next', 'static',
]);

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 50;
}

/**
 * Verify the caller is a super_admin in ANY community.
 * Returns the user object or a 401/403 response.
 */
async function verifySuperAdmin() {
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const supabase = createAdminClient();
  const { data: membership } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('system_role', 'super_admin')
    .eq('is_approved', true)
    .limit(1)
    .single();

  if (!membership) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }

  return { user, supabase };
}

/**
 * GET /api/communities
 * List all communities with member counts (super_admin only).
 */
export async function GET() {
  try {
    const result = await verifySuperAdmin();
    if ('error' in result && result.error instanceof NextResponse) return result.error;
    const { supabase } = result as { user: { id: string }; supabase: ReturnType<typeof createAdminClient> };

    const { data: communities, error } = await supabase
      .from('communities')
      .select('*')
      .order('archived_at', { ascending: true, nullsFirst: true })
      .order('name');

    if (error) {
      console.error('Failed to fetch communities:', error);
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
    }

    // Get member counts for each community
    const communityIds = communities.map((c: { id: string }) => c.id);
    const { data: memberCounts } = await supabase
      .from('members')
      .select('community_id')
      .in('community_id', communityIds)
      .eq('is_approved', true);

    const countMap: Record<string, number> = {};
    if (memberCounts) {
      for (const m of memberCounts) {
        countMap[m.community_id] = (countMap[m.community_id] || 0) + 1;
      }
    }

    const result2 = communities.map((c: { id: string }) => ({
      ...c,
      member_count: countMap[c.id] || 0,
    }));

    return NextResponse.json({ communities: result2 });
  } catch (error) {
    console.error('Error listing communities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/communities
 * Create a new community and link the caller as super_admin.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await verifySuperAdmin();
    if ('error' in result && result.error instanceof NextResponse) return result.error;
    const { user, supabase } = result as { user: { id: string }; supabase: ReturnType<typeof createAdminClient> };

    const { name, slug } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Community name is required' }, { status: 400 });
    }

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const normalizedSlug = slug.toLowerCase().trim();

    if (!isValidSlug(normalizedSlug)) {
      return NextResponse.json(
        { error: 'Slug must be 2-50 characters, lowercase letters, numbers, and hyphens only' },
        { status: 400 },
      );
    }

    if (RESERVED_SLUGS.has(normalizedSlug)) {
      return NextResponse.json({ error: 'This slug is reserved and cannot be used' }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', normalizedSlug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A community with this slug already exists' }, { status: 409 });
    }

    // Get caller's info for the member record
    const { data: callerMember } = await supabase
      .from('members')
      .select('first_name, last_name, email')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .limit(1)
      .single();

    // Create the community
    const { data: community, error: createError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        slug: normalizedSlug,
      })
      .select()
      .single();

    if (createError || !community) {
      console.error('Failed to create community:', createError);
      return NextResponse.json({ error: 'Failed to create community' }, { status: 500 });
    }

    // Link the caller as super_admin
    const { error: memberError } = await supabase
      .from('members')
      .insert({
        user_id: user.id,
        community_id: community.id,
        first_name: callerMember?.first_name ?? 'Admin',
        last_name: callerMember?.last_name ?? '',
        email: callerMember?.email ?? null,
        member_role: 'owner',
        system_role: 'super_admin',
        is_approved: true,
        show_in_directory: true,
      });

    if (memberError) {
      console.error('Failed to create member link:', memberError);
      // Clean up the community since member creation failed
      await supabase.from('communities').delete().eq('id', community.id);
      return NextResponse.json({ error: 'Failed to link account to community' }, { status: 500 });
    }

    return NextResponse.json({ community });
  } catch (error) {
    console.error('Error creating community:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
