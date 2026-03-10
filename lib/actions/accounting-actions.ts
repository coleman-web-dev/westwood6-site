'use server';

import {
  postInvoiceCreated,
  postInvoiceWaived,
  postInvoiceVoided,
  postPaymentReceived,
  postWalletApplied,
  postVendorPayment,
  postInterFundTransfer,
  reverseJournalEntry,
  createJournalEntry,
} from '@/lib/utils/accounting-entries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { DelinquencyRule, RecurringJournalEntry } from '@/lib/types/accounting';

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

// ─── Inter-Fund Transfer ──────────────────────────────────────────

export async function postInterFundTransferAction(params: {
  communityId: string;
  fromFund: 'operating' | 'reserve';
  toFund: 'operating' | 'reserve';
  amount: number;
  description: string;
  entryDate?: string;
  memo?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const entryId = await postInterFundTransfer(
      params.communityId,
      params.fromFund,
      params.toFund,
      params.amount,
      params.description,
      params.entryDate,
      params.memo,
      user?.id,
    );
    if (!entryId) return { success: false, error: 'Failed to create transfer entry.' };
    return { success: true, entryId };
  } catch (error) {
    console.error('Failed to post inter-fund transfer:', error);
    return { success: false, error: 'Failed to create transfer' };
  }
}

// ─── Transaction Split ────────────────────────────────────────────

export async function categorizeTransactionSplitAction(params: {
  communityId: string;
  bankTxnId: string;
  splits: { accountCode: string; amount: number; description?: string }[];
  vendorId?: string;
  entryDate: string;
  description: string;
}) {
  try {
    const admin = createAdminClient();
    const totalAmount = params.splits.reduce((s, sp) => s + sp.amount, 0);

    // Create journal entry with split lines
    const lines = params.splits.map((sp) => ({
      accountCode: sp.accountCode,
      debit: sp.amount,
      credit: 0,
      description: sp.description || undefined,
    }));
    lines.push({ accountCode: '1000', debit: 0, credit: totalAmount, description: 'Operating Cash' });

    const entryId = await createJournalEntry({
      communityId: params.communityId,
      entryDate: params.entryDate,
      description: params.description,
      source: 'bank_sync',
      vendorId: params.vendorId,
      lines,
    });

    if (!entryId) return { success: false, error: 'Failed to create split journal entry.' };

    // Update bank transaction
    await admin
      .from('bank_transactions')
      .update({
        status: 'categorized',
        matched_journal_entry_id: entryId,
        match_method: 'manual',
        categorized_account_id: null,
        vendor_id: params.vendorId || null,
      })
      .eq('id', params.bankTxnId)
      .eq('community_id', params.communityId);

    return { success: true, entryId };
  } catch (error) {
    console.error('Failed to categorize split transaction:', error);
    return { success: false, error: 'Failed to split transaction' };
  }
}

// ─── Recurring Journal Entries ────────────────────────────────────

export async function getRecurringEntries(communityId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('recurring_journal_entries')
    .select('*')
    .eq('community_id', communityId)
    .order('next_run_date');

  if (error) throw new Error(error.message);
  return data as RecurringJournalEntry[];
}

export async function createRecurringEntryAction(params: {
  communityId: string;
  description: string;
  memo?: string;
  frequency: 'monthly' | 'quarterly' | 'annually';
  nextRunDate: string;
  endDate?: string;
  lines: { accountCode: string; debit: number; credit: number; description?: string }[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = createAdminClient();

    const { error } = await admin
      .from('recurring_journal_entries')
      .insert({
        community_id: params.communityId,
        description: params.description,
        memo: params.memo || null,
        frequency: params.frequency,
        next_run_date: params.nextRunDate,
        end_date: params.endDate || null,
        lines: params.lines,
        created_by: user?.id || null,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Failed to create recurring entry:', error);
    return { success: false, error: 'Failed to create recurring entry' };
  }
}

export async function toggleRecurringEntryAction(communityId: string, entryId: string, isActive: boolean) {
  try {
    const admin = createAdminClient();
    await admin
      .from('recurring_journal_entries')
      .update({ is_active: isActive })
      .eq('id', entryId)
      .eq('community_id', communityId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteRecurringEntryAction(communityId: string, entryId: string) {
  try {
    const admin = createAdminClient();
    await admin
      .from('recurring_journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('community_id', communityId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Delinquency Rules ────────────────────────────────────────────

export async function getDelinquencyRules(communityId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('delinquency_rules')
    .select('*')
    .eq('community_id', communityId)
    .order('step_order');

  if (error) throw new Error(error.message);
  return data as DelinquencyRule[];
}

export async function saveDelinquencyRuleAction(params: {
  communityId: string;
  id?: string;
  stepOrder: number;
  daysOverdue: number;
  actionType: string;
  emailSubject: string;
  emailBody: string;
  applyLateFee: boolean;
  lateFeeAmount?: number;
}) {
  try {
    const admin = createAdminClient();
    const row = {
      community_id: params.communityId,
      step_order: params.stepOrder,
      days_overdue: params.daysOverdue,
      action_type: params.actionType,
      email_subject: params.emailSubject,
      email_body: params.emailBody,
      apply_late_fee: params.applyLateFee,
      late_fee_amount: params.lateFeeAmount || null,
    };

    if (params.id) {
      await admin.from('delinquency_rules').update(row).eq('id', params.id).eq('community_id', params.communityId);
    } else {
      await admin.from('delinquency_rules').insert(row);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to save delinquency rule:', error);
    return { success: false, error: 'Failed to save rule' };
  }
}

export async function deleteDelinquencyRuleAction(communityId: string, ruleId: string) {
  try {
    const admin = createAdminClient();
    await admin.from('delinquency_rules').delete().eq('id', ruleId).eq('community_id', communityId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Export ───────────────────────────────────────────────────────

export async function getJournalEntriesForExport(communityId: string, startDate: string, endDate: string) {
  const admin = createAdminClient();

  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date, description, source, status, memo, journal_lines(account_id, debit, credit)')
    .eq('community_id', communityId)
    .eq('status', 'posted')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date');

  if (!entries) return [];

  // Get account map
  const { data: accounts } = await admin
    .from('accounts')
    .select('id, code, name')
    .eq('community_id', communityId);

  const acctMap = new Map((accounts || []).map((a) => [a.id, { code: a.code, name: a.name }]));

  return entries.map((e) => ({
    entry_date: e.entry_date,
    description: e.description,
    source: e.source,
    status: e.status,
    memo: e.memo,
    lines: ((e.journal_lines as unknown as { account_id: string; debit: number; credit: number }[]) || []).map((l) => {
      const acct = acctMap.get(l.account_id) || { code: '????', name: 'Unknown' };
      return { code: acct.code, name: acct.name, debit: l.debit, credit: l.credit };
    }),
  }));
}

// ─── Financial Audit Trail ────────────────────────────────────────

export async function getFinancialAuditTrail(communityId: string, startDate: string, endDate: string) {
  const admin = createAdminClient();

  // Get journal entries as audit trail
  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date, description, source, status, created_by, created_at, posted_at, reversed_by, reversal_of, memo, vendor_id, unit_id')
    .eq('community_id', communityId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('created_at', { ascending: false });

  return entries || [];
}

// ─── Ledger Browser ─────────────────────────────────────────────

export async function getAccountsWithTxnCounts(communityId: string) {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from('accounts')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('display_order');

  if (!accounts || accounts.length === 0) return [];

  // Get posted entry IDs for this community
  const { data: entries } = await admin
    .from('journal_entries')
    .select('id')
    .eq('community_id', communityId)
    .eq('status', 'posted');

  if (!entries || entries.length === 0) {
    return accounts.map((a) => ({ ...a, txn_count: 0 }));
  }

  const entryIds = entries.map((e) => e.id);

  // Get line counts per account
  const { data: lines } = await admin
    .from('journal_lines')
    .select('account_id')
    .in('journal_entry_id', entryIds);

  const countMap = new Map<string, number>();
  for (const line of lines || []) {
    countMap.set(line.account_id, (countMap.get(line.account_id) || 0) + 1);
  }

  return accounts.map((a) => ({
    ...a,
    txn_count: countMap.get(a.id) || 0,
  }));
}

export async function getAccountTransactions(
  communityId: string,
  accountId: string,
  page = 1,
  pageSize = 25,
) {
  const admin = createAdminClient();

  // Get the account for normal balance direction
  const { data: account } = await admin
    .from('accounts')
    .select('normal_balance')
    .eq('id', accountId)
    .single();

  if (!account) return { transactions: [], total: 0 };

  // Get posted entry IDs for this community, ordered by date
  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date, description, source')
    .eq('community_id', communityId)
    .eq('status', 'posted')
    .order('entry_date', { ascending: true });

  if (!entries || entries.length === 0) return { transactions: [], total: 0 };

  const entryIds = entries.map((e) => e.id);
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  // Get all lines for this account in these entries
  const { data: allLines } = await admin
    .from('journal_lines')
    .select('id, journal_entry_id, debit, credit')
    .eq('account_id', accountId)
    .in('journal_entry_id', entryIds);

  if (!allLines || allLines.length === 0) return { transactions: [], total: 0 };

  // Sort by entry date then by line ID for stable ordering
  const sortedLines = allLines.sort((a, b) => {
    const entryA = entryMap.get(a.journal_entry_id);
    const entryB = entryMap.get(b.journal_entry_id);
    const dateCompare = (entryA?.entry_date || '').localeCompare(entryB?.entry_date || '');
    if (dateCompare !== 0) return dateCompare;
    return a.id.localeCompare(b.id);
  });

  // Compute running balances for ALL lines (most recent last)
  let runningBalance = 0;
  const withBalance = sortedLines.map((line) => {
    const entry = entryMap.get(line.journal_entry_id)!;
    if (account.normal_balance === 'debit') {
      runningBalance += line.debit - line.credit;
    } else {
      runningBalance += line.credit - line.debit;
    }
    return {
      line_id: line.id,
      entry_id: line.journal_entry_id,
      entry_date: entry.entry_date,
      description: entry.description,
      source: entry.source,
      debit: line.debit,
      credit: line.credit,
      running_balance: runningBalance,
    };
  });

  // Reverse for display (most recent first) then paginate
  const reversed = withBalance.reverse();
  const total = reversed.length;
  const start = (page - 1) * pageSize;
  const transactions = reversed.slice(start, start + pageSize);

  return { transactions, total };
}

// ─── Chart of Accounts (all accounts including inactive) ─────────

export async function getAllAccounts(communityId: string) {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from('accounts')
    .select('*')
    .eq('community_id', communityId)
    .order('display_order');

  return (accounts as import('@/lib/types/accounting').Account[]) || [];
}
