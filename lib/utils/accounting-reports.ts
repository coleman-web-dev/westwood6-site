import { createAdminClient } from '@/lib/supabase/admin';
import type {
  TrialBalanceRow,
  BalanceSheetReport,
  IncomeStatementReport,
  FundSummary,
  BudgetVarianceRow,
  CashFlowRow,
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

/** Get budget variance for a fiscal year */
export async function getBudgetVariance(
  communityId: string,
  fiscalYear: number,
): Promise<BudgetVarianceRow[]> {
  const supabase = createAdminClient();

  const { data: budget } = await supabase
    .from('budgets')
    .select('id')
    .eq('community_id', communityId)
    .eq('fiscal_year', fiscalYear)
    .single();

  if (!budget) return [];

  const { data: items } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('budget_id', budget.id)
    .order('category');

  if (!items) return [];

  // Get actual amounts from GL for the fiscal year
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;
  const incomeStatement = await getIncomeStatement(communityId, startDate, endDate);

  const actualByName = new Map<string, number>();
  for (const row of [...incomeStatement.revenue.accounts, ...incomeStatement.expenses.accounts]) {
    actualByName.set(row.name.toLowerCase(), row.balance);
  }

  return items.map((item) => {
    const actual = actualByName.get(item.name.toLowerCase()) || item.actual_amount || 0;
    const variance = item.is_income ? actual - item.budgeted_amount : item.budgeted_amount - actual;
    const variance_pct = item.budgeted_amount > 0
      ? ((actual / item.budgeted_amount) * 100)
      : actual > 0 ? 999 : 0;

    return {
      category: item.category,
      name: item.name,
      budgeted: item.budgeted_amount,
      actual,
      variance,
      variance_pct,
      is_income: item.is_income,
      over_threshold: !item.is_income && variance_pct > 80,
    };
  });
}

/** Get cash flow forecast for the next N months */
export async function getCashFlowForecast(
  communityId: string,
  months: number = 6,
): Promise<CashFlowRow[]> {
  const supabase = createAdminClient();

  // Get current cash position
  const trialBalance = await getTrialBalance(communityId);
  const currentCash = (trialBalance.find((r) => r.code === '1000')?.balance ?? 0)
    + (trialBalance.find((r) => r.code === '1010')?.balance ?? 0);

  // Get average monthly income and expenses from last 3 months
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  const incomeStatement = await getIncomeStatement(communityId, startDate, endDate);
  const avgMonthlyIncome = incomeStatement.revenue.total / 3;
  const avgMonthlyExpenses = incomeStatement.expenses.total / 3;

  // Get upcoming invoices for more accurate projections
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('amount, due_date')
    .eq('community_id', communityId)
    .in('status', ['pending', 'overdue'])
    .gte('due_date', now.toISOString().split('T')[0]);

  // Build monthly forecast
  const rows: CashFlowRow[] = [];
  let runningBalance = currentCash;

  for (let i = 0; i < months; i++) {
    const forecastDate = new Date(now);
    forecastDate.setMonth(forecastDate.getMonth() + i + 1);
    const month = forecastDate.toISOString().slice(0, 7);
    const label = forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    // Sum pending invoices due this month
    const monthInvoiceIncome = (pendingInvoices || [])
      .filter((inv) => inv.due_date?.startsWith(month))
      .reduce((sum, inv) => sum + inv.amount, 0);

    const projectedIncome = Math.max(monthInvoiceIncome, avgMonthlyIncome);
    const projectedExpenses = avgMonthlyExpenses;
    const netCashFlow = projectedIncome - projectedExpenses;
    runningBalance += netCashFlow;

    rows.push({
      month,
      label,
      projected_income: Math.round(projectedIncome),
      projected_expenses: Math.round(projectedExpenses),
      net_cash_flow: Math.round(netCashFlow),
      running_balance: Math.round(runningBalance),
    });
  }

  return rows;
}

/** Get budget comparison across multiple fiscal years */
export async function getBudgetComparison(
  communityId: string,
  years: number[],
): Promise<{ year: number; items: { category: string; name: string; budgeted: number; actual: number; is_income: boolean }[] }[]> {
  const supabase = createAdminClient();

  const results: { year: number; items: { category: string; name: string; budgeted: number; actual: number; is_income: boolean }[] }[] = [];

  for (const year of years) {
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('community_id', communityId)
      .eq('fiscal_year', year)
      .single();

    if (!budget) {
      results.push({ year, items: [] });
      continue;
    }

    const { data: items } = await supabase
      .from('budget_line_items')
      .select('category, name, budgeted_amount, actual_amount, is_income')
      .eq('budget_id', budget.id)
      .order('category');

    results.push({
      year,
      items: (items || []).map((i) => ({
        category: i.category,
        name: i.name,
        budgeted: i.budgeted_amount,
        actual: i.actual_amount || 0,
        is_income: i.is_income,
      })),
    });
  }

  return results;
}

/** Generate CSV export of chart of accounts */
export function generateChartOfAccountsCSV(accounts: TrialBalanceRow[]): string {
  const header = 'Account Code,Account Name,Type,Fund,Debit,Credit,Balance';
  const rows = accounts.map((a) =>
    `${a.code},"${a.name}",${a.account_type},${a.fund},${(a.debit_total / 100).toFixed(2)},${(a.credit_total / 100).toFixed(2)},${(a.balance / 100).toFixed(2)}`
  );
  return [header, ...rows].join('\n');
}

/** Generate CSV export of journal entries */
export function generateJournalEntriesCSV(
  entries: { entry_date: string; description: string; source: string; status: string; memo: string | null; lines: { code: string; name: string; debit: number; credit: number }[] }[],
): string {
  const header = 'Date,Description,Source,Status,Memo,Account Code,Account Name,Debit,Credit';
  const rows: string[] = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      rows.push(
        `${entry.entry_date},"${entry.description}",${entry.source},${entry.status},"${entry.memo || ''}",${line.code},"${line.name}",${(line.debit / 100).toFixed(2)},${(line.credit / 100).toFixed(2)}`
      );
    }
  }
  return [header, ...rows].join('\n');
}
