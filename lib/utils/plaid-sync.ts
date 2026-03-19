import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlaidClient } from '@/lib/plaid';
import { applyCategorization } from '@/lib/utils/bank-categorization';
import { categorizeAndApplyAI } from '@/lib/ai/categorize-transactions';
import { autoMatchTransactions } from '@/lib/utils/bank-matching';
import { fetchAndProcessStatements } from '@/lib/utils/plaid-statements';

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  ai_categorized: number;
  ai_suggested: number;
  synced_at: string;
  error?: string;
  error_code?: string;
  debug?: {
    cursor_was_null: boolean;
    plaid_raw_added: number;
    plaid_raw_modified: number;
    plaid_raw_removed: number;
    active_bank_accounts: number;
    plaid_account_ids_seen: string[];
    mapped_account_ids: string[];
    pages_fetched: number;
  };
}

/**
 * Core bank transaction sync logic. Calls Plaid transactionsSync with cursor-based
 * pagination, auto-categorizes, and optionally fetches statements.
 *
 * Used by both the manual sync endpoint and the daily cron.
 */
export async function syncBankTransactions(
  admin: SupabaseClient,
  communityId: string,
  connectionId: string,
): Promise<SyncResult> {
  // Get connection
  const { data: connection } = await admin
    .from('plaid_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('community_id', communityId)
    .single();

  if (!connection) {
    return { added: 0, modified: 0, removed: 0, ai_categorized: 0, ai_suggested: 0, synced_at: '', error: 'Connection not found' };
  }

  // Get bank accounts for this connection
  const { data: bankAccounts } = await admin
    .from('plaid_bank_accounts')
    .select('id, plaid_account_id')
    .eq('plaid_connection_id', connectionId)
    .eq('is_active', true);

  const accountMap = new Map(
    (bankAccounts || []).map((a: { plaid_account_id: string; id: string }) => [a.plaid_account_id, a.id]),
  );

  const plaid = getPlaidClient();

  // Cursor-based sync
  let cursor = connection.last_sync_cursor || undefined;
  const cursorWasNull = !cursor;
  let hasMore = true;
  let added = 0;
  let modified = 0;
  let removed = 0;
  let plaidRawAdded = 0;
  let plaidRawModified = 0;
  let plaidRawRemoved = 0;
  const plaidAccountIdsSeen = new Set<string>();
  let pagesFetched = 0;

  try {
    while (hasMore) {
      const response = await plaid.transactionsSync({
        access_token: connection.plaid_access_token,
        cursor,
      });

      pagesFetched++;
      const { added: newTxns, modified: modTxns, removed: removedTxns } = response.data;
      plaidRawAdded += newTxns.length;
      plaidRawModified += modTxns.length;
      plaidRawRemoved += removedTxns.length;

      // Track which Plaid account IDs we see
      for (const t of newTxns) plaidAccountIdsSeen.add(t.account_id);
      for (const t of modTxns) plaidAccountIdsSeen.add(t.account_id);

      console.log(`[plaid-sync] page=${pagesFetched} cursor_null=${cursorWasNull} added=${newTxns.length} modified=${modTxns.length} removed=${removedTxns.length} has_more=${response.data.has_more}`);

      // Insert new transactions
      if (newTxns.length > 0) {
        const inserts = newTxns
          .filter((t) => accountMap.has(t.account_id))
          .map((t) => {
            // Extract logo from counterparties or top-level
            const txnAny = t as unknown as Record<string, unknown>;
            const counterparties = txnAny.counterparties as { logo_url?: string | null }[] | undefined;
            const logoUrl =
              (txnAny.logo_url as string) ||
              counterparties?.[0]?.logo_url ||
              null;
            const pfc = txnAny.personal_finance_category as { primary?: string } | undefined;

            return {
              community_id: communityId,
              plaid_bank_account_id: accountMap.get(t.account_id)!,
              plaid_transaction_id: t.transaction_id,
              date: t.date,
              name: t.name,
              merchant_name: t.merchant_name || null,
              // Plaid amounts: positive = money leaving account (debit), negative = money entering (credit)
              // Store in cents
              amount: Math.round(t.amount * 100),
              logo_url: logoUrl,
              plaid_category: pfc?.primary || null,
            };
          });

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
        const txnAny = t as unknown as Record<string, unknown>;
        const counterparties = txnAny.counterparties as { logo_url?: string | null }[] | undefined;
        const logoUrl =
          (txnAny.logo_url as string) ||
          counterparties?.[0]?.logo_url ||
          null;
        const pfc = txnAny.personal_finance_category as { primary?: string } | undefined;

        await admin
          .from('bank_transactions')
          .update({
            date: t.date,
            name: t.name,
            merchant_name: t.merchant_name || null,
            amount: Math.round(t.amount * 100),
            logo_url: logoUrl,
            plaid_category: pfc?.primary || null,
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

    // Auto-categorize new pending transactions (rule-based, fast + free)
    await applyCategorization(admin, communityId);

    // Auto-match transactions to journal entries (fast)
    await autoMatchTransactions(admin, communityId);

    // Fire-and-forget: AI categorization + statement fetch run in background
    // so the sync response returns quickly
    categorizeAndApplyAI(admin, communityId).catch((aiError) => {
      console.error('AI categorization failed (non-fatal):', aiError);
    });

    if (connection.has_statements_consent) {
      fetchAndProcessStatements(communityId, connectionId).catch((err) => {
        console.error('Statement fetch failed (non-fatal):', err);
      });
    }

    return {
      added,
      modified,
      removed,
      ai_categorized: 0, // AI runs in background, count not available immediately
      ai_suggested: 0,
      synced_at: new Date().toISOString(),
      debug: {
        cursor_was_null: cursorWasNull,
        plaid_raw_added: plaidRawAdded,
        plaid_raw_modified: plaidRawModified,
        plaid_raw_removed: plaidRawRemoved,
        active_bank_accounts: accountMap.size,
        plaid_account_ids_seen: Array.from(plaidAccountIdsSeen),
        mapped_account_ids: Array.from(accountMap.keys()),
        pages_fetched: pagesFetched,
      },
    };
  } catch (error: unknown) {
    // Handle Plaid DTM consent error
    const plaidError = error as { response?: { data?: { error_code?: string } } };
    if (plaidError?.response?.data?.error_code === 'ADDITIONAL_CONSENT_REQUIRED') {
      await admin
        .from('plaid_connections')
        .update({
          requires_reconsent: true,
          error_code: 'ADDITIONAL_CONSENT_REQUIRED',
        })
        .eq('id', connectionId)
        .eq('community_id', communityId);

      return {
        added: 0,
        modified: 0,
        removed: 0,
        ai_categorized: 0,
        ai_suggested: 0,
        synced_at: '',
        error: 'Additional consent required',
        error_code: 'ADDITIONAL_CONSENT_REQUIRED',
      };
    }

    throw error;
  }
}
