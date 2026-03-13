import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';

/**
 * GET /api/email/domains/status?communityId=xxx
 * Get the current status of a community's email domain, refreshed from Resend.
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

    // Get domain
    const { data: domain } = await supabase
      .from('community_email_domains')
      .select('*')
      .eq('community_id', communityId)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json({ domain: null });
    }

    // If domain is custom and not yet verified, refresh from Resend
    if (domain.domain_type === 'custom' && domain.status !== 'verified') {
      try {
        const resend = getResendClient();
        const { data: domainInfo } = await resend.domains.get(domain.resend_domain_id);

        if (domainInfo) {
          const isVerified = domainInfo.status === 'verified';
          const updates: Record<string, unknown> = {
            status: domainInfo.status,
            dns_records: domainInfo.records || [],
            is_active: isVerified,
          };
          if (isVerified) {
            updates.last_verified_at = new Date().toISOString();
          }

          await supabase
            .from('community_email_domains')
            .update(updates)
            .eq('id', domain.id);

          // Return fresh data
          return NextResponse.json({
            domain: {
              ...domain,
              status: domainInfo.status,
              dns_records: domainInfo.records || [],
              is_active: isVerified,
            },
          });
        }
      } catch {
        // Resend fetch failed, return cached data
      }
    }

    // Get associated addresses
    const { data: addresses } = await supabase
      .from('email_addresses')
      .select('*')
      .eq('domain_id', domain.id)
      .order('is_default', { ascending: false });

    return NextResponse.json({ domain, addresses: addresses || [] });
  } catch (error) {
    console.error('Domain status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
