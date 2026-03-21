import type { SupabaseClient } from '@supabase/supabase-js';
import { postWalletApplied } from '@/lib/utils/accounting-entries';

export interface ApplyResult {
  applied: number; // cents applied from wallet
  invoiceStatus: 'paid' | 'partial' | 'pending';
  newWalletBalance: number;
}

/**
 * Auto-apply a unit's wallet balance to a single invoice.
 * If balance covers the full amount, marks the invoice as 'paid'.
 * If partial, marks as 'partial' and sets amount_paid.
 * If zero balance, does nothing.
 */
export async function applyWalletToInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
  invoiceAmount: number,
  invoiceTitle: string,
  unitId: string,
  communityId: string,
  memberId: string | null,
  existingAmountPaid: number = 0
): Promise<ApplyResult> {
  // 1. Fetch wallet balance
  const { data: wallet } = await supabase
    .from('unit_wallets')
    .select('balance')
    .eq('unit_id', unitId)
    .single();

  const currentBalance = wallet?.balance ?? 0;

  if (currentBalance <= 0) {
    return { applied: 0, invoiceStatus: 'pending', newWalletBalance: currentBalance };
  }

  // 2. Calculate apply amount (against remaining balance, not full amount)
  const remaining = invoiceAmount - existingAmountPaid;
  const applyAmount = Math.min(currentBalance, remaining);
  const fullyPaid = (existingAmountPaid + applyAmount) >= invoiceAmount;
  const newStatus = fullyPaid ? 'paid' : 'partial';
  const newBalance = currentBalance - applyAmount;

  // 3. Update invoice
  const invoiceUpdate: Record<string, unknown> = {
    status: newStatus,
    amount_paid: existingAmountPaid + applyAmount,
  };
  if (fullyPaid) {
    invoiceUpdate.paid_at = new Date().toISOString();
  }

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update(invoiceUpdate)
    .eq('id', invoiceId);

  if (invoiceError) {
    return { applied: 0, invoiceStatus: 'pending', newWalletBalance: currentBalance };
  }

  // 4. Insert wallet transaction
  await supabase.from('wallet_transactions').insert({
    unit_id: unitId,
    community_id: communityId,
    member_id: memberId,
    amount: -applyAmount,
    type: 'payment_applied',
    reference_id: invoiceId,
    description: `Auto-applied to: ${invoiceTitle}`,
    created_by: memberId,
  });

  // 5. Update wallet balance
  await supabase
    .from('unit_wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('unit_id', unitId);

  return { applied: applyAmount, invoiceStatus: newStatus, newWalletBalance: newBalance };
}

/**
 * Auto-apply wallet balances to a batch of invoices (e.g., after assessment generation).
 * Groups invoices by unit, fetches all affected wallets, and applies funds
 * sequentially per unit (processing invoices in the order provided).
 */
export async function applyWalletToInvoiceBatch(
  supabase: SupabaseClient,
  invoices: { id: string; amount: number; unit_id: string; title: string }[],
  communityId: string,
  memberId: string | null
): Promise<{ totalApplied: number; unitsAffected: number }> {
  if (invoices.length === 0) {
    return { totalApplied: 0, unitsAffected: 0 };
  }

  // Group invoices by unit_id
  const byUnit = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const group = byUnit.get(inv.unit_id) ?? [];
    group.push(inv);
    byUnit.set(inv.unit_id, group);
  }

  // Fetch all affected wallets in one query
  const unitIds = [...byUnit.keys()];
  const { data: wallets } = await supabase
    .from('unit_wallets')
    .select('unit_id, balance')
    .in('unit_id', unitIds);

  const walletMap = new Map<string, number>();
  for (const w of (wallets ?? []) as { unit_id: string; balance: number }[]) {
    walletMap.set(w.unit_id, w.balance);
  }

  let totalApplied = 0;
  let unitsAffected = 0;

  // Process each unit's invoices
  for (const [unitId, unitInvoices] of byUnit) {
    let balance = walletMap.get(unitId) ?? 0;
    if (balance <= 0) continue;

    let unitApplied = 0;

    for (const inv of unitInvoices) {
      if (balance <= 0) break;

      const applyAmount = Math.min(balance, inv.amount);
      const fullyPaid = applyAmount >= inv.amount;
      const newStatus = fullyPaid ? 'paid' : 'partial';

      // Update invoice
      const invoiceUpdate: Record<string, unknown> = {
        status: newStatus,
        amount_paid: applyAmount,
      };
      if (fullyPaid) {
        invoiceUpdate.paid_at = new Date().toISOString();
      }

      const { error: invUpdateError } = await supabase
        .from('invoices')
        .update(invoiceUpdate)
        .eq('id', inv.id);

      // If invoice update failed, skip deducting from balance
      if (invUpdateError) {
        console.error(`Failed to apply wallet to invoice ${inv.id}:`, invUpdateError);
        continue;
      }

      // Insert wallet transaction
      await supabase.from('wallet_transactions').insert({
        unit_id: unitId,
        community_id: communityId,
        member_id: memberId,
        amount: -applyAmount,
        type: 'payment_applied',
        reference_id: inv.id,
        description: `Auto-applied to: ${inv.title}`,
        created_by: memberId,
      });

      // Post GL journal entry for wallet application
      postWalletApplied(communityId, inv.id, unitId, applyAmount).catch(() => {});

      balance -= applyAmount;
      unitApplied += applyAmount;
    }

    if (unitApplied > 0) {
      // Update wallet balance once per unit
      await supabase
        .from('unit_wallets')
        .update({ balance, updated_at: new Date().toISOString() })
        .eq('unit_id', unitId);

      totalApplied += unitApplied;
      unitsAffected++;
    }
  }

  return { totalApplied, unitsAffected };
}
