'use server';

import {
  postInvoiceCreated,
  postInvoiceWaived,
  postInvoiceVoided,
  postPaymentReceived,
  postWalletApplied,
  reverseJournalEntry,
} from '@/lib/utils/accounting-entries';
import { createAdminClient } from '@/lib/supabase/admin';

/** Post journal entry when an invoice is created (called from client component) */
export async function postInvoiceCreatedAction(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
  isSpecial = false,
) {
  try {
    await postInvoiceCreated(communityId, invoiceId, unitId, amount, description, isSpecial);
    return { success: true };
  } catch (error) {
    console.error('Failed to post invoice created journal entry:', error);
    return { success: false };
  }
}

/** Post journal entry when an invoice is waived (called from client component) */
export async function postInvoiceWaivedAction(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  try {
    await postInvoiceWaived(communityId, invoiceId, unitId, amount, description);
    return { success: true };
  } catch (error) {
    console.error('Failed to post invoice waived journal entry:', error);
    return { success: false };
  }
}

/** Post journal entry when an invoice is voided (called from client component) */
export async function postInvoiceVoidedAction(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  try {
    await postInvoiceVoided(communityId, invoiceId, unitId, amount, description);
    return { success: true };
  } catch (error) {
    console.error('Failed to post invoice voided journal entry:', error);
    return { success: false };
  }
}

/** Post journal entry when wallet is applied to invoice (called from client component) */
export async function postWalletAppliedAction(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
) {
  try {
    await postWalletApplied(communityId, invoiceId, unitId, amount);
    return { success: true };
  } catch (error) {
    console.error('Failed to post wallet applied journal entry:', error);
    return { success: false };
  }
}

/** Reverse a journal entry (called from client component) */
export async function reverseJournalEntryAction(
  communityId: string,
  entryId: string,
  reason?: string,
) {
  try {
    const reversalId = await reverseJournalEntry(communityId, entryId, reason);
    if (!reversalId) return { success: false, error: 'Entry not found or already reversed' };
    return { success: true, reversalId };
  } catch (error) {
    console.error('Failed to reverse journal entry:', error);
    return { success: false, error: 'Failed to reverse entry' };
  }
}

/** Seed the default chart of accounts for a community */
export async function seedChartOfAccountsAction(communityId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc('seed_default_chart_of_accounts', {
      p_community_id: communityId,
    });
    if (error) {
      console.error('Failed to seed chart of accounts:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to seed chart of accounts:', error);
    return { success: false, error: 'Failed to seed accounts' };
  }
}

/** Post manual journal entry from the UI */
export async function postManualJournalEntryAction(params: {
  communityId: string;
  entryDate: string;
  description: string;
  memo?: string;
  createdBy?: string;
  lines: { accountCode: string; debit: number; credit: number; description?: string }[];
}) {
  try {
    const { createJournalEntry } = await import('@/lib/utils/accounting-entries');
    const entryId = await createJournalEntry({
      communityId: params.communityId,
      entryDate: params.entryDate,
      description: params.description,
      source: 'manual',
      memo: params.memo,
      createdBy: params.createdBy,
      lines: params.lines,
    });
    if (!entryId) return { success: false, error: 'Failed to create entry. Ensure debits equal credits.' };
    return { success: true, entryId };
  } catch (error) {
    console.error('Failed to create manual journal entry:', error);
    return { success: false, error: 'Failed to create entry' };
  }
}

/** Post payment received from manual mark-as-paid */
export async function postPaymentReceivedAction(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  try {
    await postPaymentReceived(communityId, invoiceId, unitId, amount, description);
    return { success: true };
  } catch (error) {
    console.error('Failed to post payment received journal entry:', error);
    return { success: false };
  }
}
