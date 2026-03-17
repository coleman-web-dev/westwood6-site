import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/email/inbox/enable
 * One-click community inbox setup:
 * 1. Activates {slug}@duesiq.com subdomain address (if not already)
 * 2. Upgrades the address to full_inbox mailbox type
 * 3. Auto-grants inbox access to all current board members
 *
 * DELETE /api/email/inbox/enable
 * Disables the community inbox:
 * 1. Downgrades the address back to sending_only
 * 2. Removes all inbox access grants
 * 3. Updates community settings
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId } = await req.json();

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

    // Verify board role
    const { data: callerMember } = await supabase
      .from('members')
      .select('id, system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (
      !callerMember ||
      !['board', 'manager', 'super_admin'].includes(callerMember.system_role)
    ) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Get community
    const { data: community } = await supabase
      .from('communities')
      .select('slug, theme')
      .eq('id', communityId)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const subdomainAddress = `${community.slug}@duesiq.com`;

    // Step 1: Ensure subdomain domain record exists
    let { data: existingDomain } = await supabase
      .from('community_email_domains')
      .select('id, domain_type')
      .eq('community_id', communityId)
      .maybeSingle();

    if (existingDomain?.domain_type === 'custom') {
      // Custom domain exists, use it instead of creating a subdomain
      // Just upgrade the default address to full_inbox
    } else if (!existingDomain) {
      // Create subdomain domain record
      const { data: newDomain } = await supabase
        .from('community_email_domains')
        .insert({
          community_id: communityId,
          resend_domain_id: `duesiq-subdomain-${community.slug}`,
          domain_name: 'duesiq.com',
          domain_type: 'subdomain',
          status: 'verified',
          dns_records: [],
          is_active: true,
          last_verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      existingDomain = newDomain;
    }

    if (!existingDomain) {
      return NextResponse.json({ error: 'Failed to set up email domain' }, { status: 500 });
    }

    // Step 2: Ensure email address exists and upgrade to full_inbox
    let { data: emailAddr } = await supabase
      .from('email_addresses')
      .select('id, address, mailbox_type')
      .eq('community_id', communityId)
      .eq('domain_id', existingDomain.id)
      .eq('is_default', true)
      .maybeSingle();

    if (!emailAddr) {
      // Create the default address
      const { data: newAddr } = await supabase
        .from('email_addresses')
        .insert({
          community_id: communityId,
          domain_id: existingDomain.id,
          address: subdomainAddress,
          address_type: 'community',
          is_default: true,
          mailbox_type: 'full_inbox',
        })
        .select()
        .single();

      emailAddr = newAddr;
    } else if (emailAddr.mailbox_type !== 'full_inbox') {
      // Upgrade existing address to full_inbox
      await supabase
        .from('email_addresses')
        .update({ mailbox_type: 'full_inbox' })
        .eq('id', emailAddr.id);
    }

    if (!emailAddr) {
      return NextResponse.json({ error: 'Failed to set up email address' }, { status: 500 });
    }

    // Step 3: Auto-grant inbox access to all board members
    const { data: boardMembers } = await supabase
      .from('members')
      .select('id')
      .eq('community_id', communityId)
      .in('system_role', ['board', 'manager', 'super_admin']);

    if (boardMembers?.length) {
      const accessRecords = boardMembers.map((m) => ({
        community_id: communityId,
        email_address_id: emailAddr!.id,
        member_id: m.id,
        can_read: true,
        can_reply: true,
        can_compose: true,
        notify_forward: true,
      }));

      await supabase
        .from('email_inbox_access')
        .upsert(accessRecords, { onConflict: 'email_address_id,member_id' });
    }

    // Step 4: Update community email settings
    const theme = (community.theme as Record<string, unknown>) || {};
    const emailSettings = (theme.email_settings as Record<string, unknown>) || {};
    await supabase
      .from('communities')
      .update({
        theme: {
          ...theme,
          email_settings: {
            ...emailSettings,
            sending_mode: existingDomain.domain_type === 'custom' ? 'custom_domain' : 'subdomain',
            subdomain_address:
              existingDomain.domain_type === 'subdomain' ? subdomainAddress : undefined,
            inbox_enabled: true,
          },
        },
      })
      .eq('id', communityId);

    return NextResponse.json({
      enabled: true,
      address: emailAddr.address || subdomainAddress,
      boardMembersGranted: boardMembers?.length || 0,
    });
  } catch (error) {
    console.error('Enable community inbox error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/email/inbox/enable
 * Disable the community inbox (downgrades to sending-only).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { communityId } = await req.json();

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

    // Verify board role
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Downgrade all full_inbox addresses back to sending_only
    const { data: inboxAddresses } = await supabase
      .from('email_addresses')
      .select('id')
      .eq('community_id', communityId)
      .eq('mailbox_type', 'full_inbox');

    if (inboxAddresses?.length) {
      const ids = inboxAddresses.map((a) => a.id);

      // Downgrade mailbox type
      await supabase
        .from('email_addresses')
        .update({ mailbox_type: 'sending_only' })
        .in('id', ids);

      // Remove all inbox access grants for these addresses
      await supabase
        .from('email_inbox_access')
        .delete()
        .eq('community_id', communityId)
        .in('email_address_id', ids);
    }

    // Update community settings
    const { data: community } = await supabase
      .from('communities')
      .select('theme')
      .eq('id', communityId)
      .single();

    if (community) {
      const theme = (community.theme as Record<string, unknown>) || {};
      const emailSettings = (theme.email_settings as Record<string, unknown>) || {};
      await supabase
        .from('communities')
        .update({
          theme: {
            ...theme,
            email_settings: {
              ...emailSettings,
              inbox_enabled: false,
            },
          },
        })
        .eq('id', communityId);
    }

    return NextResponse.json({ enabled: false });
  } catch (error) {
    console.error('Disable community inbox error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
