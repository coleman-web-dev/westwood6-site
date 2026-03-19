'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { postManualWalletCredit } from '@/lib/utils/accounting-entries';

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
        description: row.description || 'Wallet balance import from previous system',
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
        row.description || 'Wallet balance import from previous system'
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
