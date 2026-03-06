import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlaidClient } from '@/lib/plaid';
import { applyCategorization } from '@/lib/utils/bank-categorization';
import { autoMatchTransactions } from '@/lib/utils/bank-matching';

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
      .select('*')
      .eq('id', connectionId)
      .eq('community_id', communityId)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Get bank accounts for this connection
    const { data: bankAccounts } = await admin
      .from('plaid_bank_accounts')
      .select('id, plaid_account_id')
      .eq('plaid_connection_id', connectionId)
      .eq('is_active', true);

    const accountMap = new Map(
      (bankAccounts || []).map((a) => [a.plaid_account_id, a.id]),
    );

    const plaid = getPlaidClient();

    // Cursor-based sync
    let cursor = connection.last_sync_cursor || undefined;
    let hasMore = true;
    let added = 0;
    let modified = 0;
    let removed = 0;

    while (hasMore) {
      const response = await plaid.transactionsSync({
        access_token: connection.plaid_access_token,
        cursor,
      });

      const { added: newTxns, modified: modTxns, removed: removedTxns } = response.data;

      // Insert new transactions
      if (newTxns.length > 0) {
        const inserts = newTxns
          .filter((t) => accountMap.has(t.account_id))
          .map((t) => ({
            community_id: communityId,
            plaid_bank_account_id: accountMap.get(t.account_id)!,
            plaid_transaction_id: t.transaction_id,
            date: t.date,
            name: t.name,
            merchant_name: t.merchant_name || null,
            // Plaid amounts: positive = money leaving account (debit), negative = money entering (credit)
            // Store in cents
            amount: Math.round(t.amount * 100),
          }));

        if (inserts.length > 0) {
          await admin.from('bank_transactions').upsert(inserts, {
            onConflict: 'plaid_transaction_id',
          });
          added += inserts.length;
        }
      }

      // Update modified transactions
      for (const t of modTxns) {
        if (!accountMap.has(t.account_id)) continue;
        await admin
          .from('bank_transactions')
          .update({
            date: t.date,
            name: t.name,
            merchant_name: t.merchant_name || null,
            amount: Math.round(t.amount * 100),
          })
          .eq('plaid_transaction_id', t.transaction_id);
        modified++;
      }

      // Remove deleted transactions
      for (const t of removedTxns) {
        await admin
          .from('bank_transactions')
          .delete()
          .eq('plaid_transaction_id', t.transaction_id)
          .eq('status', 'pending'); // Only delete if not yet processed
        removed++;
      }

      cursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    // Update sync cursor and timestamp
    await admin
      .from('plaid_connections')
      .update({
        last_sync_cursor: cursor,
        last_synced_at: new Date().toISOString(),
        error_code: null,
      })
      .eq('id', connectionId);

    // Update account balances
    const balancesResponse = await plaid.accountsGet({
      access_token: connection.plaid_access_token,
    });

    for (const account of balancesResponse.data.accounts) {
      const bankAccountId = accountMap.get(account.account_id);
      if (!bankAccountId) continue;
      await admin
        .from('plaid_bank_accounts')
        .update({
          current_balance: account.balances.current
            ? Math.round(account.balances.current * 100)
            : null,
          available_balance: account.balances.available
            ? Math.round(account.balances.available * 100)
            : null,
        })
        .eq('id', bankAccountId);
    }

    // Auto-categorize new pending transactions
    await applyCategorization(admin, communityId);

    // Auto-match transactions to journal entries
    await autoMatchTransactions(admin, communityId);

    return NextResponse.json({
      added,
      modified,
      removed,
      synced_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Error syncing transactions:', error);

    // Handle Plaid DTM consent error
    const plaidError = error as { response?: { data?: { error_code?: string } } };
    if (plaidError?.response?.data?.error_code === 'ADDITIONAL_CONSENT_REQUIRED') {
      // Mark connection as needing re-consent
      const { communityId, connectionId } = await request.clone().json();
      const admin = createAdminClient();
      await admin
        .from('plaid_connections')
        .update({
          requires_reconsent: true,
          error_code: 'ADDITIONAL_CONSENT_REQUIRED',
        })
        .eq('id', connectionId)
        .eq('community_id', communityId);

      return NextResponse.json(
        {
          error: 'Additional consent required',
          error_code: 'ADDITIONAL_CONSENT_REQUIRED',
          message: 'This bank connection requires updated data consent. Please reconnect using the "Update Consent" button.',
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ error: 'Failed to sync transactions' }, { status: 500 });
  }
}
