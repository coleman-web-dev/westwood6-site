import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlaidClient } from '@/lib/plaid';

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

    const admin = createAdminClient();

    // Get connection
    const { data: connection } = await admin
      .from('plaid_connections')
      .select('plaid_access_token')
      .eq('id', connectionId)
      .eq('community_id', communityId)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Remove item from Plaid
    try {
      const plaid = getPlaidClient();
      await plaid.itemRemove({
        access_token: connection.plaid_access_token,
      });
    } catch {
      // Plaid item may already be removed, continue with local cleanup
    }

    // Soft-delete: deactivate connection and its accounts
    await admin
      .from('plaid_connections')
      .update({ is_active: false })
      .eq('id', connectionId);

    await admin
      .from('plaid_bank_accounts')
      .update({ is_active: false })
      .eq('plaid_connection_id', connectionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
