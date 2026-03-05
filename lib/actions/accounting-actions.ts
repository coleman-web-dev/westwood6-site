'use server';

import {
  postInvoiceCreated,
  postInvoiceWaived,
  postInvoiceVoided,
  postPaymentReceived,
  postWalletApplied,
  postVendorPayment,
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

/** Seed the default HOA chart of accounts for a community */
export async function seedChartOfAccountsAction(communityId: string) {
  try {
    const supabase = createAdminClient();

    // Check if accounts already exist
    const { count } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .limit(1);

    if (count && count > 0) {
      return { success: true };
    }

    const accounts = [
      // ASSETS (1000s)
      { code: '1000', name: 'Operating Cash', account_type: 'asset', fund: 'operating', is_system: true, normal_balance: 'debit', display_order: 100 },
      { code: '1010', name: 'Reserve Cash', account_type: 'asset', fund: 'reserve', is_system: true, normal_balance: 'debit', display_order: 110 },
      { code: '1100', name: 'Accounts Receivable - Dues', account_type: 'asset', fund: 'operating', is_system: true, normal_balance: 'debit', display_order: 120 },
      { code: '1110', name: 'Accounts Receivable - Special Assessments', account_type: 'asset', fund: 'operating', is_system: true, normal_balance: 'debit', display_order: 130 },
      { code: '1200', name: 'Prepaid Expenses', account_type: 'asset', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 140 },
      { code: '1300', name: 'Amenity Deposits Held', account_type: 'asset', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 150 },

      // LIABILITIES (2000s)
      { code: '2000', name: 'Accounts Payable', account_type: 'liability', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 200 },
      { code: '2100', name: 'Homeowner Prepayments', account_type: 'liability', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 210 },
      { code: '2110', name: 'Homeowner Wallet Credits', account_type: 'liability', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 220 },
      { code: '2200', name: 'Amenity Deposits Payable', account_type: 'liability', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 230 },
      { code: '2300', name: 'Accrued Expenses', account_type: 'liability', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 240 },

      // EQUITY (3000s)
      { code: '3000', name: 'Operating Fund Balance', account_type: 'equity', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 300 },
      { code: '3100', name: 'Reserve Fund Balance', account_type: 'equity', fund: 'reserve', is_system: true, normal_balance: 'credit', display_order: 310 },
      { code: '3200', name: 'Retained Earnings', account_type: 'equity', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 320 },

      // REVENUE (4000s)
      { code: '4000', name: 'Assessment Revenue - Regular', account_type: 'revenue', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 400 },
      { code: '4010', name: 'Assessment Revenue - Special', account_type: 'revenue', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 410 },
      { code: '4100', name: 'Late Fee Revenue', account_type: 'revenue', fund: 'operating', is_system: true, normal_balance: 'credit', display_order: 420 },
      { code: '4200', name: 'Amenity Fee Revenue', account_type: 'revenue', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 430 },
      { code: '4300', name: 'Interest Income', account_type: 'revenue', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 440 },
      { code: '4400', name: 'Other Income', account_type: 'revenue', fund: 'operating', is_system: false, normal_balance: 'credit', display_order: 450 },
      { code: '4500', name: 'Reserve Contribution Revenue', account_type: 'revenue', fund: 'reserve', is_system: false, normal_balance: 'credit', display_order: 460 },

      // EXPENSES (5000s)
      { code: '5000', name: 'Maintenance & Repairs', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 500 },
      { code: '5100', name: 'Landscaping', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 510 },
      { code: '5200', name: 'Insurance', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 520 },
      { code: '5300', name: 'Utilities', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 530 },
      { code: '5400', name: 'Management Fees', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 540 },
      { code: '5500', name: 'Legal & Professional', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 550 },
      { code: '5600', name: 'Administrative', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 560 },
      { code: '5700', name: 'Stripe Processing Fees', account_type: 'expense', fund: 'operating', is_system: false, normal_balance: 'debit', display_order: 570 },
      { code: '5800', name: 'Bad Debt Expense', account_type: 'expense', fund: 'operating', is_system: true, normal_balance: 'debit', display_order: 580 },
      { code: '5900', name: 'Reserve Fund Expenses', account_type: 'expense', fund: 'reserve', is_system: false, normal_balance: 'debit', display_order: 590 },
    ].map((a) => ({ ...a, community_id: communityId }));

    // First verify we can access the table at all
    const { error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .limit(0);

    if (checkError) {
      console.error('Accounts table check failed:', checkError);
      return { success: false, error: `Table access failed: ${checkError.message}` };
    }

    const { error } = await supabase.from('accounts').insert(accounts);

    if (error) {
      console.error('Failed to seed chart of accounts:', JSON.stringify(error));
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to seed chart of accounts (exception):', msg);
    return { success: false, error: msg };
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

/** Post journal entry for a vendor payment */
export async function postVendorPaymentAction(params: {
  communityId: string;
  vendorId: string;
  amount: number;
  expenseAccountCode: string;
  description: string;
  entryDate?: string;
  memo?: string;
  createdBy?: string;
}) {
  try {
    const entryId = await postVendorPayment(
      params.communityId,
      params.vendorId,
      params.amount,
      params.expenseAccountCode,
      params.description,
      params.entryDate,
      params.memo,
      params.createdBy,
    );
    if (!entryId) return { success: false, error: 'Failed to create vendor payment entry.' };
    return { success: true, entryId };
  } catch (error) {
    console.error('Failed to post vendor payment journal entry:', error);
    return { success: false, error: 'Failed to record vendor payment' };
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
