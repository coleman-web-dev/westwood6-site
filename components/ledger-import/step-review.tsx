'use client';

import { useMemo } from 'react';
import { FileText, CreditCard, Wallet, AlertTriangle, Receipt, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import {
  type MatchedRow,
  type UnitBalance,
  type ChargeType,
  calculateUnitBalances,
  formatCents,
  getDistinctAmounts,
  resolveChargeType,
  CHARGE_TYPE_OPTIONS,
  buildDefaultChargeTypeMap,
} from '@/lib/utils/ledger-import';

export type ServiceFeeHandling = 'hoa_absorbed' | 'member_paid' | 'auto_detect' | 'ignore';

export interface ImportConfig {
  assessmentId: string | null;
  serviceFeeHandling: ServiceFeeHandling;
  postGlEntries: boolean;
  /** Maps amount (cents) to charge type. Used when CSV has no chargeType column. */
  chargeTypeMap: Record<number, ChargeType>;
  /** Community's configured late fee amount (cents). Used for auto-detection and GL splitting. */
  lateFeeAmount: number;
}

interface Assessment {
  id: string;
  title: string;
}

interface StepReviewProps {
  matchedRows: MatchedRow[];
  skipUnmatched: boolean;
  config: ImportConfig;
  onConfigChange: (config: ImportConfig) => void;
  assessments: Assessment[];
  /** Whether the CSV had a chargeType column mapped. If false, show amount-grouping UI. */
  hasChargeTypeColumn: boolean;
}

export function StepReview({
  matchedRows,
  skipUnmatched,
  config,
  onConfigChange,
  assessments,
  hasChargeTypeColumn,
}: StepReviewProps) {
  // Only include matched rows (or all if not skipping)
  const importableRows = useMemo(
    () => (skipUnmatched ? matchedRows.filter((r) => r.unitId) : matchedRows.filter((r) => r.unitId)),
    [matchedRows, skipUnmatched],
  );

  // Summary stats (split by charge type)
  const stats = useMemo(() => {
    let invoices = 0;
    let payments = 0;
    let deposits = 0;
    let depositAmount = 0;
    let totalCharged = 0;
    let totalPaid = 0;
    let totalFees = 0;

    for (const row of importableRows) {
      const ct = resolveChargeType(row, config.chargeTypeMap);
      if (ct === 'security_deposit') {
        deposits++;
        depositAmount += row.mapped.amountPaid;
      } else {
        invoices++;
        totalCharged += row.mapped.amountDue;
        if (row.mapped.amountPaid > 0) {
          payments++;
          totalPaid += row.mapped.amountPaid;
        }
        totalFees += row.mapped.serviceFee;
      }
    }

    return { invoices, payments, deposits, depositAmount, totalCharged, totalPaid, totalFees };
  }, [importableRows, config.chargeTypeMap]);

  // Per-unit balances (exclude security deposits)
  const assessmentRows = useMemo(
    () => importableRows.filter((r) => resolveChargeType(r, config.chargeTypeMap) !== 'security_deposit'),
    [importableRows, config.chargeTypeMap],
  );
  const unitBalances: UnitBalance[] = useMemo(
    () => calculateUnitBalances(assessmentRows),
    [assessmentRows],
  );

  const overpaidUnits = unitBalances.filter((b) => b.balance < 0);
  const owingUnits = unitBalances.filter((b) => b.balance > 0);
  const paidInFullUnits = unitBalances.filter((b) => b.balance === 0);
  const totalOverpaid = overpaidUnits.reduce((sum, b) => sum + Math.abs(b.balance), 0);
  const totalOwing = owingUnits.reduce((sum, b) => sum + b.balance, 0);

  const skippedRows = matchedRows.filter((r) => !r.unitId);

  // Distinct amounts for charge type grouping
  const distinctAmounts = useMemo(
    () => getDistinctAmounts(importableRows, config.lateFeeAmount),
    [importableRows, config.lateFeeAmount],
  );

  function handleChargeTypeChange(amountCents: number, chargeType: ChargeType) {
    onConfigChange({
      ...config,
      chargeTypeMap: {
        ...config.chargeTypeMap,
        [amountCents]: chargeType,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Review Import
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Review the import summary and configure options before proceeding.
        </p>
      </div>

      {/* Summary cards */}
      <div className={`grid grid-cols-2 ${stats.deposits > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-secondary-500" />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Invoices</span>
          </div>
          <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            {stats.invoices}
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {formatCents(stats.totalCharged)} total
          </p>
        </div>
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-green-500" />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Payments</span>
          </div>
          <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            {stats.payments}
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {formatCents(stats.totalPaid)} total
          </p>
        </div>
        {stats.deposits > 0 && (
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-indigo-500" />
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Deposits
              </span>
            </div>
            <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
              {stats.deposits}
            </p>
            <p className="text-meta text-indigo-600 dark:text-indigo-400">
              {formatCents(stats.depositAmount)} held
            </p>
          </div>
        )}
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Wallet Credits
            </span>
          </div>
          <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            {overpaidUnits.length}
          </p>
          <p className="text-meta text-green-600 dark:text-green-400">
            {formatCents(totalOverpaid)} overpaid
          </p>
        </div>
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Outstanding
            </span>
          </div>
          <p className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            {owingUnits.length}
          </p>
          <p className="text-meta text-red-600 dark:text-red-400">{formatCents(totalOwing)} owed</p>
        </div>
      </div>

      {/* Charge type assignment (when no CSV column mapped) */}
      {!hasChargeTypeColumn && distinctAmounts.length > 1 && (
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-4 space-y-3">
          <div>
            <h3 className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
              Categorize Charges
            </h3>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Your file contains different charge amounts. Assign a category to each so they are
              accounted for correctly (e.g. security deposits go to a liability account, not revenue).
            </p>
          </div>
          <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
            <table className="w-full text-meta">
              <thead>
                <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Rows
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark min-w-[180px]">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {distinctAmounts.map(({ amount, count, likelyAssessment, likelyLateFee, detectedLateFee, detectedBase }) => {
                  const currentType = config.chargeTypeMap[amount] || 'assessment';
                  const showLateFeeHint = likelyLateFee || currentType === 'assessment_late_fee';

                  return (
                    <tr
                      key={amount}
                      className={`border-t border-stroke-light dark:border-stroke-dark ${
                        !likelyAssessment && !likelyLateFee
                          ? 'bg-amber-50 dark:bg-amber-950/30'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-text-primary-light dark:text-text-primary-dark">
                        <span className="font-mono">{formatCents(amount)}</span>
                        {showLateFeeHint && detectedBase > 0 ? (
                          <span className="ml-2 text-text-muted-light dark:text-text-muted-dark font-normal text-meta">
                            = {formatCents(detectedBase)} dues + {formatCents(detectedLateFee)} late fee
                          </span>
                        ) : !likelyAssessment && !likelyLateFee ? (
                          <span className="ml-2 text-amber-600 dark:text-amber-400 font-normal">
                            Not a multiple of base dues
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary-light dark:text-text-secondary-dark">
                        {count}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={currentType}
                          onValueChange={(val) =>
                            handleChargeTypeChange(amount, val as ChargeType)
                          }
                        >
                          <SelectTrigger className="h-7 text-meta">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHARGE_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-4 space-y-4">
        <h3 className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
          Import Settings
        </h3>

        {/* Assessment link */}
        <div className="space-y-1.5">
          <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
            Link to Assessment
          </Label>
          <Select
            value={config.assessmentId || '__none__'}
            onValueChange={(val) =>
              onConfigChange({ ...config, assessmentId: val === '__none__' ? null : val })
            }
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Select assessment..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None (standalone invoices)</SelectItem>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Optionally link imported invoices to an existing assessment for reporting.
          </p>
        </div>

        {/* Service fee handling */}
        {stats.totalFees > 0 && (
          <div className="space-y-1.5">
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Service Fee Handling ({formatCents(stats.totalFees)} total)
            </Label>
            <Select
              value={config.serviceFeeHandling}
              onValueChange={(val) =>
                onConfigChange({ ...config, serviceFeeHandling: val as ServiceFeeHandling })
              }
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoa_absorbed">
                  HOA absorbed (processing expense)
                </SelectItem>
                <SelectItem value="member_paid">
                  Member paid (processing fee revenue)
                </SelectItem>
                <SelectItem value="auto_detect">
                  Auto-detect (mixed)
                </SelectItem>
                <SelectItem value="ignore">Ignore service fees</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {config.serviceFeeHandling === 'hoa_absorbed'
                ? 'Fees posted as expense: DR Processing Fees, CR Operating Cash'
                : config.serviceFeeHandling === 'member_paid'
                  ? 'Fees posted as revenue: DR Operating Cash, CR Processing Fee Revenue'
                  : config.serviceFeeHandling === 'auto_detect'
                    ? 'Auto-determines per row based on payment amounts'
                    : 'No GL entries for service fees'}
            </p>
          </div>
        )}

        {/* Post GL entries */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Post GL Journal Entries
            </Label>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Automatically create accounting entries for imported transactions
            </p>
          </div>
          <Switch
            checked={config.postGlEntries}
            onCheckedChange={(checked) =>
              onConfigChange({ ...config, postGlEntries: checked })
            }
          />
        </div>
      </div>

      {/* Skipped rows warning */}
      {skippedRows.length > 0 && (
        <div className="rounded-inner-card border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-label font-semibold text-amber-700 dark:text-amber-400">
              {skippedRows.length} rows will be skipped (unmatched to any unit)
            </span>
          </div>
        </div>
      )}

      {/* Per-unit balance preview */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-secondary-500" />
          <h3 className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
            Per-Unit Balance Preview
          </h3>
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
            ({unitBalances.length} units)
          </span>
        </div>
        <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-meta">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
                  <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Unit
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Rows
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Charged
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Paid
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {unitBalances.map((ub) => (
                  <tr
                    key={ub.unitId}
                    className="border-t border-stroke-light dark:border-stroke-dark"
                  >
                    <td className="px-3 py-1.5 text-text-primary-light dark:text-text-primary-dark whitespace-nowrap">
                      {ub.unitLabel}
                    </td>
                    <td className="px-3 py-1.5 text-right text-text-secondary-light dark:text-text-secondary-dark">
                      {ub.rowCount}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-text-primary-light dark:text-text-primary-dark">
                      {formatCents(ub.totalCharged)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-text-primary-light dark:text-text-primary-dark">
                      {formatCents(ub.totalPaid)}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-mono font-semibold ${
                        ub.balance > 0
                          ? 'text-red-600 dark:text-red-400'
                          : ub.balance < 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-text-primary-light dark:text-text-primary-dark'
                      }`}
                    >
                      {ub.balance > 0
                        ? formatCents(ub.balance)
                        : ub.balance < 0
                          ? `-${formatCents(Math.abs(ub.balance))}`
                          : 'Paid'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex gap-6 text-meta">
          <span className="text-green-600 dark:text-green-400">
            {paidInFullUnits.length} paid in full
          </span>
          <span className="text-red-600 dark:text-red-400">
            {owingUnits.length} owing ({formatCents(totalOwing)})
          </span>
          <span className="text-green-600 dark:text-green-400">
            {overpaidUnits.length} overpaid ({formatCents(totalOverpaid)} credit)
          </span>
        </div>
      </div>
    </div>
  );
}
