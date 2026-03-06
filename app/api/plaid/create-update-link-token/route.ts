import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlaidClient } from '@/lib/plaid';
import { CountryCode, Products } from 'plaid';

/**
 * Creates a Link token in update mode for re-consent (DTM).
 * Used when ADDITIONAL_CONSENT_REQUIRED is returned by Plaid.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, connectionId } = await request.json();
    if (!communityId || !connectionId) {
      return NextResponse.json(
        { error: 'communityId and connectionId are required' },
        { status: 400 },
      );
    }

    // Verify board member
    const { data: member } = await supabase
      .from('members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single();

    if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the connection's access token
    const admin = createAdminClient();
    const { data: connection } = await admin
      .from('plaid_connections')
      .select('plaid_access_token')
      .eq('id', connectionId)
      .eq('community_id', communityId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const plaid = getPlaidClient();

    // Create Link token in update mode with additional consented products
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'DuesIQ',
      access_token: connection.plaid_access_token,
      country_codes: [CountryCode.Us],
      language: 'en',
      // Request consent for transactions in the update flow
      additional_consented_products: [Products.Transactions],
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating update link token:', error);
    return NextResponse.json({ error: 'Failed to create update link token' }, { status: 500 });
  }
}
