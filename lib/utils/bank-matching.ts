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

  return matchCount;
}
