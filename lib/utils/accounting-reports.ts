import { createAdminClient } from '@/lib/supabase/admin';
import type {
  TrialBalanceRow,
  BalanceSheetReport,
  IncomeStatementReport,
  FundSummary,
} from '@/lib/types/accounting';

/**
 * Generate trial balance as of a given date.
 * Sums all posted journal lines grouped by account.
 */
export async function getTrialBalance(
  communityId: string,
  asOfDate?: string,
): Promise<TrialBalanceRow[]> {
  const supabase = createAdminClient();
  const cutoff = asOfDate || new Date().toISOString().split('T')[0];

  // Get all accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, fund, normal_balance')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .order('display_order');

  if (!accounts || accounts.length === 0) return [];

  // Get summed journal lines for posted entries up to the cutoff date
  const { data: lines } = await supabase
    .from('journal_lines')
    .select('account_id, debit, credit, journal_entry_id')
    .in(
      'journal_entry_id',
      (await supabase
        .from('journal_entries')
        .select('id')
        .eq('community_id', communityId)
        .eq('status', 'posted')
        .lte('entry_date', cutoff)
      ).data?.map((e) => e.id) || [],
    );

  // Aggregate by account
  const accountTotals = new Map<string, { debit: number; credit: number }>();
  for (const line of lines || []) {
    const existing = accountTotals.get(line.account_id) || { debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    accountTotals.set(line.account_id, existing);
  }

  return accounts.map((acct) => {
    const totals = accountTotals.get(acct.id) || { debit: 0, credit: 0 };
    const balance = acct.normal_balance === 'debit'
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

    return {
      account_id: acct.id,
      code: acct.code,
      name: acct.name,
      account_type: acct.account_type,
      fund: acct.fund,
      debit_total: totals.debit,
      credit_total: totals.credit,
      balance,
    };
  });
}

/** Generate balance sheet (Assets = Liabilities + Equity) */
export async function getBalanceSheet(
  communityId: string,
  asOfDate?: string,
): Promise<BalanceSheetReport> {
  const cutoff = asOfDate || new Date().toISOString().split('T')[0];
  const trialBalance = await getTrialBalance(communityId, cutoff);

  const assets = trialBalance.filter((r) => r.account_type === 'asset');
  const liabilities = trialBalance.filter((r) => r.account_type === 'liability');
  const equity = trialBalance.filter((r) => r.account_type === 'equity');

  // Include net income in equity (revenue - expenses)
  const revenue = trialBalance.filter((r) => r.account_type === 'revenue');
  const expenses = trialBalance.filter((r) => r.account_type === 'expense');
  const netIncome = revenue.reduce((s, r) => s + r.balance, 0) - expenses.reduce((s, r) => s + r.balance, 0);

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equity.reduce((s, r) => s + r.balance, 0) + netIncome;

  return {
    as_of_date: cutoff,
    assets: { label: 'Assets', accounts: assets, total: totalAssets },
    liabilities: { label: 'Liabilities', accounts: liabilities, total: totalLiabilities },
    equity: { label: 'Equity', accounts: equity, total: totalEquity },
    total_assets: totalAssets,
    total_liabilities_equity: totalLiabilities + totalEquity,
    is_balanced: totalAssets === totalLiabilities + totalEquity,
  };
}

/** Generate income statement for a date range */
export async function getIncomeStatement(
  communityId: string,
  startDate: string,
  endDate: string,
): Promise<IncomeStatementReport> {
  const supabase = createAdminClient();

  // Get revenue and expense accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name, account_type, fund, normal_balance')
    .eq('community_id', communityId)
    .eq('is_active', true)
    .in('account_type', ['revenue', 'expense'])
    .order('display_order');

  if (!accounts || accounts.length === 0) {
    return {
      start_date: startDate,
      end_date: endDate,
      revenue: { label: 'Revenue', accounts: [], total: 0 },
      expenses: { label: 'Expenses', accounts: [], total: 0 },
      net_income: 0,
    };
  }

  // Get journal entry IDs in date range
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('community_id', communityId)
    .eq('status', 'posted')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate);

  const entryIds = entries?.map((e) => e.id) || [];

  // Get lines for those entries
  const { data: lines } = entryIds.length > 0
    ? await supabase
        .from('journal_lines')
        .select('account_id, debit, credit')
        .in('journal_entry_id', entryIds)
    : { data: [] };

  const accountTotals = new Map<string, { debit: number; credit: number }>();
  for (const line of lines || []) {
    const existing = accountTotals.get(line.account_id) || { debit: 0, credit: 0 };
    existing.debit += line.debit;
    existing.credit += line.credit;
    accountTotals.set(line.account_id, existing);
  }

  const rows: TrialBalanceRow[] = accounts.map((acct) => {
    const totals = accountTotals.get(acct.id) || { debit: 0, credit: 0 };
    const balance = acct.normal_balance === 'debit'
      ? totals.debit - totals.credit
      : totals.credit - totals.debit;

    return {
      account_id: acct.id,
      code: acct.code,
      name: acct.name,
      account_type: acct.account_type,
      fund: acct.fund,
      debit_total: totals.debit,
      credit_total: totals.credit,
      balance,
    };
  });

  const revenueRows = rows.filter((r) => r.account_type === 'revenue');
  const expenseRows = rows.filter((r) => r.account_type === 'expense');
  const totalRevenue = revenueRows.reduce((s, r) => s + r.balance, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + r.balance, 0);

  return {
    start_date: startDate,
    end_date: endDate,
    revenue: { label: 'Revenue', accounts: revenueRows, total: totalRevenue },
    expenses: { label: 'Expenses', accounts: expenseRows, total: totalExpenses },
    net_income: totalRevenue - totalExpenses,
  };
}

/** Get fund summary for dashboard cards */
export async function getFundSummary(communityId: string): Promise<FundSummary> {
  const trialBalance = await getTrialBalance(communityId);

  const operatingCash = trialBalance.find((r) => r.code === '1000')?.balance ?? 0;
  const reserveCash = trialBalance.find((r) => r.code === '1010')?.balance ?? 0;
  const arDues = trialBalance.find((r) => r.code === '1100')?.balance ?? 0;
  const arSpecial = trialBalance.find((r) => r.code === '1110')?.balance ?? 0;

  const totalRevenue = trialBalance
    .filter((r) => r.account_type === 'revenue')
    .reduce((s, r) => s + r.balance, 0);
  const totalExpenses = trialBalance
    .filter((r) => r.account_type === 'expense')
    .reduce((s, r) => s + r.balance, 0);

  return {
    operating_balance: operatingCash,
    reserve_balance: reserveCash,
    total_ar: arDues + arSpecial,
    total_revenue_ytd: totalRevenue,
    total_expenses_ytd: totalExpenses,
  };
}
