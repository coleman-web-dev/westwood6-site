import { createAdminClient } from '@/lib/supabase/admin';
import {
  postInvoiceCreated,
  postPaymentReceived,
  postOverpaymentWalletCredit,
  postInvoiceWaived,
  postInvoiceVoided,
  postLateFeeApplied,
} from '@/lib/utils/accounting-entries';

/**
 * Backfill journal entries from existing invoices, payments, and wallet transactions.
 * Called during setup wizard after seeding the chart of accounts.
 * Processes in chronological order to maintain correct ledger state.
 * Safe to run multiple times: skips invoices that already have journal entries.
 */
export async function backfillJournalEntries(
  communityId: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ invoices: number; payments: number; walletCredits: number; lateFees: number; skipped: number; errors: number }> {
  const supabase = createAdminClient();
  const stats = { invoices: 0, payments: 0, walletCredits: 0, lateFees: 0, skipped: 0, errors: 0 };

  // 1. Get all invoices for the community
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, unit_id, amount, amount_paid, status, title, created_at, assessment_id, late_fee_amount, due_date')
    .eq('community_id', communityId)
    .order('created_at', { ascending: true });

  if (!invoices) return stats;

  // 2. Get invoice IDs that already have journal entries (to prevent duplicates)
  const { data: existingEntries } = await supabase
    .from('journal_entries')
    .select('reference_id')
    .eq('community_id', communityId)
    .eq('reference_type', 'invoice')
    .not('reference_id', 'is', null);

  const alreadyProcessed = new Set((existingEntries || []).map((e) => e.reference_id));

  // 3. Look up which assessments are special type
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

  const total = invoices.length;

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    onProgress?.(i + 1, total);

    // Skip if already has journal entries
    if (alreadyProcessed.has(inv.id)) {
      stats.skipped++;
      continue;
    }

    try {
      // Post invoice creation entry (base amount without late fee)
      const isSpecial = inv.assessment_id ? specialAssessmentIds.has(inv.assessment_id) : false;
      const baseAmount = inv.amount - (inv.late_fee_amount || 0);
      await postInvoiceCreated(communityId, inv.id, inv.unit_id, baseAmount, inv.title, isSpecial);
      stats.invoices++;

      // Post late fee entry if applicable
      if (inv.late_fee_amount > 0) {
        await postLateFeeApplied(communityId, inv.id, inv.unit_id, inv.late_fee_amount);
        stats.lateFees++;
      }

      // Post payment if paid or partial
      if (inv.status === 'paid' || inv.status === 'partial') {
        const paidAmount = inv.amount_paid || inv.amount;
        await postPaymentReceived(communityId, inv.id, inv.unit_id, Math.min(paidAmount, inv.amount), inv.title);
        stats.payments++;

        // Check for overpayment
        if (inv.amount_paid > inv.amount) {
          const excess = inv.amount_paid - inv.amount;
          await postOverpaymentWalletCredit(communityId, inv.id, inv.unit_id, excess);
          stats.walletCredits++;
        }
      }

      // Post waived
      if (inv.status === 'waived') {
        const remaining = inv.amount - (inv.amount_paid || 0);
        if (remaining > 0) {
          await postInvoiceWaived(communityId, inv.id, inv.unit_id, remaining, inv.title);
        }
      }

      // Post voided
      if (inv.status === 'voided') {
        await postInvoiceVoided(communityId, inv.id, inv.unit_id, inv.amount, inv.title);
      }
    } catch (error) {
      console.error(`Backfill error for invoice ${inv.id}:`, error);
      stats.errors++;
    }
  }

  return stats;
}
