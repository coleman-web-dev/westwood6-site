'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildEstoppelSystemContext } from '@/lib/utils/estoppel-template';

/**
 * Fetch system fields on-demand for an estoppel request.
 * Uses the ledger approach (invoices + payments + wallet_transactions) to compute
 * an accurate balance, matching the household ledger logic.
 *
 * Called from the estoppel review dialog when a board member opens a request.
 */
export async function fetchEstoppelSystemFields(
  communityId: string,
  unitId: string | null,
): Promise<Record<string, string>> {
  // Auth check
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const supabase = createAdminClient();

  // Verify board membership
  const { data: member } = await supabase
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member || !['board', 'manager', 'super_admin'].includes(member.system_role)) {
    throw new Error('Board access required');
  }

  // Fetch community info
  const { data: community } = await supabase
    .from('communities')
    .select('name, address')
    .eq('id', communityId)
    .single();

  if (!unitId || !community) {
    // No unit, return minimal system fields
    return buildEstoppelSystemContext({
      communityName: community?.name || '',
      communityAddress: community?.address || '',
      assessmentAmount: null,
      assessmentFrequency: null,
      paidThroughDate: null,
      currentBalance: 0,
      lateFees: 0,
      specialAssessments: [],
      violations: [],
      completionDate: new Date().toLocaleDateString('en-US'),
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Fetch unit info + ledger data + assessment + violations + future specials in parallel
  const [unitResult, invoiceResult, paymentResult, walletResult, assessmentResult, lastPaidResult, violationResult, futureSpecialResult] =
    await Promise.all([
      supabase
        .from('units')
        .select('id, payment_frequency')
        .eq('id', unitId)
        .single(),
      supabase
        .from('invoices')
        .select('amount, amount_paid, status, due_date, title')
        .eq('unit_id', unitId)
        .neq('status', 'voided')
        .order('due_date', { ascending: true }),
      supabase
        .from('payments')
        .select('amount, created_at')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true }),
      supabase
        .from('wallet_transactions')
        .select('amount, type, created_at')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true }),
      supabase
        .from('assessments')
        .select('annual_amount, default_frequency')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .eq('type', 'regular')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('invoices')
        .select('due_date')
        .eq('unit_id', unitId)
        .eq('status', 'paid')
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('violations')
        .select('title, status, description')
        .eq('unit_id', unitId)
        .neq('status', 'resolved'),
      supabase
        .from('assessments')
        .select('title, annual_amount, installments, installment_start_date, fiscal_year_start')
        .eq('community_id', communityId)
        .eq('is_active', true)
        .eq('type', 'special')
        .gte('fiscal_year_end', today),
    ]);

  const invoices = invoiceResult.data ?? [];
  const payments = paymentResult.data ?? [];
  const walletTxs = walletResult.data ?? [];

  // Compute balance using ledger logic: charges - payments - wallet credits
  let balance = 0;
  for (const inv of invoices) {
    balance += inv.amount;
  }
  for (const pmt of payments) {
    balance -= pmt.amount;
  }
  for (const tx of walletTxs) {
    balance -= tx.amount;
  }

  // Compute late fees from overdue invoices
  const lateFees = invoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.amount - (inv.amount_paid || 0)), 0);

  // Assessment amount and frequency
  const unit = unitResult.data;
  const assessment = assessmentResult.data;
  const freq = unit?.payment_frequency || assessment?.default_frequency || 'monthly';
  const annualAmount = assessment?.annual_amount || 0;
  let assessmentAmount: number | null = null;
  if (annualAmount) {
    switch (freq) {
      case 'monthly':
        assessmentAmount = Math.round(annualAmount / 12);
        break;
      case 'quarterly':
        assessmentAmount = Math.round(annualAmount / 4);
        break;
      case 'semi_annual':
        assessmentAmount = Math.round(annualAmount / 2);
        break;
      case 'annual':
        assessmentAmount = annualAmount;
        break;
    }
  }

  // Paid through date from last paid invoice
  const lastPaidInvoice = lastPaidResult.data;
  const paidThroughDate = lastPaidInvoice?.due_date
    ? new Date(lastPaidInvoice.due_date).toLocaleDateString('en-US')
    : null;

  // Violations
  const violations = (violationResult.data ?? []).map((v) => ({
    title: v.title,
    status: v.status,
    description: v.description || undefined,
  }));

  // Future special assessments (approved but not yet fully billed)
  const futureSpecials = (futureSpecialResult.data ?? []).map((sa) => {
    const startDate = sa.installment_start_date || sa.fiscal_year_start;
    const dueDates = startDate
      ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US')
      : undefined;
    return {
      title: sa.title,
      amount: sa.annual_amount,
      dueDates,
    };
  });

  return buildEstoppelSystemContext({
    communityName: community.name,
    communityAddress: community.address || '',
    assessmentAmount,
    assessmentFrequency: freq,
    paidThroughDate,
    currentBalance: balance,
    lateFees,
    specialAssessments: [],
    violations,
    futureSpecialAssessments: futureSpecials,
    completionDate: new Date().toLocaleDateString('en-US'),
  });
}
