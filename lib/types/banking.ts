// ─── Banking Enums ────────────────────────────────────────────────

export type BankTxnStatus = 'pending' | 'matched' | 'categorized' | 'excluded' | 'reconciled';
export type ReconStatus = 'in_progress' | 'completed';
export type MatchMethod = 'auto_amount_date' | 'auto_reference' | 'manual' | 'rule';

// ─── Row Types ────────────────────────────────────────────────────

export interface PlaidConnection {
  id: string;
  community_id: string;
  plaid_item_id: string;
  plaid_access_token: string;
  institution_id: string | null;
  institution_name: string | null;
  last_sync_cursor: string | null;
  last_synced_at: string | null;
  error_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaidBankAccount {
  id: string;
  plaid_connection_id: string;
  community_id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  gl_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  community_id: string;
  plaid_bank_account_id: string;
  plaid_transaction_id: string;
  date: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  status: BankTxnStatus;
  matched_journal_entry_id: string | null;
  match_method: MatchMethod | null;
  categorized_account_id: string | null;
  reconciliation_id: string | null;
  excluded_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankReconciliation {
  id: string;
  community_id: string;
  plaid_bank_account_id: string;
  period_start: string;
  period_end: string;
  statement_ending_balance: number;
  gl_ending_balance: number | null;
  difference: number | null;
  status: ReconStatus;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategorizationRule {
  id: string;
  community_id: string;
  pattern: string;
  match_field: string;
  account_id: string;
  priority: number;
  is_active: boolean;
  times_applied: number;
  created_at: string;
  updated_at: string;
}

// ─── Extended types for UI ────────────────────────────────────────

export interface PlaidBankAccountWithConnection extends PlaidBankAccount {
  plaid_connection: Pick<PlaidConnection, 'institution_name' | 'is_active' | 'last_synced_at' | 'error_code'>;
}

export interface BankTransactionWithAccount extends BankTransaction {
  categorized_account?: { code: string; name: string } | null;
}

export interface CategorizationRuleWithAccount extends CategorizationRule {
  account: { code: string; name: string };
}
