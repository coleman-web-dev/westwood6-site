'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { postManualWalletCredit } from '@/lib/utils/accounting-entries';

const IMPORT_DESCRIPTION_PREFIX = 'Wallet balance imported from previous system';

export interface WalletImportRow {
  unitId: string;
  address: string;
  household: string;
  amountCents: number; // positive = credit
  description: string;
}

export interface WalletImportResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: string[];
  details: {
    address: string;
    household: string;
    amountCents: number;
    status: 'credited' | 'skipped_zero' | 'error';
    error?: string;
  }[];
}

/**
 * Bulk import wallet balances for a community.
 * Creates wallet transactions and GL entries for each unit.
 * Only processes positive balances (credits). Skips zero/negative.
 */
export async function importWalletBalances(
  communityId: string,
  rows: WalletImportRow[]
): Promise<WalletImportResult> {
  // Auth check
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { success: false, processed: 0, skipped: 0, errors: ['Authentication required'], details: [] };
  }

  const admin = createAdminClient();

  // Verify caller is board member for this community
  const { data: member } = await admin
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return { success: false, processed: 0, skipped: 0, errors: ['Board access required'], details: [] };
  }

  const result: WalletImportResult = {
    success: true,
    processed: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  for (const row of rows) {
    // Skip zero or negative
    if (row.amountCents <= 0) {
      result.skipped++;
      result.details.push({
        address: row.address,
        household: row.household,
        amountCents: row.amountCents,
        status: 'skipped_zero',
      });
      continue;
    }

    try {
      // Insert wallet transaction
      const { error: txError } = await admin.from('wallet_transactions').insert({
        unit_id: row.unitId,
        community_id: communityId,
        member_id: member.id,
        amount: row.amountCents,
        type: 'manual_credit',
        description: row.description || IMPORT_DESCRIPTION_PREFIX,
        created_by: member.id,
      });

      if (txError) {
        result.errors.push(`${row.address}: ${txError.message}`);
        result.details.push({
          address: row.address,
          household: row.household,
          amountCents: row.amountCents,
          status: 'error',
          error: txError.message,
        });
        continue;
      }

      // Update wallet balance atomically
      const { error: walletError } = await admin.rpc('increment_wallet_balance', {
        p_unit_id: row.unitId,
        p_community_id: communityId,
        p_amount: row.amountCents,
      });

      if (walletError) {
        result.errors.push(`${row.address}: wallet update failed - ${walletError.message}`);
        result.details.push({
          address: row.address,
          household: row.household,
          amountCents: row.amountCents,
          status: 'error',
          error: walletError.message,
        });
        continue;
      }

      // GL posting (fire-and-forget)
      void postManualWalletCredit(
        communityId,
        row.unitId,
        row.amountCents,
        row.description || IMPORT_DESCRIPTION_PREFIX
      );

      result.processed++;
      result.details.push({
        address: row.address,
        household: row.household,
        amountCents: row.amountCents,
        status: 'credited',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`${row.address}: ${msg}`);
      result.details.push({
        address: row.address,
        household: row.household,
        amountCents: row.amountCents,
        status: 'error',
        error: msg,
      });
    }
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

// ─── Undo Import ────────────────────────────────────

export interface PreviousImportInfo {
  found: boolean;
  count: number;
  totalCents: number;
  importedAt: string | null;
}

/**
 * Check if a previous wallet import exists for this community.
 */
export async function checkPreviousWalletImport(
  communityId: string
): Promise<PreviousImportInfo> {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { found: false, count: 0, totalCents: 0, importedAt: null };
  }

  const admin = createAdminClient();

  const { data: txns } = await admin
    .from('wallet_transactions')
    .select('id, amount, created_at')
    .eq('community_id', communityId)
    .eq('type', 'manual_credit')
    .like('description', `${IMPORT_DESCRIPTION_PREFIX}%`)
    .order('created_at', { ascending: true });

  if (!txns || txns.length === 0) {
    return { found: false, count: 0, totalCents: 0, importedAt: null };
  }

  return {
    found: true,
    count: txns.length,
    totalCents: txns.reduce((s, t) => s + (t.amount || 0), 0),
    importedAt: txns[0].created_at,
  };
}

export interface UndoImportResult {
  success: boolean;
  reversed: number;
  errors: string[];
}

/**
 * Undo a previous wallet balance import.
 * Reverses all wallet transactions from the import, resets balances,
 * and deletes related GL journal entries.
 */
export async function undoWalletImport(
  communityId: string
): Promise<UndoImportResult> {
  // Auth check
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { success: false, reversed: 0, errors: ['Authentication required'] };
  }

  const admin = createAdminClient();

  // Verify board
  const { data: member } = await admin
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return { success: false, reversed: 0, errors: ['Board access required'] };
  }

  // Find all import transactions
  const { data: txns, error: findError } = await admin
    .from('wallet_transactions')
    .select('id, unit_id, amount')
    .eq('community_id', communityId)
    .eq('type', 'manual_credit')
    .like('description', `${IMPORT_DESCRIPTION_PREFIX}%`);

  if (findError) {
    return { success: false, reversed: 0, errors: [findError.message] };
  }

  if (!txns || txns.length === 0) {
    return { success: false, reversed: 0, errors: ['No previous import found'] };
  }

  const result: UndoImportResult = { success: true, reversed: 0, errors: [] };

  // Reverse each transaction
  for (const tx of txns) {
    try {
      // Decrement wallet balance by the original credit amount
      const { error: walletError } = await admin.rpc('increment_wallet_balance', {
        p_unit_id: tx.unit_id,
        p_community_id: communityId,
        p_amount: -(tx.amount || 0), // negate to reverse
      });

      if (walletError) {
        result.errors.push(`Unit ${tx.unit_id}: balance reversal failed - ${walletError.message}`);
        continue;
      }

      // Delete the wallet transaction
      const { error: delError } = await admin
        .from('wallet_transactions')
        .delete()
        .eq('id', tx.id);

      if (delError) {
        result.errors.push(`Unit ${tx.unit_id}: transaction delete failed - ${delError.message}`);
        continue;
      }

      result.reversed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Unit ${tx.unit_id}: ${msg}`);
    }
  }

  // Delete related GL journal entries (wallet_credit source, with import description)
  const { error: glError } = await admin
    .from('journal_entries')
    .delete()
    .eq('community_id', communityId)
    .eq('source', 'wallet_credit')
    .like('description', `Manual wallet credit: ${IMPORT_DESCRIPTION_PREFIX}%`);

  if (glError) {
    result.errors.push(`GL cleanup: ${glError.message}`);
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}
