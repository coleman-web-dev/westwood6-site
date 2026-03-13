import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';

/**
 * POST /api/email/domains/verify
 * Trigger DNS verification for a community's custom domain.
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

    // Get domain
    const { data: domain } = await supabase
      .from('community_email_domains')
      .select('id, resend_domain_id')
      .eq('community_id', communityId)
      .maybeSingle();

    if (!domain) {
      return NextResponse.json({ error: 'No domain configured' }, { status: 404 });
    }

    const resend = getResendClient();

    // Trigger verification
    await resend.domains.verify(domain.resend_domain_id);

    // Fetch updated status
    const { data: domainInfo, error: fetchError } = await resend.domains.get(
      domain.resend_domain_id,
    );

    if (fetchError || !domainInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch domain status' },
        { status: 502 },
      );
    }

    const isVerified = domainInfo.status === 'verified';

    // Update local DB
    await supabase
      .from('community_email_domains')
      .update({
        status: domainInfo.status,
        dns_records: domainInfo.records || [],
        is_active: isVerified,
        last_verified_at: isVerified ? new Date().toISOString() : undefined,
      })
      .eq('id', domain.id);

    return NextResponse.json({
      status: domainInfo.status,
      records: domainInfo.records || [],
      isVerified,
    });
  } catch (error) {
    console.error('Domain verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
