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
 * PATCH /api/communities/[id]
 * Update a community's basic info (super_admin only).
 */
export async function PATCH(
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

    const body = await req.json();
    const updates: Record<string, string> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Community name cannot be empty' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if (body.slug !== undefined) {
      const normalizedSlug = String(body.slug).toLowerCase().trim();
      if (!isValidSlug(normalizedSlug)) {
        return NextResponse.json(
          { error: 'Slug must be 2-50 characters, lowercase letters, numbers, and hyphens only' },
          { status: 400 },
        );
      }
      if (RESERVED_SLUGS.has(normalizedSlug)) {
        return NextResponse.json({ error: 'This slug is reserved' }, { status: 400 });
      }
      // Check uniqueness (exclude self)
      const { data: existing } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', normalizedSlug)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'A community with this slug already exists' }, { status: 409 });
      }
      updates.slug = normalizedSlug;
    }

    if (body.address !== undefined) updates.address = body.address;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: community, error: updateError } = await supabase
      .from('communities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !community) {
      console.error('Failed to update community:', updateError);
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 });
    }

    return NextResponse.json({ community });
  } catch (error) {
    console.error('Error updating community:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
