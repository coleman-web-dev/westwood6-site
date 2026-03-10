/**
 * Shared test fixtures for accounting tests.
 * All amounts are in cents (as stored in the DB).
 */

export const COMMUNITY_ID = '00000000-0000-0000-0000-000000000001';
export const ASSESSMENT_ID = '00000000-0000-0000-0000-000000000010';
export const UNIT_1_ID = '00000000-0000-0000-0000-000000000100';
export const UNIT_2_ID = '00000000-0000-0000-0000-000000000200';
export const UNIT_3_ID = '00000000-0000-0000-0000-000000000300';
export const MEMBER_1_ID = '00000000-0000-0000-0000-000000001000';
export const INVOICE_1_ID = '00000000-0000-0000-0000-000000010000';
export const JOURNAL_ENTRY_ID = '00000000-0000-0000-0000-000000100000';

// Minimal Assessment fixture
export function makeAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSESSMENT_ID,
    community_id: COMMUNITY_ID,
    title: 'Annual Dues 2026',
    description: 'Annual HOA dues for fiscal year 2026',
    annual_amount: 120000, // $1,200.00 in cents
    fiscal_year_start: '2026-01-01',
    fiscal_year_end: '2026-12-31',
    is_active: true,
    type: 'regular' as const,
    installments: null,
    installment_start_date: null,
    default_frequency: 'monthly' as const,
    created_by: MEMBER_1_ID,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Minimal Unit fixture
export function makeUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: UNIT_1_ID,
    community_id: COMMUNITY_ID,
    unit_number: '101',
    address: '101 Westwood Dr',
    status: 'active' as const,
    payment_frequency: null as string | null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Minimal Invoice fixture
export function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_1_ID,
    community_id: COMMUNITY_ID,
    unit_id: UNIT_1_ID,
    assessment_id: ASSESSMENT_ID,
    title: 'Annual Dues 2026 - January 2026',
    description: null,
    amount: 10000, // $100.00 in cents
    amount_paid: 0,
    due_date: '2026-01-01',
    status: 'pending' as const,
    paid_at: null,
    paid_by: null,
    stripe_payment_id: null,
    stripe_invoice_id: null,
    stripe_session_id: null,
    notes: null,
    bounced_from_invoice_id: null,
    late_fee_amount: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Minimal Account fixture for chart of accounts
export function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000a01',
    community_id: COMMUNITY_ID,
    code: '1000',
    name: 'Operating Cash',
    account_type: 'asset' as const,
    fund: 'operating' as const,
    normal_balance: 'debit' as const,
    is_active: true,
    is_system: true,
    parent_id: null,
    display_order: 1,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Pre-built chart of accounts (subset of the system defaults)
export const DEFAULT_ACCOUNTS = [
  makeAccount({ code: '1000', name: 'Operating Cash', account_type: 'asset', fund: 'operating', normal_balance: 'debit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a02', code: '1010', name: 'Reserve Cash', account_type: 'asset', fund: 'reserve', normal_balance: 'debit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a03', code: '1100', name: 'Accounts Receivable - Dues', account_type: 'asset', fund: 'operating', normal_balance: 'debit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a04', code: '1110', name: 'Accounts Receivable - Special', account_type: 'asset', fund: 'operating', normal_balance: 'debit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a05', code: '2110', name: 'Wallet Credits', account_type: 'liability', fund: 'operating', normal_balance: 'credit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a06', code: '4000', name: 'Dues Revenue', account_type: 'revenue', fund: 'operating', normal_balance: 'credit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a07', code: '4010', name: 'Special Assessment Revenue', account_type: 'revenue', fund: 'operating', normal_balance: 'credit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a08', code: '4100', name: 'Late Fee Revenue', account_type: 'revenue', fund: 'operating', normal_balance: 'credit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a09', code: '5100', name: 'Utilities', account_type: 'expense', fund: 'operating', normal_balance: 'debit' }),
  makeAccount({ id: '00000000-0000-0000-0000-000000000a10', code: '5800', name: 'Bad Debt Expense', account_type: 'expense', fund: 'operating', normal_balance: 'debit' }),
];

// Minimal Wallet fixture
export function makeWallet(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000w01',
    unit_id: UNIT_1_ID,
    community_id: COMMUNITY_ID,
    balance: 0,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}
