import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';

const BLOCKED_DOMAINS = ['duesiq.com', 'resend.com', 'resend.dev', 'gmail.com', 'outlook.com', 'yahoo.com'];

/**
 * POST /api/email/domains
 * Add a custom domain for a community. Calls Resend API to register domain.
 * Body: { communityId, domainName, fromAddress }
 * Requires board member authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const { communityId, domainName, fromAddress } = await req.json();

    if (!communityId || !domainName || !fromAddress) {
      return NextResponse.json(
        { error: 'communityId, domainName, and fromAddress are required' },
        { status: 400 },
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domainName)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Check blocklist
    if (BLOCKED_DOMAINS.includes(domainName.toLowerCase())) {
      return NextResponse.json({ error: 'This domain cannot be used' }, { status: 400 });
    }

    // Validate from address matches domain
    if (!fromAddress.endsWith(`@${domainName}`)) {
      return NextResponse.json(
        { error: 'From address must be on the specified domain' },
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

    // Check if community already has a domain
    const { data: existing } = await supabase
      .from('community_email_domains')
      .select('id')
      .eq('community_id', communityId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Community already has an email domain configured. Remove it first.' },
        { status: 409 },
      );
    }

    // Register domain with Resend
    const resend = getResendClient();
    const { data: resendDomain, error: resendError } = await resend.domains.create({
      name: domainName,
    });

    if (resendError || !resendDomain) {
      console.error('Resend domain creation failed:', resendError);
      return NextResponse.json(
        { error: 'Failed to register domain with email provider' },
        { status: 502 },
      );
    }

    // Store domain configuration
    const { data: domain, error: dbError } = await supabase
      .from('community_email_domains')
      .insert({
        community_id: communityId,
        resend_domain_id: resendDomain.id,
        domain_name: domainName,
        domain_type: 'custom',
        status: 'pending',
        dns_records: resendDomain.records || [],
        is_active: false,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up Resend domain if DB insert fails
      await resend.domains.remove(resendDomain.id).catch(() => {});
      console.error('DB insert failed:', dbError);
      return NextResponse.json({ error: 'Failed to save domain configuration' }, { status: 500 });
    }

    // Create the default email address
    await supabase.from('email_addresses').insert({
      community_id: communityId,
      domain_id: domain.id,
      address: fromAddress,
      address_type: 'community',
      is_default: true,
    });

    // Update community email settings
    const { data: community } = await supabase
      .from('communities')
      .select('theme')
      .eq('id', communityId)
      .single();

    const theme = (community?.theme as Record<string, unknown>) || {};
    const emailSettings = (theme.email_settings as Record<string, unknown>) || {};
    await supabase
      .from('communities')
      .update({
        theme: {
          ...theme,
          email_settings: { ...emailSettings, sending_mode: 'custom_domain' },
        },
      })
      .eq('id', communityId);

    return NextResponse.json({
      domain,
      dnsRecords: resendDomain.records || [],
    });
  } catch (error) {
    console.error('Domain creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/email/domains
 * Remove the custom domain for a community.
 * Body: { communityId }
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

    if (
      !member ||
      !['board', 'manager', 'super_admin'].includes(member.system_role)
    ) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Get existing domain
    const { data: domain } = await supabase
      .from('community_email_domains')
      .select('id, resend_domain_id')
      .eq('community_id', communityId)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json({ error: 'No domain configured' }, { status: 404 });
    }

    // Remove from Resend
    const resend = getResendClient();
    await resend.domains.remove(domain.resend_domain_id).catch((err) => {
      console.error('Resend domain removal failed:', err);
    });

    // Delete from DB (cascades to email_addresses)
    await supabase.from('community_email_domains').delete().eq('id', domain.id);

    // Reset community email settings to default
    const { data: community } = await supabase
      .from('communities')
      .select('theme')
      .eq('id', communityId)
      .single();

    const theme = (community?.theme as Record<string, unknown>) || {};
    const emailSettings = (theme.email_settings as Record<string, unknown>) || {};
    await supabase
      .from('communities')
      .update({
        theme: {
          ...theme,
          email_settings: {
            ...emailSettings,
            sending_mode: 'default',
          },
        },
      })
      .eq('id', communityId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Domain deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
