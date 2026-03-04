// ─── Accounting Enums ──────────────────────────────────────────────

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountFund = 'operating' | 'reserve' | 'special';
export type JournalSource =
  | 'manual'
  | 'invoice_created'
  | 'payment_received'
  | 'late_fee_applied'
  | 'invoice_waived'
  | 'invoice_voided'
  | 'wallet_credit'
  | 'wallet_debit'
  | 'refund'
  | 'assessment_generated'
  | 'bank_sync';
export type JournalStatus = 'draft' | 'posted' | 'reversed';

// ─── Row Types ─────────────────────────────────────────────────────

export interface Account {
  id: string;
  community_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  fund: AccountFund;
  parent_id: string | null;
  is_system: boolean;
  is_active: boolean;
  normal_balance: 'debit' | 'credit';
  display_order: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  community_id: string;
  entry_date: string;
  description: string;
  source: JournalSource;
  status: JournalStatus;
  reference_type: string | null;
  reference_id: string | null;
  unit_id: string | null;
  reversed_by: string | null;
  reversal_of: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string;
  posted_at: string | null;
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface FiscalPeriod {
  id: string;
  community_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

// ─── Extended types for UI ─────────────────────────────────────────

export interface JournalEntryWithLines extends JournalEntry {
  journal_lines: JournalLine[];
}

export interface JournalLineWithAccount extends JournalLine {
  account: Pick<Account, 'code' | 'name' | 'account_type'>;
}

export interface AccountWithBalance extends Account {
  debit_total: number;
  credit_total: number;
  balance: number;
}

// ─── Report Types ──────────────────────────────────────────────────

export interface TrialBalanceRow {
  account_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  fund: AccountFund;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface BalanceSheetSection {
  label: string;
  accounts: TrialBalanceRow[];
  total: number;
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_assets: number;
  total_liabilities_equity: number;
  is_balanced: boolean;
}

export interface IncomeStatementReport {
  start_date: string;
  end_date: string;
  revenue: BalanceSheetSection;
  expenses: BalanceSheetSection;
  net_income: number;
}

export interface FundSummary {
  operating_balance: number;
  reserve_balance: number;
  total_ar: number;
  total_revenue_ytd: number;
  total_expenses_ytd: number;
}
