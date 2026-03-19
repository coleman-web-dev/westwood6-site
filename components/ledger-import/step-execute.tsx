'use client';

import { useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Loader2, FileText, CreditCard, Wallet, BookOpen, Download, Shield } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Progress } from '@/components/shared/ui/progress';
import { createClient } from '@/lib/supabase/client';
import {
  type MatchedRow,
  type ImportResult,
  calculateUnitBalances,
  formatCents,
  resolveChargeType,
} from '@/lib/utils/ledger-import';
import type { ImportConfig, ServiceFeeHandling } from './step-review';
import { postLedgerGlBatch, type GlPostRequest } from '@/lib/actions/ledger-gl-actions';

interface StepExecuteProps {
  matchedRows: MatchedRow[];
  config: ImportConfig;
  communityId: string;
  fileName: string;
  onComplete: () => void;
}

export function StepExecute({
  matchedRows,
  config,
  communityId,
  fileName,
  onComplete,
}: StepExecuteProps) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [result, setResult] = useState<ImportResult>({
    invoicesCreated: 0,
    paymentsRecorded: 0,
    depositsRecorded: 0,
    depositAmount: 0,
    walletCredits: 0,
    walletCreditAmount: 0,
    outstandingAmount: 0,
    glEntriesPosted: 0,
    errors: [],
  });

  const importableRows = matchedRows.filter((r) => r.unitId);
  const total = importableRows.length;

  const runImport = useCallback(async () => {
    setRunning(true);
    const supabase = createClient();
    const res: ImportResult = {
      invoicesCreated: 0,
      paymentsRecorded: 0,
      depositsRecorded: 0,
      depositAmount: 0,
      walletCredits: 0,
      walletCreditAmount: 0,
      outstandingAmount: 0,
      glEntriesPosted: 0,
      errors: [],
    };

    // Process in batches of 10
    const BATCH_SIZE = 10;

    for (let i = 0; i < importableRows.length; i += BATCH_SIZE) {
      const batch = importableRows.slice(i, i + BATCH_SIZE);

      const glRequests: GlPostRequest[] = [];

      for (const mr of batch) {
        try {
          const { mapped, unitId } = mr;
          if (!unitId) continue;

          const chargeType = resolveChargeType(mr, config.chargeTypeMap, config.rowOverrides);

          // ─── Security Deposit path ───────────────────
          if (chargeType === 'security_deposit') {
            if (mapped.amountPaid > 0 && config.postGlEntries) {
              glRequests.push({
                type: 'security_deposit',
                communityId,
                unitId,
                amount: mapped.amountPaid,
                description: `Security deposit received (imported from ${fileName})`,
                entryDate: mapped.paymentDate || mapped.dueDate || undefined,
                lines: [
                  { accountCode: '1000', debit: mapped.amountPaid, credit: 0, description: 'Operating Cash' },
                  { accountCode: '2210', debit: 0, credit: mapped.amountPaid, description: 'Security Deposits Held' },
                ],
              });
            }
            res.depositsRecorded++;
            res.depositAmount += mapped.amountPaid;
            continue;
          }

          // ─── Assessment / Assessment+LateFee / Other path ─────────────────

          let lateFeeForRow = 0;
          let baseAmountDue = mapped.amountDue;
          if (chargeType === 'assessment_late_fee' && config.lateFeeAmount > 0) {
            const remainder = mapped.amountDue - config.lateFeeAmount;
            if (remainder > 0) {
              lateFeeForRow = config.lateFeeAmount;
              baseAmountDue = remainder;
            }
          }

          let invoiceStatus: string;
          if (mapped.amountPaid >= mapped.amountDue && mapped.amountDue > 0) {
            invoiceStatus = 'paid';
          } else if (mapped.amountPaid > 0 && mapped.amountPaid < mapped.amountDue) {
            invoiceStatus = 'partial';
          } else if (mapped.status.toLowerCase() === 'late' || mapped.status.toLowerCase() === 'overdue') {
            invoiceStatus = 'overdue';
          } else {
            invoiceStatus = 'pending';
          }

          let invoiceTitle = 'Imported Invoice';
          if (mapped.dueDate) {
            const d = new Date(mapped.dueDate + 'T00:00:00');
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            invoiceTitle = `${month} ${year} Assessment`;
          }

          // 1. Create invoice
          const { data: invoice, error: invError } = await supabase
            .from('invoices')
            .insert({
              community_id: communityId,
              unit_id: unitId,
              title: invoiceTitle,
              description: mapped.invoiceNumber
                ? `Imported from ${fileName} (Ref: ${mapped.invoiceNumber})`
                : `Imported from ${fileName}`,
              amount: baseAmountDue,
              amount_paid: mapped.amountPaid,
              due_date: mapped.dueDate || new Date().toISOString().split('T')[0],
              status: invoiceStatus,
              assessment_id: config.assessmentId || null,
              paid_at: invoiceStatus === 'paid' && mapped.paymentDate ? mapped.paymentDate : null,
              late_fee_amount: lateFeeForRow,
            })
            .select('id')
            .single();

          if (invError || !invoice) {
            res.errors.push({ row: mr.row.rowNumber, message: `Invoice creation failed: ${invError?.message || 'unknown'}` });
            continue;
          }

          res.invoicesCreated++;

          // Queue GL: invoice created
          if (config.postGlEntries) {
            glRequests.push({
              type: 'invoice_created',
              communityId,
              invoiceId: invoice.id,
              unitId,
              amount: baseAmountDue,
              description: invoiceTitle,
            });

            if (lateFeeForRow > 0) {
              glRequests.push({
                type: 'late_fee',
                communityId,
                invoiceId: invoice.id,
                unitId,
                amount: lateFeeForRow,
                description: `Late fee: ${invoiceTitle}`,
                entryDate: mapped.dueDate || undefined,
                lines: [
                  { accountCode: '1100', debit: lateFeeForRow, credit: 0, description: 'Accounts Receivable (late fee)' },
                  { accountCode: '4100', debit: 0, credit: lateFeeForRow, description: 'Late Fee Revenue' },
                ],
              });
            }
          }

          // 2. Create payment (if paid)
          if (mapped.amountPaid > 0) {
            const { error: payError } = await supabase.from('payments').insert({
              invoice_id: invoice.id,
              unit_id: unitId,
              amount: mapped.amountPaid,
              payment_method: 'other',
              notes: `Imported from ${fileName}`,
              created_at: mapped.paymentDate
                ? new Date(mapped.paymentDate + 'T12:00:00').toISOString()
                : new Date().toISOString(),
            });

            if (payError) {
              res.errors.push({ row: mr.row.rowNumber, message: `Payment creation failed: ${payError.message}` });
            } else {
              res.paymentsRecorded++;

              if (config.postGlEntries) {
                const paymentGlAmount = Math.min(mapped.amountPaid, mapped.amountDue);
                if (paymentGlAmount > 0) {
                  glRequests.push({
                    type: 'payment_received',
                    communityId,
                    invoiceId: invoice.id,
                    unitId,
                    amount: paymentGlAmount,
                    description: invoiceTitle,
                  });
                }
              }
            }
          }

          // 3. Service fee GL entries
          if (config.postGlEntries && mapped.serviceFee > 0 && config.serviceFeeHandling !== 'ignore') {
            const feeHandling = determineFeeHandling(
              config.serviceFeeHandling,
              mapped.amountDue,
              mapped.amountPaid,
              mapped.serviceFee,
            );

            if (feeHandling === 'hoa_absorbed') {
              glRequests.push({
                type: 'service_fee_absorbed',
                communityId,
                invoiceId: invoice.id,
                unitId,
                amount: mapped.serviceFee,
                description: `Processing fee: ${invoiceTitle}`,
                entryDate: mapped.paymentDate || mapped.dueDate || undefined,
                lines: [
                  { accountCode: '5700', debit: mapped.serviceFee, credit: 0, description: 'Processing Fee Expense' },
                  { accountCode: '1000', debit: 0, credit: mapped.serviceFee, description: 'Operating Cash' },
                ],
              });
            } else {
              glRequests.push({
                type: 'service_fee_revenue',
                communityId,
                invoiceId: invoice.id,
                unitId,
                amount: mapped.serviceFee,
                description: `Processing fee revenue: ${invoiceTitle}`,
                entryDate: mapped.paymentDate || mapped.dueDate || undefined,
                lines: [
                  { accountCode: '1000', debit: mapped.serviceFee, credit: 0, description: 'Operating Cash' },
                  { accountCode: '4700', debit: 0, credit: mapped.serviceFee, description: 'Processing Fee Revenue' },
                ],
              });
            }
          }
        } catch (err) {
          res.errors.push({
            row: mr.row.rowNumber,
            message: `Unexpected error: ${err instanceof Error ? err.message : 'unknown'}`,
          });
        }
      }

      // Post GL entries for this batch via server action
      if (glRequests.length > 0) {
        const glResult = await postLedgerGlBatch(glRequests);
        res.glEntriesPosted += glResult.posted;
        if (glResult.errors.length > 0) {
          res.errors.push(...glResult.errors.map((e) => ({ row: 0, message: e })));
        }
      }

      // Update progress
      const processed = Math.min(i + BATCH_SIZE, importableRows.length);
      setCurrentRow(processed);
      setProgress(Math.round((processed / importableRows.length) * 100));
      setResult({ ...res });
    }

    // 4. Calculate and apply wallet credits/debits per unit (exclude security deposits)
    const assessmentRows = importableRows.filter(
      (r) => resolveChargeType(r, config.chargeTypeMap, config.rowOverrides) !== 'security_deposit',
    );
    const unitBalances = calculateUnitBalances(assessmentRows);
    for (const ub of unitBalances) {
      if (ub.balance < 0) {
        // Overpaid: credit the wallet
        const creditAmount = Math.abs(ub.balance);

        // Upsert wallet balance
        const { data: existingWallet } = await supabase
          .from('unit_wallets')
          .select('id, balance')
          .eq('unit_id', ub.unitId)
          .eq('community_id', communityId)
          .single();

        if (existingWallet) {
          await supabase
            .from('unit_wallets')
            .update({ balance: existingWallet.balance + creditAmount })
            .eq('id', existingWallet.id);
        } else {
          await supabase.from('unit_wallets').insert({
            unit_id: ub.unitId,
            community_id: communityId,
            balance: creditAmount,
          });
        }

        // Log wallet transaction
        await supabase.from('wallet_transactions').insert({
          unit_id: ub.unitId,
          community_id: communityId,
          amount: creditAmount,
          type: 'overpayment',
          description: `Overpayment from ledger import (${fileName})`,
        });

        res.walletCredits++;
        res.walletCreditAmount += creditAmount;

        // GL entry for overpayment (via server action)
        if (config.postGlEntries) {
          const glResult = await postLedgerGlBatch([{
            type: 'overpayment',
            communityId,
            unitId: ub.unitId,
            amount: creditAmount,
            description: `Overpayment from ledger import (${fileName})`,
            lines: [
              { accountCode: '1000', debit: creditAmount, credit: 0, description: 'Operating Cash' },
              { accountCode: '2110', debit: 0, credit: creditAmount, description: 'Wallet Credits' },
            ],
          }]);
          res.glEntriesPosted += glResult.posted;
        }
      } else if (ub.balance > 0) {
        res.outstandingAmount += ub.balance;
      }
    }

    setResult({ ...res });
    setDone(true);
    setRunning(false);
  }, [importableRows, communityId, config, fileName]);

  function downloadErrorReport() {
    if (result.errors.length === 0) return;
    const csv = ['Row,Error', ...result.errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          {done ? 'Import Complete' : 'Execute Import'}
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          {done
            ? 'All records have been processed.'
            : `Ready to import ${total} records into your community.`}
        </p>
      </div>

      {/* Start button */}
      {!running && !done && (
        <Button onClick={runImport} className="w-full sm:w-auto">
          Start Import ({total} records)
        </Button>
      )}

      {/* Progress */}
      {(running || done) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-meta text-text-secondary-light dark:text-text-secondary-dark">
            <span className="flex items-center gap-1.5">
              {running ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing row {currentRow} of {total}...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Complete
                </>
              )}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {(running || done) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-secondary-500" />
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {result.invoicesCreated}
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Invoices</p>
          </div>
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {result.paymentsRecorded}
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">Payments</p>
          </div>
          {result.depositsRecorded > 0 && (
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1 text-indigo-500" />
              <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                {result.depositsRecorded}
              </p>
              <p className="text-meta text-indigo-600 dark:text-indigo-400">
                {formatCents(result.depositAmount)} deposits
              </p>
            </div>
          )}
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center">
            <Wallet className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {result.walletCredits}
            </p>
            <p className="text-meta text-green-600 dark:text-green-400">
              {formatCents(result.walletCreditAmount)}
            </p>
          </div>
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {result.glEntriesPosted}
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">GL Entries</p>
          </div>
        </div>
      )}

      {/* Outstanding balance */}
      {done && result.outstandingAmount > 0 && (
        <div className="rounded-inner-card border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-label font-semibold text-amber-700 dark:text-amber-400">
              {formatCents(result.outstandingAmount)} in outstanding balances across units with unpaid invoices
            </span>
          </div>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="rounded-inner-card border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-label font-semibold text-red-700 dark:text-red-400">
                {result.errors.length} errors
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 dark:text-red-400"
              onClick={downloadErrorReport}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Download Error Report
            </Button>
          </div>
          <ul className="space-y-0.5 text-meta text-red-600 dark:text-red-400 max-h-[120px] overflow-y-auto">
            {result.errors.slice(0, 10).map((e, i) => (
              <li key={i}>
                Row {e.row}: {e.message}
              </li>
            ))}
            {result.errors.length > 10 && (
              <li className="font-medium">...and {result.errors.length - 10} more (download report)</li>
            )}
          </ul>
        </div>
      )}

      {/* Done button */}
      {done && (
        <Button onClick={onComplete} className="w-full sm:w-auto">
          Done
        </Button>
      )}
    </div>
  );
}

/**
 * Determine how to handle a service fee for GL purposes.
 */
function determineFeeHandling(
  setting: ServiceFeeHandling,
  amountDue: number,
  amountPaid: number,
  _serviceFee: number,
): 'hoa_absorbed' | 'member_paid' {
  if (setting === 'hoa_absorbed') return 'hoa_absorbed';
  if (setting === 'member_paid') return 'member_paid';

  // Auto-detect: if paid equals due (no extra), HOA absorbed. If paid > due, member paid extra.
  if (amountPaid > amountDue) return 'member_paid';
  return 'hoa_absorbed';
}
