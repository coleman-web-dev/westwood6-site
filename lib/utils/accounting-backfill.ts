import { createAdminClient } from '@/lib/supabase/admin';
import type { JournalSource } from '@/lib/types/accounting';
import { v4 as uuidv4 } from 'uuid';

/**
 * Backfill journal entries from existing invoices, payments, and wallet transactions.
 * Uses bulk inserts for performance (handles 1000+ invoices within Vercel timeout).
 * Safe to run multiple times: skips invoices that already have journal entries.
 */
export async function backfillJournalEntries(
  communityId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ invoices: number; payments: number; walletCredits: number; lateFees: number; skipped: number; errors: number }> {
  const supabase = createAdminClient();
  const stats = { invoices: 0, payments: 0, walletCredits: 0, lateFees: 0, skipped: 0, errors: 0 };

  // 1. Check accounting is set up
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('community_id', communityId);

  if (!accounts || accounts.length === 0) {
    console.error('Backfill: no accounts found. Seed chart of accounts first.');
    return stats;
  }

  const codeToId = new Map(accounts.map((a) => [a.code, a.id]));

  // 2. Get all invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, unit_id, amount, amount_paid, status, title, created_at, assessment_id, late_fee_amount, due_date')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });

  if (!invoices || invoices.length === 0) return stats;

  // 3. Get already-processed invoice IDs
  const { data: existingEntries } = await supabase
    .from('journal_entries')
    .select('reference_id')
    .eq('community_id', communityId)
    .eq('reference_type', 'invoice')
    .not('reference_id', 'is', null);

  const alreadyProcessed = new Set((existingEntries || []).map((e) => e.reference_id));

  // 4. Look up special assessments
  const assessmentIds = [...new Set(invoices.filter((i) => i.assessment_id).map((i) => i.assessment_id!))];
  const specialAssessmentIds = new Set<string>();
  if (assessmentIds.length > 0) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, type')
      .in('id', assessmentIds);
    for (const a of assessments || []) {
      if (a.type === 'special') specialAssessmentIds.add(a.id);
    }
  }

  // 5. Build all journal entries + lines in memory
  const allEntries: {
    id: string;
    community_id: string;
    entry_date: string;
    description: string;
    source: JournalSource;
    status: string;
    reference_type: string;
    reference_id: string;
    unit_id: string;
  }[] = [];
  const allLines: {
    journal_entry_id: string;
    account_id: string;
    debit: number;
    credit: number;
    description: string | null;
  }[] = [];

  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    onProgress?.(i + 1, invoices.length);

    if (alreadyProcessed.has(inv.id)) {
      stats.skipped++;
      continue;
    }

    const isSpecial = inv.assessment_id ? specialAssessmentIds.has(inv.assessment_id) : false;
    const arCode = isSpecial ? '1110' : '1100';
    const revenueCode = isSpecial ? '4010' : '4000';
    const baseAmount = inv.amount - (inv.late_fee_amount || 0);

    // Invoice created: DR AR, CR Revenue
    if (baseAmount > 0) {
      const entryId = uuidv4();
      allEntries.push({
        id: entryId,
        community_id: communityId,
        entry_date: today,
        description: `Invoice: ${inv.title}`,
        source: 'invoice_created',
        status: 'posted',
        reference_type: 'invoice',
        reference_id: inv.id,
        unit_id: inv.unit_id,
      });
      allLines.push(
        { journal_entry_id: entryId, account_id: codeToId.get(arCode)!, debit: baseAmount, credit: 0, description: 'Accounts Receivable' },
        { journal_entry_id: entryId, account_id: codeToId.get(revenueCode)!, debit: 0, credit: baseAmount, description: 'Assessment Revenue' },
      );
      stats.invoices++;
    }

    // Late fee: DR AR, CR Late Fee Revenue
    if (inv.late_fee_amount > 0 && codeToId.has('4100')) {
      const entryId = uuidv4();
      allEntries.push({
        id: entryId,
        community_id: communityId,
        entry_date: today,
        description: `Late fee: ${inv.title}`,
        source: 'late_fee_applied',
        status: 'posted',
        reference_type: 'invoice',
        reference_id: inv.id,
        unit_id: inv.unit_id,
      });
      allLines.push(
        { journal_entry_id: entryId, account_id: codeToId.get(arCode)!, debit: inv.late_fee_amount, credit: 0, description: 'Accounts Receivable' },
        { journal_entry_id: entryId, account_id: codeToId.get('4100')!, debit: 0, credit: inv.late_fee_amount, description: 'Late Fee Revenue' },
      );
      stats.lateFees++;
    }

    // Payment: DR Cash, CR AR
    if (inv.status === 'paid' || inv.status === 'partial') {
      const paidAmount = Math.min(inv.amount_paid || inv.amount, inv.amount);
      if (paidAmount > 0) {
        const entryId = uuidv4();
        allEntries.push({
          id: entryId,
          community_id: communityId,
          entry_date: today,
          description: `Payment: ${inv.title}`,
          source: 'payment_received',
          status: 'posted',
          reference_type: 'invoice',
          reference_id: inv.id,
          unit_id: inv.unit_id,
        });
        allLines.push(
          { journal_entry_id: entryId, account_id: codeToId.get('1000')!, debit: paidAmount, credit: 0, description: 'Operating Cash' },
          { journal_entry_id: entryId, account_id: codeToId.get(arCode)!, debit: 0, credit: paidAmount, description: 'Accounts Receivable' },
        );
        stats.payments++;
      }

      // Overpayment: DR Cash, CR Wallet Credits
      if (inv.amount_paid > inv.amount && codeToId.has('2110')) {
        const excess = inv.amount_paid - inv.amount;
        const entryId = uuidv4();
        allEntries.push({
          id: entryId,
          community_id: communityId,
          entry_date: today,
          description: `Overpayment: ${inv.title}`,
          source: 'wallet_credit',
          status: 'posted',
          reference_type: 'invoice',
          reference_id: inv.id,
          unit_id: inv.unit_id,
        });
        allLines.push(
          { journal_entry_id: entryId, account_id: codeToId.get('1000')!, debit: excess, credit: 0, description: 'Operating Cash' },
          { journal_entry_id: entryId, account_id: codeToId.get('2110')!, debit: 0, credit: excess, description: 'Wallet Credits' },
        );
        stats.walletCredits++;
      }
    }

    // Waived: DR Bad Debt, CR AR
    if (inv.status === 'waived' && codeToId.has('5800')) {
      const remaining = inv.amount - (inv.amount_paid || 0);
      if (remaining > 0) {
        const entryId = uuidv4();
        allEntries.push({
          id: entryId,
          community_id: communityId,
          entry_date: today,
          description: `Waived: ${inv.title}`,
          source: 'invoice_waived',
          status: 'posted',
          reference_type: 'invoice',
          reference_id: inv.id,
          unit_id: inv.unit_id,
        });
        allLines.push(
          { journal_entry_id: entryId, account_id: codeToId.get('5800')!, debit: remaining, credit: 0, description: 'Bad Debt Expense' },
          { journal_entry_id: entryId, account_id: codeToId.get(arCode)!, debit: 0, credit: remaining, description: 'Accounts Receivable' },
        );
      }
    }

    // Voided: DR Revenue, CR AR (reversal)
    if (inv.status === 'voided') {
      const entryId = uuidv4();
      allEntries.push({
        id: entryId,
        community_id: communityId,
        entry_date: today,
        description: `Voided: ${inv.title}`,
        source: 'invoice_voided',
        status: 'posted',
        reference_type: 'invoice',
        reference_id: inv.id,
        unit_id: inv.unit_id,
      });
      allLines.push(
        { journal_entry_id: entryId, account_id: codeToId.get(revenueCode)!, debit: inv.amount, credit: 0, description: 'Revenue Reversal' },
        { journal_entry_id: entryId, account_id: codeToId.get(arCode)!, debit: 0, credit: inv.amount, description: 'Accounts Receivable' },
      );
    }
  }

  // 6. Bulk insert in batches of 500
  const BATCH = 500;
  for (let i = 0; i < allEntries.length; i += BATCH) {
    const batch = allEntries.slice(i, i + BATCH);
    const { error } = await supabase.from('journal_entries').insert(batch);
    if (error) {
      console.error(`Backfill: failed to insert entries batch ${i}:`, error);
      stats.errors += batch.length;
    }
  }

  for (let i = 0; i < allLines.length; i += BATCH) {
    const batch = allLines.slice(i, i + BATCH);
    const { error } = await supabase.from('journal_lines').insert(batch);
    if (error) {
      console.error(`Backfill: failed to insert lines batch ${i}:`, error);
      stats.errors += batch.length;
    }
  }

  return stats;
}
