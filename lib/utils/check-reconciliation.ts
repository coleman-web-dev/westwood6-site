import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIExtractedCheck } from '@/lib/types/banking';

export interface CheckReconciliationResult {
  matched: number;
  categorized: number;
  journal_entries_created: number;
  checks_created: number;
  unmatched: number;
}

/**
 * Reconcile AI-extracted checks from a bank statement against bank transactions.
 *
 * For each check:
 * 1. Match to a pending bank transaction by check number + amount
 * 2. Look up or create a check record
 * 3. If the vendor has a default expense account, auto-categorize the transaction
 * 4. Create a journal entry (debit expense, credit bank)
 * 5. Link check -> bank transaction -> journal entry
 */
export async function reconcileChecksFromStatement(
  admin: SupabaseClient,
  communityId: string,
  checks: AIExtractedCheck[],
): Promise<CheckReconciliationResult> {
  const result: CheckReconciliationResult = {
    matched: 0,
    categorized: 0,
    journal_entries_created: 0,
    checks_created: 0,
    unmatched: 0,
  };

  if (checks.length === 0) return result;

  // Fetch pending bank transactions for matching
  const { data: pendingTxns } = await admin
    .from('bank_transactions')
    .select('id, amount, date, name, plaid_bank_account_id, status')
    .eq('community_id', communityId)
    .in('status', ['pending', 'categorized']);

  if (!pendingTxns || pendingTxns.length === 0) {
    result.unmatched = checks.length;
    return result;
  }

  // Build check number -> transaction mapping from bank transaction names
  const checkPattern = /(?:check|ck|chk)\s*#?\s*(\d+)/i;
  const txnByCheckNumber = new Map<number, typeof pendingTxns[0]>();
  for (const txn of pendingTxns) {
    const match = checkPattern.exec(txn.name);
    if (match) {
      txnByCheckNumber.set(parseInt(match[1], 10), txn);
    }
  }

  // Fetch vendors with default expense accounts for auto-categorization
  const { data: vendors } = await admin
    .from('vendors')
    .select('id, name, default_expense_account_id')
    .eq('community_id', communityId)
    .eq('status', 'active')
    .not('default_expense_account_id', 'is', null);

  const vendorExpenseMap = new Map(
    (vendors || []).map((v) => [v.id, v.default_expense_account_id as string]),
  );

  // Fetch bank account GL mappings for journal entries
  const { data: bankAccounts } = await admin
    .from('plaid_bank_accounts')
    .select('id, gl_account_id')
    .eq('community_id', communityId)
    .not('gl_account_id', 'is', null);

  const bankGlMap = new Map(
    (bankAccounts || []).map((a) => [a.id, a.gl_account_id as string]),
  );

  for (const check of checks) {
    const checkNum = parseInt(check.check_number, 10);
    if (isNaN(checkNum)) {
      result.unmatched++;
      continue;
    }

    // Try to find matching bank transaction
    let matchedTxn = txnByCheckNumber.get(checkNum);

    // If no match by check number in name, try amount + date proximity
    if (!matchedTxn) {
      matchedTxn = pendingTxns.find((txn) => {
        if (txn.status !== 'pending') return false;
        // Amount match (bank txn is in cents, check amount is in cents)
        if (Math.abs(txn.amount) !== check.amount) return false;
        // Date proximity (within 5 days)
        const txnDate = new Date(txn.date);
        const checkDate = new Date(check.date);
        const daysDiff = Math.abs(txnDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 5;
      });
    }

    // Look up existing check record or create one
    const { data: existingCheck } = await admin
      .from('checks')
      .select('id, status, journal_entry_id, bank_transaction_id')
      .eq('community_id', communityId)
      .eq('check_number', checkNum)
      .maybeSingle();

    if (matchedTxn) {
      result.matched++;

      // Determine expense account for auto-categorization
      const vendorId = check.matched_vendor_id || null;
      const expenseAccountId = vendorId ? vendorExpenseMap.get(vendorId) : null;
      const bankGlId = bankGlMap.get(matchedTxn.plaid_bank_account_id);

      let journalEntryId = existingCheck?.journal_entry_id || null;

      // Auto-categorize if we have vendor + expense account + bank GL mapping
      if (expenseAccountId && bankGlId && matchedTxn.status === 'pending') {
        // Create journal entry if one doesn't already exist
        if (!journalEntryId) {
          journalEntryId = await createCheckJournalEntry(
            admin,
            communityId,
            check,
            expenseAccountId,
            bankGlId,
            vendorId,
          );
          if (journalEntryId) result.journal_entries_created++;
        }

        // Update bank transaction
        await admin
          .from('bank_transactions')
          .update({
            status: 'categorized',
            categorized_account_id: expenseAccountId,
            vendor_id: vendorId,
            match_method: 'ai',
            matched_journal_entry_id: journalEntryId,
          })
          .eq('id', matchedTxn.id);

        result.categorized++;
      } else if (matchedTxn.status === 'pending') {
        // At least mark as matched even without full categorization
        await admin
          .from('bank_transactions')
          .update({
            status: 'matched',
            match_method: 'ai',
            vendor_id: vendorId,
            matched_journal_entry_id: journalEntryId,
          })
          .eq('id', matchedTxn.id);
      }

      // Update or create check record
      if (existingCheck) {
        await admin
          .from('checks')
          .update({
            status: 'cleared',
            bank_transaction_id: matchedTxn.id,
            check_image_path: check.image_path,
            ...(journalEntryId && !existingCheck.journal_entry_id
              ? { journal_entry_id: journalEntryId }
              : {}),
          })
          .eq('id', existingCheck.id);
      } else {
        // Create a new check record from statement AI
        await admin.from('checks').insert({
          community_id: communityId,
          check_number: checkNum,
          date: check.date,
          amount: check.amount,
          payee_name: check.payee || check.payer || 'Unknown',
          payee_vendor_id: vendorId,
          memo: check.memo,
          status: 'cleared',
          source: 'statement_ai',
          bank_transaction_id: matchedTxn.id,
          journal_entry_id: journalEntryId,
          check_image_path: check.image_path,
        });
        result.checks_created++;
      }
    } else {
      // No matching bank transaction found, but still create check record
      if (!existingCheck) {
        await admin.from('checks').insert({
          community_id: communityId,
          check_number: checkNum,
          date: check.date,
          amount: check.amount,
          payee_name: check.payee || check.payer || 'Unknown',
          payee_vendor_id: check.matched_vendor_id,
          memo: check.memo,
          status: 'cleared',
          source: 'statement_ai',
          check_image_path: check.image_path,
        });
        result.checks_created++;
      }
      result.unmatched++;
    }
  }

  return result;
}

/**
 * Create a journal entry for a check cleared from a bank statement.
 * Debit expense account, credit bank account.
 */
async function createCheckJournalEntry(
  admin: SupabaseClient,
  communityId: string,
  check: AIExtractedCheck,
  expenseAccountId: string,
  bankGlAccountId: string,
  vendorId: string | null,
): Promise<string | null> {
  const amountCents = check.amount;

  const { data: entry, error: entryError } = await admin
    .from('journal_entries')
    .insert({
      community_id: communityId,
      entry_date: check.date,
      description: `Check #${check.check_number} - ${check.payee || check.payer || 'Check payment'}`,
      source: 'bank_sync',
      status: 'posted',
      posted_at: new Date().toISOString(),
      vendor_id: vendorId,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    console.error('Check reconciliation: failed to create journal entry', entryError);
    return null;
  }

  // Expense check: debit expense, credit bank
  const lines = [
    { journal_entry_id: entry.id, account_id: expenseAccountId, debit: amountCents, credit: 0 },
    { journal_entry_id: entry.id, account_id: bankGlAccountId, debit: 0, credit: amountCents },
  ];

  const { error: lineError } = await admin.from('journal_lines').insert(lines);
  if (lineError) {
    console.error('Check reconciliation: failed to create journal lines', lineError);
    await admin.from('journal_entries').delete().eq('id', entry.id);
    return null;
  }

  return entry.id;
}
