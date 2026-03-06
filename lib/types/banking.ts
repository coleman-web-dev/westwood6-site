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
  vendor_id: string | null;
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
  vendor_id: string | null;
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
  vendor?: { id: string; name: string; company: string | null } | null;
}

export interface CategorizationRuleWithAccount extends CategorizationRule {
  account: { code: string; name: string };
}

// ─── AI Statement Processing ─────────────────────────────────────

export type StatementUploadStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export interface StatementUpload {
  id: string;
  community_id: string;
  plaid_bank_account_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  period_month: number;
  period_year: number;
  status: StatementUploadStatus;
  ai_results: AIStatementResults | null;
  transactions_found: number;
  checks_found: number;
  auto_categorized: number;
  error_message: string | null;
  uploaded_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface AIStatementResults {
  transactions: AIExtractedTransaction[];
  checks: AIExtractedCheck[];
  summary: {
    total_deposits: number;
    total_withdrawals: number;
    ending_balance: number | null;
  };
}

export interface AIExtractedTransaction {
  date: string;
  description: string;
  amount: number; // in cents, positive = debit/expense, negative = credit/deposit
  check_number: string | null;
  type: 'check' | 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'other';
  matched_vendor_id: string | null;
  matched_vendor_name: string | null;
  matched_member_id: string | null;
  matched_member_name: string | null;
  suggested_account_code: string | null;
  confidence: number; // 0-1
  bank_txn_id: string | null; // linked bank_transaction if found
}

export interface AIExtractedCheck {
  check_number: string;
  payee: string;
  payer: string;
  amount: number; // in cents
  date: string;
  memo: string | null;
  image_path: string | null; // path in Supabase Storage
  is_vendor_check: boolean; // true if HOA wrote the check (expense)
  is_homeowner_check: boolean; // true if homeowner wrote the check (income)
  matched_vendor_id: string | null;
  matched_member_id: string | null;
  matched_unit_id: string | null;
  document_saved: boolean; // whether image was saved as vendor/household doc
}
