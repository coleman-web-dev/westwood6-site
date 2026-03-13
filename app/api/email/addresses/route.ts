import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/email/addresses?communityId=xxx
 * List all email addresses for a community.
 */
export async function GET(req: NextRequest) {
  try {
    const communityId = req.nextUrl.searchParams.get('communityId');

    if (!communityId) {
      return NextResponse.json({ error: 'communityId is required' }, { status: 400 });
    }

    // Authenticate
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify membership
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    }

    const { data: addresses } = await supabase
      .from('email_addresses')
      .select('*, members!email_addresses_assigned_to_fkey(first_name, last_name)')
      .eq('community_id', communityId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    return NextResponse.json({ addresses: addresses || [] });
  } catch (error) {
    console.error('Address list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/email/addresses
 * Create a new email address for a community.
 * Body: { communityId, address, displayName, addressType, roleLabel, assignedTo, forwardTo }
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId, address, displayName, addressType, roleLabel, assignedTo, forwardTo } =
      await req.json();

    if (!communityId || !address) {
      return NextResponse.json(
        { error: 'communityId and address are required' },
        { status: 400 },
      );
    }

    // Authenticate
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify board role
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (
      !member ||
      !['board', 'manager', 'super_admin'].includes(member.system_role)
    ) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Get domain for this community
    const { data: domain } = await supabase
      .from('community_email_domains')
      .select('id, domain_name')
      .eq('community_id', communityId)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json(
        { error: 'Set up an email domain first' },
        { status: 400 },
      );
    }

    // Validate address matches domain
    if (!address.endsWith(`@${domain.domain_name}`)) {
      return NextResponse.json(
        { error: `Address must end with @${domain.domain_name}` },
        { status: 400 },
      );
    }

    const { data: newAddress, error: insertError } = await supabase
      .from('email_addresses')
      .insert({
        community_id: communityId,
        domain_id: domain.id,
        address,
        display_name: displayName || null,
        address_type: addressType || 'role',
        role_label: roleLabel || null,
        assigned_to: assignedTo || null,
        forward_to: forwardTo || null,
        is_default: false,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This email address is already in use' }, { status: 409 });
      }
      console.error('Address creation error:', insertError);
      return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
    }

    return NextResponse.json({ address: newAddress });
  } catch (error) {
    console.error('Address creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/email/addresses
 * Update an email address.
 * Body: { communityId, addressId, displayName, forwardTo, assignedTo, isDefault }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { communityId, addressId, displayName, forwardTo, assignedTo, isDefault } =
      await req.json();

    if (!communityId || !addressId) {
      return NextResponse.json(
        { error: 'communityId and addressId are required' },
        { status: 400 },
      );
    }

    // Authenticate
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify board role
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (
      !member ||
      !['board', 'manager', 'super_admin'].includes(member.system_role)
    ) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('email_addresses')
        .update({ is_default: false })
        .eq('community_id', communityId);
    }

    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.display_name = displayName || null;
    if (forwardTo !== undefined) updates.forward_to = forwardTo || null;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo || null;
    if (isDefault !== undefined) updates.is_default = isDefault;

    const { data: updated, error: updateError } = await supabase
      .from('email_addresses')
      .update(updates)
      .eq('id', addressId)
      .eq('community_id', communityId)
      .select()
      .single();

    if (updateError) {
      console.error('Address update error:', updateError);
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
    }

    return NextResponse.json({ address: updated });
  } catch (error) {
    console.error('Address update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/email/addresses
 * Remove an email address. Cannot delete the default address.
 * Body: { communityId, addressId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { communityId, addressId } = await req.json();

    if (!communityId || !addressId) {
      return NextResponse.json(
        { error: 'communityId and addressId are required' },
        { status: 400 },
      );
    }

    // Authenticate
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify board role
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (
      !member ||
      !['board', 'manager', 'super_admin'].includes(member.system_role)
    ) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Check if it's the default address
    const { data: addr } = await supabase
      .from('email_addresses')
      .select('is_default')
      .eq('id', addressId)
      .eq('community_id', communityId)
      .single();

    if (!addr) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (addr.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default address. Set a different default first.' },
        { status: 400 },
      );
    }

    await supabase.from('email_addresses').delete().eq('id', addressId).eq('community_id', communityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Address deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
