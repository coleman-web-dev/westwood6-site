import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlaidClient } from '@/lib/plaid';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { communityId, publicToken, institutionId, institutionName } = await request.json();
    if (!communityId || !publicToken) {
      return NextResponse.json(
        { error: 'communityId and publicToken are required' },
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

    const plaid = getPlaidClient();

    // Exchange public token for access token
    const exchangeResponse = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Fetch Item details for DTM consent data
    let consentedProducts: string[] = [];
    let consentedDataScopes: Record<string, string[]>[] = [];

    try {
      const itemResponse = await plaid.itemGet({ access_token });
      const item = itemResponse.data.item as unknown as Record<string, unknown>;
      consentedProducts = (item.consented_products as string[]) || [];
      consentedDataScopes = (item.consented_data_scopes as Record<string, string[]>[]) || [];
    } catch {
      // DTM fields may not be available yet for all environments
    }

    const admin = createAdminClient();

    // Save connection with consent data
    const hasStatementsConsent = consentedProducts.includes('statements');

    const { data: connection, error: connError } = await admin
      .from('plaid_connections')
      .insert({
        community_id: communityId,
        plaid_item_id: item_id,
        plaid_access_token: access_token,
        institution_id: institutionId || null,
        institution_name: institutionName || null,
        consented_products: consentedProducts,
        consented_data_scopes: consentedDataScopes,
        has_statements_consent: hasStatementsConsent,
      })
      .select()
      .single();

    if (connError) {
      console.error('Error saving connection:', connError);
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
    }

    // Fetch accounts from Plaid
    const accountsResponse = await plaid.accountsGet({
      access_token,
    });

    // Save bank accounts
    const bankAccounts = accountsResponse.data.accounts.map((account) => ({
      plaid_connection_id: connection.id,
      community_id: communityId,
      plaid_account_id: account.account_id,
      name: account.name,
      official_name: account.official_name || null,
      mask: account.mask || null,
      type: account.type,
      subtype: account.subtype || null,
      current_balance: account.balances.current
        ? Math.round(account.balances.current * 100)
        : null,
      available_balance: account.balances.available
        ? Math.round(account.balances.available * 100)
        : null,
    }));

    const { data: savedAccounts, error: acctError } = await admin
      .from('plaid_bank_accounts')
      .insert(bankAccounts)
      .select();

    if (acctError) {
      console.error('Error saving bank accounts:', acctError);
      return NextResponse.json({ error: 'Failed to save bank accounts' }, { status: 500 });
    }

    await logAuditEvent({
      communityId,
      actorId: user.id,
      actorEmail: user.email || null,
      action: 'plaid_connected',
      targetType: 'plaid_connection',
      targetId: connection.id,
      metadata: {
        institution_name: institutionName,
        accounts_count: savedAccounts?.length || 0,
      },
    });

    return NextResponse.json({
      connection,
      accounts: savedAccounts,
    });
  } catch (error: unknown) {
    console.error('Error exchanging token:', error);
    const message = error instanceof Error ? error.message : 'Failed to exchange token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
