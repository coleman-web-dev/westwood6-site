import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/email/domains/subdomain
 * Activate a DuesIQ subdomain address for a community.
 * No DNS setup needed since we own duesiq.com.
 * Body: { communityId }
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

    // Get community slug for the address
    const { data: community } = await supabase
      .from('communities')
      .select('slug, theme')
      .eq('id', communityId)
      .single();

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const subdomainAddress = `${community.slug}@duesiq.com`;

    // Check if community already has a custom domain (can't have both)
    const { data: existingDomain } = await supabase
      .from('community_email_domains')
      .select('id, domain_type')
      .eq('community_id', communityId)
      .maybeSingle();

    if (existingDomain?.domain_type === 'custom') {
      return NextResponse.json(
        { error: 'Remove your custom domain first before switching to a DuesIQ subdomain' },
        { status: 409 },
      );
    }

    // Create or update the subdomain domain record
    if (existingDomain) {
      // Already has a subdomain entry, just update settings
      await supabase
        .from('community_email_domains')
        .update({
          status: 'verified',
          is_active: true,
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', existingDomain.id);
    } else {
      // Create new subdomain domain record
      const { data: domain } = await supabase
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

      if (domain) {
        // Create the default address
        await supabase.from('email_addresses').insert({
          community_id: communityId,
          domain_id: domain.id,
          address: subdomainAddress,
          address_type: 'community',
          is_default: true,
        });
      }
    }

    // Update community email settings
    const theme = (community.theme as Record<string, unknown>) || {};
    const emailSettings = (theme.email_settings as Record<string, unknown>) || {};
    await supabase
      .from('communities')
      .update({
        theme: {
          ...theme,
          email_settings: {
            ...emailSettings,
            sending_mode: 'subdomain',
            subdomain_address: subdomainAddress,
          },
        },
      })
      .eq('id', communityId);

    return NextResponse.json({
      address: subdomainAddress,
      sending_mode: 'subdomain',
    });
  } catch (error) {
    console.error('Subdomain setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
