import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Apply categorization rules to all pending bank transactions for a community.
 * Rules are checked in priority order (highest first). When a match is found,
 * the transaction is categorized and the rule's times_applied counter increments.
 */
export async function applyCategorization(admin: SupabaseClient, communityId: string) {
  // Fetch active rules ordered by priority (highest first)
  const { data: rules } = await admin
    .from('categorization_rules')
    .select('id, pattern, match_field, account_id, times_applied')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!rules || rules.length === 0) return 0;

  // Fetch pending transactions
  const { data: transactions } = await admin
    .from('bank_transactions')
    .select('id, name, merchant_name')
    .eq('community_id', communityId)
    .eq('status', 'pending');

  if (!transactions || transactions.length === 0) return 0;

  let categorized = 0;

  for (const txn of transactions) {
    for (const rule of rules) {
      const fieldValue =
        rule.match_field === 'merchant_name' ? txn.merchant_name : txn.name;

      if (!fieldValue) continue;

      if (fieldValue.toLowerCase().includes(rule.pattern.toLowerCase())) {
        await admin
          .from('bank_transactions')
          .update({
            status: 'categorized',
            categorized_account_id: rule.account_id,
            match_method: 'rule',
          })
          .eq('id', txn.id);

        // Increment times_applied
        await admin
          .from('categorization_rules')
          .update({ times_applied: rule.times_applied + 1 })
          .eq('id', rule.id);

        categorized++;
        break; // First matching rule wins
      }
    }
  }

  return categorized;
}

/**
 * Find a matching rule for a single transaction.
 * Returns the account_id if a rule matches, null otherwise.
 */
export async function findMatchingRule(
  admin: SupabaseClient,
  communityId: string,
  name: string,
  merchantName: string | null,
): Promise<string | null> {
  const { data: rules } = await admin
    .from('categorization_rules')
    .select('pattern, match_field, account_id')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!rules) return null;

  for (const rule of rules) {
    const fieldValue = rule.match_field === 'merchant_name' ? merchantName : name;
    if (!fieldValue) continue;

    if (fieldValue.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return rule.account_id;
    }
  }

  return null;
}
