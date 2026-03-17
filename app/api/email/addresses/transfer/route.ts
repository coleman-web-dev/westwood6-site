import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';

export const runtime = 'nodejs';

/**
 * POST /api/email/addresses/transfer
 * One-click role transfer: reassign a role email address from one
 * board member to another. Automatically:
 * 1. Revokes old member's SMTP credentials (Gmail stops working)
 * 2. Removes old member's inbox access
 * 3. Reassigns address to new member
 * 4. Grants new member inbox access with forwarding
 *
 * Body: { addressId, newMemberId, communityId }
 */
export async function POST(req: NextRequest) {
  try {
    const { addressId, newMemberId, communityId } = await req.json();

    if (!addressId || !newMemberId || !communityId) {
      return NextResponse.json(
        { error: 'addressId, newMemberId, and communityId are required' },
        { status: 400 }
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

    // Get the email address
    const { data: emailAddr } = await supabase
      .from('email_addresses')
      .select('id, address, assigned_to, smtp_resend_key_id, role_label, community_id')
      .eq('id', addressId)
      .eq('community_id', communityId)
      .single();

    if (!emailAddr) {
      return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
    }

    // Verify new member exists and belongs to the community
    const { data: newMember } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, system_role')
      .eq('id', newMemberId)
      .eq('community_id', communityId)
      .single();

    if (!newMember) {
      return NextResponse.json({ error: 'New member not found' }, { status: 404 });
    }

    const oldMemberId = emailAddr.assigned_to;

    // Step 1: Revoke old SMTP credentials
    if (emailAddr.smtp_resend_key_id) {
      const resend = getResendClient();
      try {
        await resend.apiKeys.remove(emailAddr.smtp_resend_key_id);
      } catch (err) {
        console.warn('Failed to revoke old SMTP key during transfer:', err);
      }
    }

    // Step 2: Remove old member's inbox access
    if (oldMemberId) {
      await supabase
        .from('email_inbox_access')
        .delete()
        .eq('email_address_id', addressId)
        .eq('member_id', oldMemberId);
    }

    // Step 3: Reassign the address and clear SMTP credentials
    await supabase
      .from('email_addresses')
      .update({
        assigned_to: newMemberId,
        forward_to: newMember.email || null,
        smtp_resend_key_id: null,
        smtp_created_at: null,
        smtp_created_for_member_id: null,
      })
      .eq('id', addressId);

    // Step 4: Grant new member inbox access
    await supabase
      .from('email_inbox_access')
      .upsert(
        {
          community_id: communityId,
          email_address_id: addressId,
          member_id: newMemberId,
          can_read: true,
          can_reply: true,
          can_compose: true,
          notify_forward: true,
        },
        { onConflict: 'email_address_id,member_id' }
      );

    // Get old member info for the response
    let oldMemberName: string | null = null;
    if (oldMemberId) {
      const { data: oldMember } = await supabase
        .from('members')
        .select('first_name, last_name')
        .eq('id', oldMemberId)
        .single();

      if (oldMember) {
        oldMemberName = `${oldMember.first_name} ${oldMember.last_name}`;
      }
    }

    return NextResponse.json({
      transferred: true,
      address: emailAddr.address,
      roleLabel: emailAddr.role_label,
      oldMember: oldMemberName
        ? { id: oldMemberId, name: oldMemberName }
        : null,
      newMember: {
        id: newMember.id,
        name: `${newMember.first_name} ${newMember.last_name}`,
      },
      smtpRevoked: !!emailAddr.smtp_resend_key_id,
    });
  } catch (error) {
    console.error('Role transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
