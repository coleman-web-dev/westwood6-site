import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrialBalance, getBalanceSheet, getIncomeStatement, getBudgetVariance, getCashFlowForecast } from '@/lib/utils/accounting-reports';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get('community_id');
  const report = req.nextUrl.searchParams.get('report');

  if (!communityId || !report) {
    return NextResponse.json({ error: 'community_id and report required' }, { status: 400 });
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

  const asOfDate = req.nextUrl.searchParams.get('as_of_date') || undefined;
  const startDate = req.nextUrl.searchParams.get('start_date') || '';
  const endDate = req.nextUrl.searchParams.get('end_date') || '';

  switch (report) {
    case 'trial-balance': {
      const data = await getTrialBalance(communityId, asOfDate);
      return NextResponse.json(data);
    }
    case 'balance-sheet': {
      const data = await getBalanceSheet(communityId, asOfDate);
      return NextResponse.json(data);
    }
    case 'income-statement': {
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'start_date and end_date required' }, { status: 400 });
      }
      const data = await getIncomeStatement(communityId, startDate, endDate);
      return NextResponse.json(data);
    }
    case 'budget-variance': {
      const year = parseInt(req.nextUrl.searchParams.get('year') || String(new Date().getFullYear()));
      const rows = await getBudgetVariance(communityId, year);
      return NextResponse.json({ rows });
    }
    case 'cash-flow': {
      const months = parseInt(req.nextUrl.searchParams.get('months') || '6');
      const rows = await getCashFlowForecast(communityId, months);
      return NextResponse.json({ rows });
    }
    default:
      return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
  }
}
