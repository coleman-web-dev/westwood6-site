/**
 * Determines if a bank transaction represents an outflow (money leaving the account).
 *
 * Priority: manual override > account-level sign source setting > default
 *
 * Sign source modes (per bank account):
 * - 'sign'  — Trust the Plaid amount sign (positive = outflow)
 * - 'name'  — Parse transaction name keywords to determine direction
 * - 'abs'   — No direction (always returns false, amounts shown as absolute)
 */

type SignSource = 'sign' | 'name' | 'abs';
type DirectionOverride = 'inflow' | 'outflow' | null;

/**
 * Returns true if the transaction represents money leaving the account.
 */
export function isOutflow(
  amount: number,
  name: string,
  plaidCategory: string | null,
  signSource: SignSource,
  directionOverride?: DirectionOverride,
): boolean {
  // Manual override takes priority
  if (directionOverride === 'outflow') return true;
  if (directionOverride === 'inflow') return false;

  if (signSource === 'abs') return false;

  if (signSource === 'sign') {
    // Plaid convention: positive = money out, negative = money in
    return amount > 0;
  }

  // Name-based detection
  const n = name.toLowerCase();

  // Outflow keywords: money leaving the account
  if (/\b(debit|check|payment|withdrawal|purchase|fee|charge)\b/.test(n)) return true;
  // Inflow keywords: money entering the account
  if (/\b(credit|deposit|refund|interest|dividend|rebate)\b/.test(n)) return false;

  // Use plaid_category as fallback
  if (plaidCategory) {
    const cat = plaidCategory.toUpperCase();
    if (cat.includes('INCOME') || cat.includes('TRANSFER_IN')) return false;
    if (cat.includes('TRANSFER_OUT') || cat.includes('LOAN_PAYMENTS')) return true;
  }

  // Default: treat as outflow (conservative, shows red)
  return true;
}

/**
 * Formats a bank transaction amount for display with direction sign and color.
 */
export function formatBankAmount(
  amount: number,
  name: string,
  plaidCategory: string | null,
  signSource: SignSource,
  directionOverride?: DirectionOverride,
): { text: string; className: string } {
  const absDollars = Math.abs(amount / 100);
  const formatted = absDollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  if (signSource === 'abs' && !directionOverride) {
    return {
      text: formatted,
      className: 'text-text-primary-light dark:text-text-primary-dark',
    };
  }

  const outflow = isOutflow(amount, name, plaidCategory, signSource, directionOverride);
  return {
    text: outflow ? `-${formatted}` : `+${formatted}`,
    className: outflow
      ? 'text-red-500 dark:text-red-400'
      : 'text-green-600 dark:text-green-400',
  };
}
