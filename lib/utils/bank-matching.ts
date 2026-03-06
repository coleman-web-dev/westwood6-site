import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Auto-match pending bank transactions to journal entries by amount and date.
 * A match requires:
 * - Same absolute amount (bank txn amount matches total debit or credit on the journal entry)
 * - Date within 3 days of the journal entry date
 * - Journal entry is posted and not already matched to another bank transaction
 */
export async function autoMatchTransactions(admin: SupabaseClient, communityId: string) {
  // Fetch pending (uncategorized, unmatched) bank transactions
  const { data: transactions } = await admin
    .from('bank_transactions')
    .select('id, amount, date, plaid_bank_account_id')
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (!transactions || transactions.length === 0) return 0;

  // Fetch recent posted journal entries with their line totals
  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date, journal_lines(debit, credit)')
    .eq('community_id', communityId)
    .eq('status', 'posted');

  if (!entries || entries.length === 0) return 0;

  // Get already-matched journal entry IDs
  const { data: matched } = await admin
    .from('bank_transactions')
    .select('matched_journal_entry_id')
    .eq('community_id', communityId)
    .not('matched_journal_entry_id', 'is', null);

  const matchedIds = new Set((matched || []).map((m) => m.matched_journal_entry_id));

  // Build entry lookup with total amounts
  const entryLookup = entries
    .filter((e) => !matchedIds.has(e.id))
    .map((e) => {
      const lines = e.journal_lines as { debit: number; credit: number }[];
      const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
      return {
        id: e.id,
        date: e.entry_date,
        amount: totalDebit, // Total debits = total credits in a balanced entry
      };
    });

  let matchCount = 0;

  for (const txn of transactions) {
    const txnAmount = Math.abs(txn.amount);
    const txnDate = new Date(txn.date);

    for (const entry of entryLookup) {
      const entryAmount = Math.round(entry.amount * 100); // Convert to cents if stored as dollars
      const entryDate = new Date(entry.date);
      const daysDiff = Math.abs(
        (txnDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Match if amount matches and within 3 days
      if (txnAmount === entryAmount && daysDiff <= 3) {
        await admin
          .from('bank_transactions')
          .update({
            status: 'matched',
            matched_journal_entry_id: entry.id,
            match_method: 'auto_amount_date',
          })
          .eq('id', txn.id);

        // Remove from lookup to prevent double-matching
        const idx = entryLookup.indexOf(entry);
        entryLookup.splice(idx, 1);
        matchCount++;
        break;
      }
    }
  }

  // ─── Phase 2: Match checks by check number ─────────────────────
  // Re-fetch remaining pending transactions (some may have been matched above)
  const { data: pendingTxns } = await admin
    .from('bank_transactions')
    .select('id, amount, date, name')
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (pendingTxns && pendingTxns.length > 0) {
    const checkPattern = /(?:check|ck|chk)\s*#?\s*(\d+)/i;

    for (const txn of pendingTxns) {
      const match = checkPattern.exec(txn.name);
      if (!match) continue;

      const checkNumber = parseInt(match[1], 10);
      if (isNaN(checkNumber)) continue;

      // Look for a matching check in our system
      const { data: check } = await admin
        .from('checks')
        .select('id, amount, journal_entry_id, status')
        .eq('community_id', communityId)
        .eq('check_number', checkNumber)
        .in('status', ['printed', 'approved'])
        .single();

      if (!check) continue;

      // Verify amount matches (bank transactions store amounts in cents,
      // positive = debit/money leaving for Plaid)
      if (Math.abs(txn.amount) === check.amount) {
        // Link the check to the bank transaction
        await admin
          .from('bank_transactions')
          .update({
            status: 'matched',
            matched_journal_entry_id: check.journal_entry_id,
            match_method: 'auto_reference',
          })
          .eq('id', txn.id);

        // Update check status to cleared
        await admin
          .from('checks')
          .update({
            status: 'cleared',
            bank_transaction_id: txn.id,
          })
          .eq('id', check.id);

        matchCount++;
      }
    }
  }

  return matchCount;
}
