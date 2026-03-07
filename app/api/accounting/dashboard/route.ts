import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get('community_id');
  if (!communityId) {
    return NextResponse.json({ error: 'community_id required' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Get posted journal entry IDs from the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const startDate = twelveMonthsAgo.toISOString().split('T')[0];

  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date')
    .eq('community_id', communityId)
    .eq('status', 'posted')
    .gte('entry_date', startDate)
    .order('entry_date');

  if (!entries || entries.length === 0) {
    return NextResponse.json({ monthly_flow: [], expense_breakdown: [] });
  }

  const entryIds = entries.map((e) => e.id);

  // Get all journal lines for these entries with account info
  const { data: lines } = await admin
    .from('journal_lines')
    .select('account_id, debit, credit, journal_entry_id')
    .in('journal_entry_id', entryIds);

  // Get accounts for type lookup
  const { data: accounts } = await admin
    .from('accounts')
    .select('id, code, name, account_type')
    .eq('community_id', communityId)
    .eq('is_active', true);

  if (!lines || !accounts) {
    return NextResponse.json({ monthly_flow: [], expense_breakdown: [] });
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const entryDateMap = new Map(entries.map((e) => [e.id, e.entry_date]));

  // Monthly cash flow: group by month, sum revenue vs expense
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  // Initialize 12 months
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { income: 0, expenses: 0 });
  }

  // Expense breakdown accumulator
  const expenseMap = new Map<string, { code: string; name: string; amount: number }>();

  for (const line of lines) {
    const account = accountMap.get(line.account_id);
    if (!account) continue;

    const entryDate = entryDateMap.get(line.journal_entry_id);
    if (!entryDate) continue;

    const d = new Date(entryDate);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthData = monthlyMap.get(monthKey);

    if (account.account_type === 'revenue') {
      const amount = line.credit - line.debit; // revenue normal balance is credit
      if (monthData) monthData.income += amount;
    } else if (account.account_type === 'expense') {
      const amount = line.debit - line.credit; // expense normal balance is debit
      if (monthData) monthData.expenses += amount;

      // Accumulate for breakdown
      const existing = expenseMap.get(line.account_id) || {
        code: account.code,
        name: account.name,
        amount: 0,
      };
      existing.amount += amount;
      expenseMap.set(line.account_id, existing);
    }
  }

  // Format monthly flow
  const monthly_flow = Array.from(monthlyMap.entries()).map(([key, data]) => {
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return {
      month: key,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: data.income,
      expenses: data.expenses,
    };
  });

  // Format expense breakdown: top 8 by amount
  const expense_breakdown = Array.from(expenseMap.entries())
    .map(([account_id, data]) => ({
      account_id,
      code: data.code,
      name: data.name,
      amount: data.amount,
    }))
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return NextResponse.json({ monthly_flow, expense_breakdown });
}
