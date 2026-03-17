import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient } from '@/lib/email/resend';

export const runtime = 'nodejs';

/**
 * POST /api/email/smtp-credentials
 * Generate a domain-scoped Resend API key for a role address.
 * Board members use this key to configure Gmail/Outlook "Send mail as".
 * The key is returned ONCE and cannot be retrieved again.
 *
 * Body: { addressId, communityId }
 */
export async function POST(req: NextRequest) {
  try {
    const { addressId, communityId } = await req.json();

    if (!addressId || !communityId) {
      return NextResponse.json(
        { error: 'addressId and communityId are required' },
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

    // Get the email address with domain info
    const { data: emailAddr } = await supabase
      .from('email_addresses')
      .select('id, address, community_id, domain_id, assigned_to, smtp_resend_key_id')
      .eq('id', addressId)
      .eq('community_id', communityId)
      .single();

    if (!emailAddr) {
      return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
    }

    // Get the domain to verify it's a custom domain with Resend domain ID
    const { data: domain } = await supabase
      .from('community_email_domains')
      .select('id, resend_domain_id, domain_type, status, is_active')
      .eq('id', emailAddr.domain_id)
      .single();

    if (!domain) {
      return NextResponse.json({ error: 'Email domain not found' }, { status: 404 });
    }

    if (domain.domain_type !== 'custom') {
      return NextResponse.json(
        { error: 'SMTP credentials are only available for custom domains. DuesIQ subdomain addresses use the dashboard for sending.' },
        { status: 400 }
      );
    }

    if (!domain.is_active || domain.status !== 'verified') {
      return NextResponse.json(
        { error: 'Domain must be verified before generating SMTP credentials' },
        { status: 400 }
      );
    }

    const resend = getResendClient();

    // Revoke existing key if present
    if (emailAddr.smtp_resend_key_id) {
      try {
        await resend.apiKeys.remove(emailAddr.smtp_resend_key_id);
      } catch (err) {
        // Key may already be deleted, continue
        console.warn('Failed to revoke old SMTP key:', err);
      }
    }

    // Create a new domain-scoped API key
    const { data: apiKey, error: keyError } = await resend.apiKeys.create({
      name: `${emailAddr.address} SMTP`,
      permission: 'sending_access',
      domain_id: domain.resend_domain_id,
    });

    if (keyError || !apiKey) {
      console.error('Failed to create Resend API key:', keyError);
      return NextResponse.json(
        { error: 'Failed to generate SMTP credentials. Please try again.' },
        { status: 500 }
      );
    }

    // Store the key ID (NOT the key itself) for future revocation
    await supabase
      .from('email_addresses')
      .update({
        smtp_resend_key_id: apiKey.id,
        smtp_created_at: new Date().toISOString(),
        smtp_created_for_member_id: emailAddr.assigned_to || callerMember.id,
      })
      .eq('id', addressId);

    // Auto-upgrade to full_inbox if not already
    await supabase
      .from('email_addresses')
      .update({ mailbox_type: 'full_inbox' })
      .eq('id', addressId);

    // Auto-grant inbox access to the assigned member if not already granted
    const targetMemberId = emailAddr.assigned_to || callerMember.id;
    await supabase
      .from('email_inbox_access')
      .upsert(
        {
          community_id: communityId,
          email_address_id: addressId,
          member_id: targetMemberId,
          can_read: true,
          can_reply: true,
          can_compose: true,
          notify_forward: true,
        },
        { onConflict: 'email_address_id,member_id' }
      );

    return NextResponse.json({
      smtp: {
        server: 'smtp.resend.com',
        port: 587,
        username: 'resend',
        password: apiKey.token,
        encryption: 'STARTTLS',
      },
      address: emailAddr.address,
      keyId: apiKey.id,
    });
  } catch (error) {
    console.error('SMTP credential generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/email/smtp-credentials
 * Revoke SMTP credentials for a role address.
 *
 * Body: { addressId, communityId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { addressId, communityId } = await req.json();

    if (!addressId || !communityId) {
      return NextResponse.json(
        { error: 'addressId and communityId are required' },
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
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Board access required' }, { status: 403 });
    }

    // Get the address
    const { data: emailAddr } = await supabase
      .from('email_addresses')
      .select('id, smtp_resend_key_id')
      .eq('id', addressId)
      .eq('community_id', communityId)
      .single();

    if (!emailAddr) {
      return NextResponse.json({ error: 'Email address not found' }, { status: 404 });
    }

    // Revoke the key via Resend
    if (emailAddr.smtp_resend_key_id) {
      const resend = getResendClient();
      try {
        await resend.apiKeys.remove(emailAddr.smtp_resend_key_id);
      } catch (err) {
        console.warn('Failed to revoke SMTP key:', err);
      }
    }

    // Clear credential tracking
    await supabase
      .from('email_addresses')
      .update({
        smtp_resend_key_id: null,
        smtp_created_at: null,
        smtp_created_for_member_id: null,
      })
      .eq('id', addressId);

    return NextResponse.json({ status: 'revoked' });
  } catch (error) {
    console.error('SMTP credential revocation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
