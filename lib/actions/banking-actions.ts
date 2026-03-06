'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/actions/auth-guard';

export async function categorizeTransaction(
  communityId: string,
  transactionId: string,
  accountId: string,
  createRule?: { pattern: string; matchField: string },
  vendorId?: string | null,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  // Update transaction
  await admin
    .from('bank_transactions')
    .update({
      status: 'categorized',
      categorized_account_id: accountId,
      vendor_id: vendorId || null,
      match_method: 'manual',
    })
    .eq('id', transactionId)
    .eq('community_id', communityId);

  // Optionally create a categorization rule
  if (createRule) {
    await admin.from('categorization_rules').insert({
      community_id: communityId,
      pattern: createRule.pattern,
      match_field: createRule.matchField,
      account_id: accountId,
      vendor_id: vendorId || null,
    });
  }

  return { success: true };
}

export async function matchTransaction(
  communityId: string,
  transactionId: string,
  journalEntryId: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('bank_transactions')
    .update({
      status: 'matched',
      matched_journal_entry_id: journalEntryId,
      match_method: 'manual',
    })
    .eq('id', transactionId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function excludeTransaction(
  communityId: string,
  transactionId: string,
  reason: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('bank_transactions')
    .update({
      status: 'excluded',
      excluded_reason: reason,
    })
    .eq('id', transactionId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function unmatchTransaction(communityId: string, transactionId: string) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('bank_transactions')
    .update({
      status: 'pending',
      matched_journal_entry_id: null,
      match_method: null,
      categorized_account_id: null,
      vendor_id: null,
      excluded_reason: null,
    })
    .eq('id', transactionId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function mapBankAccountToGL(
  communityId: string,
  bankAccountId: string,
  glAccountId: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('plaid_bank_accounts')
    .update({ gl_account_id: glAccountId })
    .eq('id', bankAccountId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function startReconciliation(
  communityId: string,
  bankAccountId: string,
  periodStart: string,
  periodEnd: string,
  statementEndingBalance: number,
) {
  const { user } = await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  // Check for existing in-progress reconciliation
  const { data: existing } = await admin
    .from('bank_reconciliations')
    .select('id')
    .eq('community_id', communityId)
    .eq('plaid_bank_account_id', bankAccountId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (existing) {
    return { reconciliationId: existing.id, existing: true };
  }

  // Calculate GL ending balance from journal lines for the mapped GL account
  const { data: bankAccount } = await admin
    .from('plaid_bank_accounts')
    .select('gl_account_id')
    .eq('id', bankAccountId)
    .single();

  let glEndingBalance: number | null = null;

  if (bankAccount?.gl_account_id) {
    const { data: lines } = await admin
      .from('journal_lines')
      .select('debit, credit, journal_entry:journal_entries!inner(entry_date, status, community_id)')
      .eq('account_id', bankAccount.gl_account_id);

    if (lines) {
      const filtered = lines.filter((l) => {
        const entry = l.journal_entry as unknown as {
          entry_date: string;
          status: string;
          community_id: string;
        };
        return (
          entry.community_id === communityId &&
          entry.status === 'posted' &&
          entry.entry_date <= periodEnd
        );
      });

      // For asset accounts (cash), balance = debits - credits, in cents
      const totalDebits = filtered.reduce((sum, l) => sum + Math.round((l.debit || 0) * 100), 0);
      const totalCredits = filtered.reduce(
        (sum, l) => sum + Math.round((l.credit || 0) * 100),
        0,
      );
      glEndingBalance = totalDebits - totalCredits;
    }
  }

  const difference =
    glEndingBalance !== null ? statementEndingBalance - glEndingBalance : null;

  const { data: recon, error } = await admin
    .from('bank_reconciliations')
    .insert({
      community_id: communityId,
      plaid_bank_account_id: bankAccountId,
      period_start: periodStart,
      period_end: periodEnd,
      statement_ending_balance: statementEndingBalance,
      gl_ending_balance: glEndingBalance,
      difference,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { reconciliationId: recon.id, existing: false };
}

export async function completeReconciliation(communityId: string, reconciliationId: string) {
  const { user } = await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  // Verify difference is 0
  const { data: recon } = await admin
    .from('bank_reconciliations')
    .select('difference')
    .eq('id', reconciliationId)
    .eq('community_id', communityId)
    .single();

  if (!recon) throw new Error('Reconciliation not found');
  if (recon.difference !== 0) {
    throw new Error('Cannot complete reconciliation with non-zero difference');
  }

  // Mark all associated bank transactions as reconciled
  await admin
    .from('bank_transactions')
    .update({ status: 'reconciled' })
    .eq('reconciliation_id', reconciliationId)
    .in('status', ['matched', 'categorized']);

  // Complete the reconciliation
  await admin
    .from('bank_reconciliations')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', reconciliationId);

  return { success: true };
}

export async function updateReconciliationBalance(
  communityId: string,
  reconciliationId: string,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  const { data: recon } = await admin
    .from('bank_reconciliations')
    .select('*, plaid_bank_accounts!inner(gl_account_id)')
    .eq('id', reconciliationId)
    .eq('community_id', communityId)
    .single();

  if (!recon) throw new Error('Reconciliation not found');

  const glAccountId = (recon.plaid_bank_accounts as unknown as { gl_account_id: string })
    .gl_account_id;

  if (!glAccountId) return { difference: null };

  const { data: lines } = await admin
    .from('journal_lines')
    .select('debit, credit, journal_entry:journal_entries!inner(entry_date, status, community_id)')
    .eq('account_id', glAccountId);

  let glEndingBalance = 0;
  if (lines) {
    const filtered = lines.filter((l) => {
      const entry = l.journal_entry as unknown as {
        entry_date: string;
        status: string;
        community_id: string;
      };
      return (
        entry.community_id === communityId &&
        entry.status === 'posted' &&
        entry.entry_date <= recon.period_end
      );
    });

    const totalDebits = filtered.reduce((sum, l) => sum + Math.round((l.debit || 0) * 100), 0);
    const totalCredits = filtered.reduce((sum, l) => sum + Math.round((l.credit || 0) * 100), 0);
    glEndingBalance = totalDebits - totalCredits;
  }

  const difference = recon.statement_ending_balance - glEndingBalance;

  await admin
    .from('bank_reconciliations')
    .update({ gl_ending_balance: glEndingBalance, difference })
    .eq('id', reconciliationId);

  return { glEndingBalance, difference };
}

export async function createCategorizationRule(
  communityId: string,
  pattern: string,
  matchField: string,
  accountId: string,
  priority?: number,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('categorization_rules')
    .insert({
      community_id: communityId,
      pattern,
      match_field: matchField,
      account_id: accountId,
      priority: priority || 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCategorizationRule(communityId: string, ruleId: string) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('categorization_rules')
    .delete()
    .eq('id', ruleId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function toggleCategorizationRule(
  communityId: string,
  ruleId: string,
  isActive: boolean,
) {
  await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  await admin
    .from('categorization_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId)
    .eq('community_id', communityId);

  return { success: true };
}

export async function createJournalEntryFromBankTxn(
  communityId: string,
  transactionId: string,
  accountId: string,
  bankAccountGlId: string,
) {
  const { user } = await requirePermission(communityId, 'banking', 'write');
  const admin = createAdminClient();

  // Get the transaction
  const { data: txn } = await admin
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('community_id', communityId)
    .single();

  if (!txn) throw new Error('Transaction not found');

  const amountDollars = Math.abs(txn.amount) / 100;
  const isDebit = txn.amount > 0; // Positive = money leaving account (expense)

  // Create journal entry
  const { data: entry, error: entryError } = await admin
    .from('journal_entries')
    .insert({
      community_id: communityId,
      entry_date: txn.date,
      description: txn.merchant_name || txn.name,
      source: 'bank_sync',
      status: 'posted',
      posted_at: new Date().toISOString(),
      created_by: user.id,
      vendor_id: txn.vendor_id || null,
    })
    .select()
    .single();

  if (entryError) throw new Error(entryError.message);

  // Create journal lines
  // If money left the bank (debit in Plaid = positive amount):
  //   Debit expense/asset account, Credit cash account
  // If money entered the bank (credit in Plaid = negative amount):
  //   Debit cash account, Credit revenue/liability account
  const lines = isDebit
    ? [
        { journal_entry_id: entry.id, account_id: accountId, debit: amountDollars, credit: 0 },
        {
          journal_entry_id: entry.id,
          account_id: bankAccountGlId,
          debit: 0,
          credit: amountDollars,
        },
      ]
    : [
        {
          journal_entry_id: entry.id,
          account_id: bankAccountGlId,
          debit: amountDollars,
          credit: 0,
        },
        { journal_entry_id: entry.id, account_id: accountId, debit: 0, credit: amountDollars },
      ];

  await admin.from('journal_lines').insert(lines);

  // Link transaction to journal entry
  await admin
    .from('bank_transactions')
    .update({
      status: 'categorized',
      categorized_account_id: accountId,
      matched_journal_entry_id: entry.id,
    })
    .eq('id', transactionId);

  return { entryId: entry.id };
}
