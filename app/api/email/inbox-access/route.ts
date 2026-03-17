import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/email/inbox-access?emailAddressId=xxx&communityId=xxx
 * List members with inbox access for a given email address.
 */
export async function GET(req: NextRequest) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const emailAddressId = searchParams.get('emailAddressId');
  const communityId = searchParams.get('communityId');

  if (!emailAddressId || !communityId) {
    return NextResponse.json(
      { error: 'emailAddressId and communityId are required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify board membership
  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Board access required' }, { status: 403 });
  }

  const { data: accessList, error } = await supabase
    .from('email_inbox_access')
    .select(
      `
      id,
      member_id,
      can_read,
      can_reply,
      can_compose,
      notify_forward,
      created_at,
      members (
        id,
        first_name,
        last_name,
        email,
        system_role,
        board_title
      )
    `
    )
    .eq('email_address_id', emailAddressId)
    .eq('community_id', communityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ access: accessList || [] });
}

/**
 * POST /api/email/inbox-access
 * Grant inbox access to a member.
 */
export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  const {
    emailAddressId,
    communityId,
    memberId,
    canRead = true,
    canReply = true,
    canCompose = true,
    notifyForward = true,
  } = body;

  if (!emailAddressId || !communityId || !memberId) {
    return NextResponse.json(
      { error: 'emailAddressId, communityId, and memberId are required' },
      { status: 400 }
    );
  }

  // Verify board membership
  const { data: callerMember } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (
    !callerMember ||
    !['board', 'manager', 'super_admin'].includes(callerMember.system_role)
  ) {
    return NextResponse.json({ error: 'Board access required' }, { status: 403 });
  }

  // Verify email address belongs to community
  const { data: emailAddr } = await supabase
    .from('email_addresses')
    .select('id')
    .eq('id', emailAddressId)
    .eq('community_id', communityId)
    .single();

  if (!emailAddr) {
    return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
  }

  // Upsert access
  const { data: access, error } = await supabase
    .from('email_inbox_access')
    .upsert(
      {
        community_id: communityId,
        email_address_id: emailAddressId,
        member_id: memberId,
        can_read: canRead,
        can_reply: canReply,
        can_compose: canCompose,
        notify_forward: notifyForward,
      },
      { onConflict: 'email_address_id,member_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ access });
}

/**
 * PATCH /api/email/inbox-access
 * Update a member's inbox access (e.g., toggle notify_forward).
 */
export async function PATCH(req: NextRequest) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  const { accessId, communityId, ...updates } = body;

  if (!accessId || !communityId) {
    return NextResponse.json(
      { error: 'accessId and communityId are required' },
      { status: 400 }
    );
  }

  // Verify board membership
  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Board access required' }, { status: 403 });
  }

  // Only allow updating specific fields
  const allowedUpdates: Record<string, unknown> = {};
  if ('canRead' in updates) allowedUpdates.can_read = updates.canRead;
  if ('canReply' in updates) allowedUpdates.can_reply = updates.canReply;
  if ('canCompose' in updates) allowedUpdates.can_compose = updates.canCompose;
  if ('notifyForward' in updates) allowedUpdates.notify_forward = updates.notifyForward;

  const { data: access, error } = await supabase
    .from('email_inbox_access')
    .update(allowedUpdates)
    .eq('id', accessId)
    .eq('community_id', communityId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ access });
}

/**
 * DELETE /api/email/inbox-access
 * Revoke a member's inbox access.
 */
export async function DELETE(req: NextRequest) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await req.json();

  const { accessId, communityId } = body;

  if (!accessId || !communityId) {
    return NextResponse.json(
      { error: 'accessId and communityId are required' },
      { status: 400 }
    );
  }

  // Verify board membership
  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Board access required' }, { status: 403 });
  }

  const { error } = await supabase
    .from('email_inbox_access')
    .delete()
    .eq('id', accessId)
    .eq('community_id', communityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'deleted' });
}
