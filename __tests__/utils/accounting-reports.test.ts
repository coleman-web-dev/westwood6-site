import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  getFundSummary,
  getBudgetVariance,
  getCashFlowForecast,
  getBudgetComparison,
  generateChartOfAccountsCSV,
  generateJournalEntriesCSV,
} from '@/lib/utils/accounting-reports';
import { COMMUNITY_ID } from '../helpers/fixtures';

// ─── Mock admin client ──────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown };
type TableConfig = {
  defaultResult: QueryResult;
  singleResult?: QueryResult;
  // Allows different results on subsequent calls to the same table
  callResults?: QueryResult[];
};

let tableConfigs: Record<string, TableConfig>;
let tableCalls: Record<string, number>;

function resetMock() {
  tableConfigs = {};
  tableCalls = {};
}

function setTableResult(table: string, result: QueryResult) {
  tableConfigs[table] = { defaultResult: result };
}

function setTableSingleResult(table: string, result: QueryResult) {
  if (!tableConfigs[table]) {
    tableConfigs[table] = { defaultResult: { data: null, error: null } };
  }
  tableConfigs[table].singleResult = result;
}

function getCallCount(table: string): number {
  return tableCalls[table] ?? 0;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      tableCalls[table] = (tableCalls[table] ?? 0) + 1;
      const config = tableConfigs[table] ?? { defaultResult: { data: null, error: null } };

      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'is', 'order', 'limit', 'gte', 'lte', 'gt', 'lt']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.single = vi.fn().mockImplementation(() => {
        const result = config.singleResult ?? config.defaultResult;
        return Promise.resolve(result);
      });

      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        return Promise.resolve(config.defaultResult).then(resolve);
      };

      return chain;
    },
  }),
}));

// ─── Test Data Factories ──────────────────────────────────────────────────────

function makeAccount(overrides: Partial<{
  id: string; code: string; name: string; account_type: string;
  fund: string; normal_balance: string; display_order: number;
}> = {}) {
  return {
    id: overrides.id ?? 'acct-1',
    code: overrides.code ?? '1000',
    name: overrides.name ?? 'Operating Cash',
    account_type: overrides.account_type ?? 'asset',
    fund: overrides.fund ?? 'operating',
    normal_balance: overrides.normal_balance ?? 'debit',
    display_order: overrides.display_order ?? 1,
  };
}

// A balanced set of accounts for double-entry testing
const STANDARD_ACCOUNTS = [
  makeAccount({ id: 'a-cash', code: '1000', name: 'Operating Cash', account_type: 'asset', normal_balance: 'debit', display_order: 1 }),
  makeAccount({ id: 'a-reserve', code: '1010', name: 'Reserve Cash', account_type: 'asset', normal_balance: 'debit', display_order: 2 }),
  makeAccount({ id: 'a-ar', code: '1100', name: 'Accounts Receivable - Dues', account_type: 'asset', normal_balance: 'debit', display_order: 3 }),
  makeAccount({ id: 'a-arspecial', code: '1110', name: 'Accounts Receivable - Special', account_type: 'asset', normal_balance: 'debit', display_order: 4 }),
  makeAccount({ id: 'l-deposits', code: '2000', name: 'Security Deposits', account_type: 'liability', normal_balance: 'credit', display_order: 10 }),
  makeAccount({ id: 'l-wallets', code: '2110', name: 'Wallet Credits', account_type: 'liability', normal_balance: 'credit', display_order: 11 }),
  makeAccount({ id: 'e-retained', code: '3000', name: 'Retained Earnings', account_type: 'equity', normal_balance: 'credit', display_order: 20 }),
  makeAccount({ id: 'r-dues', code: '4000', name: 'Dues Revenue', account_type: 'revenue', normal_balance: 'credit', display_order: 30 }),
  makeAccount({ id: 'r-late', code: '4100', name: 'Late Fee Revenue', account_type: 'revenue', normal_balance: 'credit', display_order: 31 }),
  makeAccount({ id: 'x-maint', code: '5000', name: 'Maintenance', account_type: 'expense', normal_balance: 'debit', display_order: 40 }),
  makeAccount({ id: 'x-util', code: '5100', name: 'Utilities', account_type: 'expense', normal_balance: 'debit', display_order: 41 }),
  makeAccount({ id: 'x-waived', code: '5800', name: 'Bad Debt / Waived', account_type: 'expense', normal_balance: 'debit', display_order: 42 }),
];

// ─── getTrialBalance() ──────────────────────────────────────────────────────

describe('getTrialBalance', () => {
  beforeEach(() => resetMock());

  it('returns empty array when no accounts exist', async () => {
    setTableResult('accounts', { data: [], error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getTrialBalance(COMMUNITY_ID, '2026-03-01');
    expect(result).toEqual([]);
  });

  it('aggregates debits and credits by account', async () => {
    setTableResult('accounts', { data: [STANDARD_ACCOUNTS[0], STANDARD_ACCOUNTS[7]], error: null });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }, { id: 'je-2' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'a-cash', debit: 10000, credit: 0, journal_entry_id: 'je-1' },
        { account_id: 'a-cash', debit: 5000, credit: 0, journal_entry_id: 'je-2' },
        { account_id: 'r-dues', debit: 0, credit: 15000, journal_entry_id: 'je-1' },
      ],
      error: null,
    });

    const result = await getTrialBalance(COMMUNITY_ID, '2026-03-01');

    expect(result).toHaveLength(2);

    // Operating Cash (debit normal): balance = debit - credit = 15000 - 0 = 15000
    const cashRow = result.find((r) => r.code === '1000');
    expect(cashRow?.debit_total).toBe(15000);
    expect(cashRow?.credit_total).toBe(0);
    expect(cashRow?.balance).toBe(15000);

    // Dues Revenue (credit normal): balance = credit - debit = 15000 - 0 = 15000
    const revenueRow = result.find((r) => r.code === '4000');
    expect(revenueRow?.debit_total).toBe(0);
    expect(revenueRow?.credit_total).toBe(15000);
    expect(revenueRow?.balance).toBe(15000);
  });

  it('returns zero balances for accounts with no journal lines', async () => {
    setTableResult('accounts', { data: [STANDARD_ACCOUNTS[0]], error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getTrialBalance(COMMUNITY_ID, '2026-03-01');

    expect(result).toHaveLength(1);
    expect(result[0].debit_total).toBe(0);
    expect(result[0].credit_total).toBe(0);
    expect(result[0].balance).toBe(0);
  });

  it('calculates balance correctly based on normal_balance direction', async () => {
    // A liability with normal_balance=credit: balance = credit - debit
    setTableResult('accounts', {
      data: [STANDARD_ACCOUNTS[4]], // Security Deposits - liability, normal_balance=credit
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'l-deposits', debit: 1000, credit: 5000, journal_entry_id: 'je-1' },
      ],
      error: null,
    });

    const result = await getTrialBalance(COMMUNITY_ID, '2026-03-01');

    expect(result[0].balance).toBe(4000); // credit(5000) - debit(1000)
  });
});

// ─── getBalanceSheet() ──────────────────────────────────────────────────────

describe('getBalanceSheet', () => {
  beforeEach(() => resetMock());

  it('is balanced when properly posted entries exist (Assets = L + E)', async () => {
    // Scenario: $150 cash received (asset), $150 dues revenue (revenue)
    // Net income flows to equity, so equity total = 0 (retained) + 150 (net income) = 150
    // Assets=150, L=0, E=150 => balanced
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'a-cash', debit: 15000, credit: 0, journal_entry_id: 'je-1' },
        { account_id: 'r-dues', debit: 0, credit: 15000, journal_entry_id: 'je-1' },
      ],
      error: null,
    });

    const result = await getBalanceSheet(COMMUNITY_ID, '2026-03-01');

    expect(result.is_balanced).toBe(true);
    expect(result.total_assets).toBe(15000);
    // Net income (revenue 15000 - expenses 0) = 15000
    // total equity = retained(0) + net income(15000) = 15000
    expect(result.total_liabilities_equity).toBe(15000);
  });

  it('includes net income (revenue - expenses) in equity section', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }, { id: 'je-2' }], error: null });
    setTableResult('journal_lines', {
      data: [
        // Payment received: DR cash, CR revenue
        { account_id: 'a-cash', debit: 10000, credit: 0, journal_entry_id: 'je-1' },
        { account_id: 'r-dues', debit: 0, credit: 10000, journal_entry_id: 'je-1' },
        // Expense paid: DR expense, CR cash
        { account_id: 'x-maint', debit: 3000, credit: 0, journal_entry_id: 'je-2' },
        { account_id: 'a-cash', debit: 0, credit: 3000, journal_entry_id: 'je-2' },
      ],
      error: null,
    });

    const result = await getBalanceSheet(COMMUNITY_ID, '2026-03-01');

    // Net income = revenue(10000) - expenses(3000) = 7000
    // Equity total = retained(0) + net income(7000) = 7000
    expect(result.equity.total).toBe(7000);
    expect(result.total_assets).toBe(7000); // cash: 10000-3000
    expect(result.is_balanced).toBe(true);
  });

  it('returns correct sections with accounts classified by type', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getBalanceSheet(COMMUNITY_ID, '2026-03-01');

    expect(result.assets.label).toBe('Assets');
    expect(result.liabilities.label).toBe('Liabilities');
    expect(result.equity.label).toBe('Equity');
    // 4 asset accounts
    expect(result.assets.accounts).toHaveLength(4);
    // 2 liability accounts
    expect(result.liabilities.accounts).toHaveLength(2);
    // 1 equity account
    expect(result.equity.accounts).toHaveLength(1);
  });

  it('balance sheet is balanced even with zero balances', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getBalanceSheet(COMMUNITY_ID, '2026-03-01');

    expect(result.is_balanced).toBe(true);
    expect(result.total_assets).toBe(0);
    expect(result.total_liabilities_equity).toBe(0);
  });
});

// ─── getIncomeStatement() ───────────────────────────────────────────────────

describe('getIncomeStatement', () => {
  beforeEach(() => resetMock());

  it('calculates net_income = revenue - expenses', async () => {
    setTableResult('accounts', {
      data: STANDARD_ACCOUNTS.filter((a) => ['revenue', 'expense'].includes(a.account_type)),
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }, { id: 'je-2' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'r-dues', debit: 0, credit: 20000 },
        { account_id: 'r-late', debit: 0, credit: 500 },
        { account_id: 'x-maint', debit: 8000, credit: 0 },
        { account_id: 'x-util', debit: 3000, credit: 0 },
      ],
      error: null,
    });

    const result = await getIncomeStatement(COMMUNITY_ID, '2026-01-01', '2026-03-31');

    expect(result.revenue.total).toBe(20500); // 20000+500
    expect(result.expenses.total).toBe(11000); // 8000+3000
    expect(result.net_income).toBe(9500); // 20500-11000
  });

  it('returns zeros when no accounts exist', async () => {
    setTableResult('accounts', { data: [], error: null });

    const result = await getIncomeStatement(COMMUNITY_ID, '2026-01-01', '2026-03-31');

    expect(result.revenue.total).toBe(0);
    expect(result.expenses.total).toBe(0);
    expect(result.net_income).toBe(0);
    expect(result.start_date).toBe('2026-01-01');
    expect(result.end_date).toBe('2026-03-31');
  });

  it('returns zeros when no journal entries exist in range', async () => {
    setTableResult('accounts', {
      data: STANDARD_ACCOUNTS.filter((a) => ['revenue', 'expense'].includes(a.account_type)),
      error: null,
    });
    setTableResult('journal_entries', { data: [], error: null });
    // With entryIds empty, lines won't be fetched
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getIncomeStatement(COMMUNITY_ID, '2026-01-01', '2026-03-31');

    expect(result.net_income).toBe(0);
    expect(result.revenue.accounts).toHaveLength(2); // accounts exist but zero balance
    expect(result.revenue.accounts[0].balance).toBe(0);
  });

  it('classifies accounts into revenue and expense sections', async () => {
    setTableResult('accounts', {
      data: STANDARD_ACCOUNTS.filter((a) => ['revenue', 'expense'].includes(a.account_type)),
      error: null,
    });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getIncomeStatement(COMMUNITY_ID, '2026-01-01', '2026-12-31');

    expect(result.revenue.label).toBe('Revenue');
    expect(result.expenses.label).toBe('Expenses');
    expect(result.revenue.accounts.every((a) => a.account_type === 'revenue')).toBe(true);
    expect(result.expenses.accounts.every((a) => a.account_type === 'expense')).toBe(true);
  });
});

// ─── getFundSummary() ───────────────────────────────────────────────────────

describe('getFundSummary', () => {
  beforeEach(() => resetMock());

  it('extracts correct balances by account code', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'a-cash', debit: 50000, credit: 0, journal_entry_id: 'je-1' },    // 1000
        { account_id: 'a-reserve', debit: 20000, credit: 0, journal_entry_id: 'je-1' },  // 1010
        { account_id: 'a-ar', debit: 15000, credit: 0, journal_entry_id: 'je-1' },       // 1100
        { account_id: 'a-arspecial', debit: 5000, credit: 0, journal_entry_id: 'je-1' }, // 1110
        { account_id: 'r-dues', debit: 0, credit: 75000, journal_entry_id: 'je-1' },     // revenue
        { account_id: 'x-maint', debit: 10000, credit: 0, journal_entry_id: 'je-1' },    // expense
        // Balance the entry
        { account_id: 'e-retained', debit: 0, credit: 25000, journal_entry_id: 'je-1' },
      ],
      error: null,
    });

    const result = await getFundSummary(COMMUNITY_ID);

    expect(result.operating_balance).toBe(50000);
    expect(result.reserve_balance).toBe(20000);
    expect(result.total_ar).toBe(20000); // 15000 + 5000
    expect(result.total_revenue_ytd).toBe(75000);
    expect(result.total_expenses_ytd).toBe(10000);
  });

  it('returns zeros when no matching accounts', async () => {
    setTableResult('accounts', { data: [], error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getFundSummary(COMMUNITY_ID);

    expect(result.operating_balance).toBe(0);
    expect(result.reserve_balance).toBe(0);
    expect(result.total_ar).toBe(0);
    expect(result.total_revenue_ytd).toBe(0);
    expect(result.total_expenses_ytd).toBe(0);
  });
});

// ─── getBudgetVariance() ────────────────────────────────────────────────────

describe('getBudgetVariance', () => {
  beforeEach(() => resetMock());

  it('returns empty when no budget exists for the year', async () => {
    setTableSingleResult('budgets', { data: null, error: { message: 'Not found' } });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);
    expect(result).toEqual([]);
  });

  it('calculates variance for expense items (budgeted - actual)', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Operating', name: 'Maintenance', budgeted_amount: 10000, actual_amount: 0, is_income: false },
      ],
      error: null,
    });

    // Mock income statement for actual amounts (getIncomeStatement calls)
    setTableResult('accounts', {
      data: [
        makeAccount({ id: 'x-maint', code: '5000', name: 'Maintenance', account_type: 'expense', normal_balance: 'debit' }),
      ],
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'x-maint', debit: 8000, credit: 0 },
      ],
      error: null,
    });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);

    expect(result).toHaveLength(1);
    expect(result[0].budgeted).toBe(10000);
    expect(result[0].actual).toBe(8000);
    // Expense variance = budgeted - actual (positive = under budget)
    expect(result[0].variance).toBe(2000);
    expect(result[0].variance_pct).toBe(80); // (8000/10000)*100
  });

  it('calculates variance for income items (actual - budgeted)', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Income', name: 'Dues Revenue', budgeted_amount: 50000, actual_amount: 0, is_income: true },
      ],
      error: null,
    });

    setTableResult('accounts', {
      data: [
        makeAccount({ id: 'r-dues', code: '4000', name: 'Dues Revenue', account_type: 'revenue', normal_balance: 'credit' }),
      ],
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'r-dues', debit: 0, credit: 55000 },
      ],
      error: null,
    });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);

    expect(result[0].is_income).toBe(true);
    // Income variance = actual - budgeted (positive = over target)
    expect(result[0].variance).toBe(5000);
  });

  it('flags over_threshold when expense exceeds 80% of budget', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Operating', name: 'Utilities', budgeted_amount: 10000, actual_amount: 0, is_income: false },
        { category: 'Operating', name: 'Maintenance', budgeted_amount: 10000, actual_amount: 0, is_income: false },
      ],
      error: null,
    });
    setTableResult('accounts', {
      data: [
        makeAccount({ id: 'x-util', code: '5100', name: 'Utilities', account_type: 'expense', normal_balance: 'debit' }),
        makeAccount({ id: 'x-maint', code: '5000', name: 'Maintenance', account_type: 'expense', normal_balance: 'debit' }),
      ],
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'x-util', debit: 8500, credit: 0 },   // 85% of budget - over threshold
        { account_id: 'x-maint', debit: 5000, credit: 0 },   // 50% of budget - under threshold
      ],
      error: null,
    });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);

    const utilities = result.find((r) => r.name === 'Utilities');
    const maintenance = result.find((r) => r.name === 'Maintenance');

    expect(utilities?.over_threshold).toBe(true);  // 85% > 80%
    expect(maintenance?.over_threshold).toBe(false); // 50% < 80%
  });

  it('does not flag income items for over_threshold', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Income', name: 'Dues Revenue', budgeted_amount: 10000, actual_amount: 0, is_income: true },
      ],
      error: null,
    });
    setTableResult('accounts', {
      data: [
        makeAccount({ id: 'r-dues', code: '4000', name: 'Dues Revenue', account_type: 'revenue', normal_balance: 'credit' }),
      ],
      error: null,
    });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [{ account_id: 'r-dues', debit: 0, credit: 50000 }],
      error: null,
    });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);

    // Even though variance_pct is 500%, income items never trigger over_threshold
    expect(result[0].over_threshold).toBe(false);
  });

  it('handles zero budget gracefully', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Operating', name: 'Zero Budget Item', budgeted_amount: 0, actual_amount: 0, is_income: false },
      ],
      error: null,
    });
    setTableResult('accounts', { data: [], error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });

    const result = await getBudgetVariance(COMMUNITY_ID, 2026);

    expect(result[0].variance_pct).toBe(0); // No actual, no budget = 0%
    expect(result[0].over_threshold).toBe(false);
  });
});

// ─── getCashFlowForecast() ──────────────────────────────────────────────────

describe('getCashFlowForecast', () => {
  beforeEach(() => resetMock());

  it('returns requested number of months', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });
    setTableResult('invoices', { data: [], error: null });

    const result = await getCashFlowForecast(COMMUNITY_ID, 6);

    expect(result).toHaveLength(6);
  });

  it('calculates running balance across months', async () => {
    // Set current cash = 100000 (from trial balance)
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [{ id: 'je-1' }], error: null });
    setTableResult('journal_lines', {
      data: [
        { account_id: 'a-cash', debit: 80000, credit: 0, journal_entry_id: 'je-1' },
        { account_id: 'a-reserve', debit: 20000, credit: 0, journal_entry_id: 'je-1' },
        // Balance the entry
        { account_id: 'r-dues', debit: 0, credit: 100000, journal_entry_id: 'je-1' },
      ],
      error: null,
    });
    setTableResult('invoices', { data: [], error: null });

    const result = await getCashFlowForecast(COMMUNITY_ID, 3);

    expect(result).toHaveLength(3);
    // Each month should have a running_balance
    expect(typeof result[0].running_balance).toBe('number');
    expect(typeof result[0].projected_income).toBe('number');
    expect(typeof result[0].projected_expenses).toBe('number');
    expect(typeof result[0].net_cash_flow).toBe('number');
  });

  it('each row has month label and YYYY-MM format', async () => {
    setTableResult('accounts', { data: [], error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });
    setTableResult('invoices', { data: [], error: null });

    const result = await getCashFlowForecast(COMMUNITY_ID, 2);

    for (const row of result) {
      expect(row.month).toMatch(/^\d{4}-\d{2}$/);
      expect(row.label).toBeTruthy();
    }
  });

  it('rounds all monetary values', async () => {
    setTableResult('accounts', { data: STANDARD_ACCOUNTS, error: null });
    setTableResult('journal_entries', { data: [], error: null });
    setTableResult('journal_lines', { data: [], error: null });
    setTableResult('invoices', { data: [], error: null });

    const result = await getCashFlowForecast(COMMUNITY_ID, 1);

    expect(Number.isInteger(result[0].projected_income)).toBe(true);
    expect(Number.isInteger(result[0].projected_expenses)).toBe(true);
    expect(Number.isInteger(result[0].net_cash_flow)).toBe(true);
    expect(Number.isInteger(result[0].running_balance)).toBe(true);
  });
});

// ─── getBudgetComparison() ──────────────────────────────────────────────────

describe('getBudgetComparison', () => {
  beforeEach(() => resetMock());

  it('returns entry per year even if no budget exists', async () => {
    setTableSingleResult('budgets', { data: null, error: { message: 'Not found' } });

    const result = await getBudgetComparison(COMMUNITY_ID, [2025, 2026]);

    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2025);
    expect(result[0].items).toEqual([]);
    expect(result[1].year).toBe(2026);
    expect(result[1].items).toEqual([]);
  });

  it('returns budget items for existing budget', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Income', name: 'Dues Revenue', budgeted_amount: 50000, actual_amount: 45000, is_income: true },
        { category: 'Operating', name: 'Maintenance', budgeted_amount: 10000, actual_amount: 8000, is_income: false },
      ],
      error: null,
    });

    const result = await getBudgetComparison(COMMUNITY_ID, [2026]);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(2);
    expect(result[0].items[0]).toMatchObject({
      category: 'Income',
      name: 'Dues Revenue',
      budgeted: 50000,
      actual: 45000,
      is_income: true,
    });
  });

  it('handles missing actual_amount gracefully', async () => {
    setTableSingleResult('budgets', { data: { id: 'budget-1' }, error: null });
    setTableResult('budget_line_items', {
      data: [
        { category: 'Operating', name: 'Insurance', budgeted_amount: 5000, actual_amount: null, is_income: false },
      ],
      error: null,
    });

    const result = await getBudgetComparison(COMMUNITY_ID, [2026]);

    // null actual_amount should be treated as 0
    expect(result[0].items[0].actual).toBe(0);
  });
});

// ─── generateChartOfAccountsCSV() ───────────────────────────────────────────

describe('generateChartOfAccountsCSV', () => {
  it('generates correct CSV header', () => {
    const csv = generateChartOfAccountsCSV([]);
    expect(csv).toBe('Account Code,Account Name,Type,Fund,Debit,Credit,Balance');
  });

  it('includes all accounts with amounts divided by 100', () => {
    const accounts = [
      {
        account_id: 'a-1',
        code: '1000',
        name: 'Operating Cash',
        account_type: 'asset' as const,
        fund: 'operating' as const,
        debit_total: 150000,
        credit_total: 50000,
        balance: 100000,
      },
      {
        account_id: 'a-2',
        code: '4000',
        name: 'Dues Revenue',
        account_type: 'revenue' as const,
        fund: 'operating' as const,
        debit_total: 0,
        credit_total: 100000,
        balance: 100000,
      },
    ];

    const csv = generateChartOfAccountsCSV(accounts);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe('1000,"Operating Cash",asset,operating,1500.00,500.00,1000.00');
    expect(lines[2]).toBe('4000,"Dues Revenue",revenue,operating,0.00,1000.00,1000.00');
  });

  it('handles accounts with fractional cents correctly', () => {
    const accounts = [{
      account_id: 'a-1',
      code: '1000',
      name: 'Test Account',
      account_type: 'asset' as const,
      fund: 'operating' as const,
      debit_total: 12345,
      credit_total: 0,
      balance: 12345,
    }];

    const csv = generateChartOfAccountsCSV(accounts);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('123.45');
  });

  it('escapes account names with commas', () => {
    const accounts = [{
      account_id: 'a-1',
      code: '5000',
      name: 'Repairs, Maintenance',
      account_type: 'expense' as const,
      fund: 'operating' as const,
      debit_total: 5000,
      credit_total: 0,
      balance: 5000,
    }];

    const csv = generateChartOfAccountsCSV(accounts);
    // Name should be quoted to handle comma
    expect(csv).toContain('"Repairs, Maintenance"');
  });
});

// ─── generateJournalEntriesCSV() ────────────────────────────────────────────

describe('generateJournalEntriesCSV', () => {
  it('generates correct CSV header', () => {
    const csv = generateJournalEntriesCSV([]);
    expect(csv).toBe('Date,Description,Source,Status,Memo,Account Code,Account Name,Debit,Credit');
  });

  it('generates one row per journal line, amounts divided by 100', () => {
    const entries = [
      {
        entry_date: '2026-03-01',
        description: 'Monthly dues payment',
        source: 'payment_received',
        status: 'posted',
        memo: null,
        lines: [
          { code: '1000', name: 'Operating Cash', debit: 5000, credit: 0 },
          { code: '1100', name: 'Accounts Receivable', debit: 0, credit: 5000 },
        ],
      },
    ];

    const csv = generateJournalEntriesCSV(entries);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // header + 2 line items
    expect(lines[1]).toBe('2026-03-01,"Monthly dues payment",payment_received,posted,"",1000,"Operating Cash",50.00,0.00');
    expect(lines[2]).toBe('2026-03-01,"Monthly dues payment",payment_received,posted,"",1100,"Accounts Receivable",0.00,50.00');
  });

  it('includes memo when present', () => {
    const entries = [
      {
        entry_date: '2026-03-01',
        description: 'Test',
        source: 'manual',
        status: 'posted',
        memo: 'Quarterly adjustment',
        lines: [
          { code: '1000', name: 'Cash', debit: 1000, credit: 0 },
        ],
      },
    ];

    const csv = generateJournalEntriesCSV(entries);
    expect(csv).toContain('"Quarterly adjustment"');
  });

  it('handles multiple entries', () => {
    const entries = [
      {
        entry_date: '2026-03-01',
        description: 'Entry 1',
        source: 'manual',
        status: 'posted',
        memo: null,
        lines: [
          { code: '1000', name: 'Cash', debit: 1000, credit: 0 },
          { code: '4000', name: 'Revenue', debit: 0, credit: 1000 },
        ],
      },
      {
        entry_date: '2026-03-02',
        description: 'Entry 2',
        source: 'manual',
        status: 'posted',
        memo: 'Second entry',
        lines: [
          { code: '5000', name: 'Maintenance', debit: 500, credit: 0 },
          { code: '1000', name: 'Cash', debit: 0, credit: 500 },
        ],
      },
    ];

    const csv = generateJournalEntriesCSV(entries);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(5); // header + 4 line items (2 per entry)
  });
});
