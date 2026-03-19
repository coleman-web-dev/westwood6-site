'use server';

import {
  postInvoiceCreated,
  postPaymentReceived,
  createJournalEntry,
} from '@/lib/utils/accounting-entries';

export interface GlPostRequest {
  type: 'invoice_created' | 'payment_received' | 'late_fee' | 'service_fee_absorbed' | 'service_fee_revenue' | 'security_deposit' | 'overpayment';
  communityId: string;
  invoiceId?: string;
  unitId: string;
  amount: number;
  description: string;
  entryDate?: string;
  lines?: { accountCode: string; debit: number; credit: number; description?: string }[];
}

/**
 * Post GL journal entries for ledger import rows.
 * Runs server-side so it can use createAdminClient().
 * Processes a batch of GL requests and returns the count of entries posted.
 */
export async function postLedgerGlBatch(
  requests: GlPostRequest[]
): Promise<{ posted: number; errors: string[] }> {
  let posted = 0;
  const errors: string[] = [];

  for (const req of requests) {
    try {
      switch (req.type) {
        case 'invoice_created':
          await postInvoiceCreated(
            req.communityId,
            req.invoiceId!,
            req.unitId,
            req.amount,
            req.description,
          );
          posted++;
          break;

        case 'payment_received':
          await postPaymentReceived(
            req.communityId,
            req.invoiceId!,
            req.unitId,
            req.amount,
            req.description,
          );
          posted++;
          break;

        case 'late_fee':
        case 'service_fee_absorbed':
        case 'service_fee_revenue':
        case 'security_deposit':
        case 'overpayment':
          if (req.lines) {
            await createJournalEntry({
              communityId: req.communityId,
              entryDate: req.entryDate,
              description: req.description,
              source: req.type === 'late_fee' ? 'late_fee_applied' :
                      req.type === 'overpayment' ? 'wallet_credit' : 'bank_sync',
              referenceType: req.invoiceId ? 'invoice' : undefined,
              referenceId: req.invoiceId,
              unitId: req.unitId,
              lines: req.lines,
            });
            posted++;
          }
          break;
      }
    } catch (err) {
      errors.push(`GL ${req.type}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  return { posted, errors };
}
