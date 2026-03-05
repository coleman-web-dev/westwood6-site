import { createAdminClient } from '@/lib/supabase/admin';
import type { JournalSource } from '@/lib/types/accounting';

/**
 * Core function to create a journal entry with balanced debit/credit lines.
 * Uses admin client to bypass RLS (called from webhooks, server actions).
 * Returns null silently if accounting is not set up for the community.
 */
export async function createJournalEntry(params: {
  communityId: string;
  entryDate?: string;
  description: string;
  source: JournalSource;
  referenceType?: string;
  referenceId?: string;
  unitId?: string;
  vendorId?: string;
  memo?: string;
  createdBy?: string;
  lines: { accountCode: string; debit: number; credit: number; description?: string }[];
}): Promise<string | null> {
  const supabase = createAdminClient();

  // Check if accounting is set up (accounts exist for this community)
  const { count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', params.communityId)
    .limit(1);

  if (!count || count === 0) return null;

  // Resolve account codes to account IDs
  const codes = params.lines.map((l) => l.accountCode);
  const { data: accounts, error: acctError } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('community_id', params.communityId)
    .in('code', codes);

  if (acctError || !accounts || accounts.length === 0) {
    console.error('Accounting: failed to resolve account codes', acctError);
    return null;
  }

  const codeToId = new Map(accounts.map((a) => [a.code, a.id]));

  // Validate all codes resolved
  for (const line of params.lines) {
    if (!codeToId.has(line.accountCode)) {
      console.error(`Accounting: account code not found: ${line.accountCode}`);
      return null;
    }
  }

  // Validate debits = credits
  const totalDebit = params.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = params.lines.reduce((sum, l) => sum + l.credit, 0);
  if (totalDebit !== totalCredit) {
    console.error(`Accounting: unbalanced entry. Debits=${totalDebit}, Credits=${totalCredit}`);
    return null;
  }

  // Create journal entry
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      community_id: params.communityId,
      entry_date: params.entryDate || new Date().toISOString().split('T')[0],
      description: params.description,
      source: params.source,
      status: 'posted',
      reference_type: params.referenceType || null,
      reference_id: params.referenceId || null,
      unit_id: params.unitId || null,
      vendor_id: params.vendorId || null,
      memo: params.memo || null,
      created_by: params.createdBy || null,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    console.error('Accounting: failed to create journal entry', entryError);
    return null;
  }

  // Create journal lines
  const lines = params.lines.map((l) => ({
    journal_entry_id: entry.id,
    account_id: codeToId.get(l.accountCode)!,
    debit: l.debit,
    credit: l.credit,
    description: l.description || null,
  }));

  const { error: linesError } = await supabase.from('journal_lines').insert(lines);

  if (linesError) {
    console.error('Accounting: failed to create journal lines', linesError);
    // Clean up the orphaned entry
    await supabase.from('journal_entries').delete().eq('id', entry.id);
    return null;
  }

  return entry.id;
}

// ─── Convenience Wrappers ──────────────────────────────────────────

/** Invoice created: DR Accounts Receivable, CR Assessment Revenue */
export async function postInvoiceCreated(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
  isSpecial = false,
) {
  return createJournalEntry({
    communityId,
    description: `Invoice: ${description}`,
    source: 'invoice_created',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: isSpecial ? '1110' : '1100', debit: amount, credit: 0, description: 'Accounts Receivable' },
      { accountCode: isSpecial ? '4010' : '4000', debit: 0, credit: amount, description: 'Assessment Revenue' },
    ],
  });
}

/** Payment received: DR Operating Cash, CR Accounts Receivable */
export async function postPaymentReceived(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  return createJournalEntry({
    communityId,
    description: `Payment: ${description}`,
    source: 'payment_received',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '1000', debit: amount, credit: 0, description: 'Operating Cash' },
      { accountCode: '1100', debit: 0, credit: amount, description: 'Accounts Receivable' },
    ],
  });
}

/** Overpayment credited to wallet: DR Operating Cash, CR Wallet Credits (liability) */
export async function postOverpaymentWalletCredit(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
) {
  return createJournalEntry({
    communityId,
    description: 'Overpayment credited to wallet',
    source: 'wallet_credit',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '1000', debit: amount, credit: 0, description: 'Operating Cash' },
      { accountCode: '2110', debit: 0, credit: amount, description: 'Wallet Credits' },
    ],
  });
}

/** Wallet applied to invoice: DR Wallet Credits, CR Accounts Receivable */
export async function postWalletApplied(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
) {
  return createJournalEntry({
    communityId,
    description: 'Wallet balance applied to invoice',
    source: 'wallet_debit',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '2110', debit: amount, credit: 0, description: 'Wallet Credits' },
      { accountCode: '1100', debit: 0, credit: amount, description: 'Accounts Receivable' },
    ],
  });
}

/** Late fee applied: DR Accounts Receivable, CR Late Fee Revenue */
export async function postLateFeeApplied(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
) {
  return createJournalEntry({
    communityId,
    description: 'Late fee applied',
    source: 'late_fee_applied',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '1100', debit: amount, credit: 0, description: 'Accounts Receivable' },
      { accountCode: '4100', debit: 0, credit: amount, description: 'Late Fee Revenue' },
    ],
  });
}

/** Invoice waived: DR Bad Debt Expense, CR Accounts Receivable */
export async function postInvoiceWaived(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  return createJournalEntry({
    communityId,
    description: `Invoice waived: ${description}`,
    source: 'invoice_waived',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '5800', debit: amount, credit: 0, description: 'Bad Debt Expense' },
      { accountCode: '1100', debit: 0, credit: amount, description: 'Accounts Receivable' },
    ],
  });
}

/** Invoice voided (reversal): DR Assessment Revenue, CR Accounts Receivable */
export async function postInvoiceVoided(
  communityId: string,
  invoiceId: string,
  unitId: string,
  amount: number,
  description: string,
) {
  return createJournalEntry({
    communityId,
    description: `Invoice voided: ${description}`,
    source: 'invoice_voided',
    referenceType: 'invoice',
    referenceId: invoiceId,
    unitId,
    lines: [
      { accountCode: '4000', debit: amount, credit: 0, description: 'Assessment Revenue (reversal)' },
      { accountCode: '1100', debit: 0, credit: amount, description: 'Accounts Receivable' },
    ],
  });
}

/** Refund issued: DR Accounts Receivable, CR Operating Cash */
export async function postRefund(
  communityId: string,
  referenceId: string,
  unitId: string,
  amount: number,
) {
  return createJournalEntry({
    communityId,
    description: 'Refund issued',
    source: 'refund',
    referenceType: 'payment',
    referenceId,
    unitId,
    lines: [
      { accountCode: '1100', debit: amount, credit: 0, description: 'Accounts Receivable' },
      { accountCode: '1000', debit: 0, credit: amount, description: 'Operating Cash' },
    ],
  });
}

/** Vendor payment: DR expense account, CR Operating Cash */
export async function postVendorPayment(
  communityId: string,
  vendorId: string,
  amount: number,
  expenseAccountCode: string,
  description: string,
  entryDate?: string,
  memo?: string,
  createdBy?: string,
) {
  return createJournalEntry({
    communityId,
    entryDate,
    description: `Vendor payment: ${description}`,
    source: 'vendor_payment',
    referenceType: 'vendor',
    referenceId: vendorId,
    vendorId,
    memo,
    createdBy,
    lines: [
      { accountCode: expenseAccountCode, debit: amount, credit: 0, description },
      { accountCode: '1000', debit: 0, credit: amount, description: 'Operating Cash' },
    ],
  });
}

/**
 * Reverse an existing journal entry.
 * Creates a new entry with swapped debits/credits and links them.
 */
export async function reverseJournalEntry(
  communityId: string,
  entryId: string,
  reason?: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  // Fetch original entry + lines
  const { data: original } = await supabase
    .from('journal_entries')
    .select('*, journal_lines(*)')
    .eq('id', entryId)
    .eq('community_id', communityId)
    .single();

  if (!original || original.status === 'reversed') return null;

  // Create reversal entry
  const { data: reversal, error: revError } = await supabase
    .from('journal_entries')
    .insert({
      community_id: communityId,
      entry_date: new Date().toISOString().split('T')[0],
      description: `Reversal: ${original.description}`,
      source: original.source,
      status: 'posted',
      reference_type: original.reference_type,
      reference_id: original.reference_id,
      unit_id: original.unit_id,
      reversal_of: entryId,
      memo: reason || 'Reversal of posted entry',
    })
    .select('id')
    .single();

  if (revError || !reversal) return null;

  // Swap debits and credits
  const reversalLines = (original.journal_lines || []).map((line: { account_id: string; debit: number; credit: number; description: string | null }) => ({
    journal_entry_id: reversal.id,
    account_id: line.account_id,
    debit: line.credit,
    credit: line.debit,
    description: line.description,
  }));

  await supabase.from('journal_lines').insert(reversalLines);

  // Mark original as reversed
  await supabase
    .from('journal_entries')
    .update({ status: 'reversed', reversed_by: reversal.id })
    .eq('id', entryId);

  return reversal.id;
}
