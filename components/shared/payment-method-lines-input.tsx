'use client';

import { Plus, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Button } from '@/components/shared/ui/button';
import {
  PAYMENT_METHOD_OPTIONS,
  type ManualPaymentMethod,
  type PaymentMethodLine,
} from '@/lib/types/database';

export interface PaymentMethodLineInput {
  method: ManualPaymentMethod;
  amount: string; // dollar string typed by user
  reference: string;
}

interface PaymentMethodLinesInputProps {
  lines: PaymentMethodLineInput[];
  onChange: (lines: PaymentMethodLineInput[]) => void;
  /** Expected total in cents. Used for the running-total validation display. */
  totalAmount?: number;
  /** If true, hide the running total row (e.g., vendor dialog manages its own amount). */
  hideTotalValidation?: boolean;
}

export function createEmptyLine(prefillAmount?: string): PaymentMethodLineInput {
  return { method: 'check', amount: prefillAmount ?? '', reference: '' };
}

/** Convert user-input lines to the DB JSONB format (amounts in cents). */
export function linesToPaymentMethods(lines: PaymentMethodLineInput[]): PaymentMethodLine[] {
  return lines
    .filter((l) => {
      const cents = Math.round((parseFloat(l.amount) || 0) * 100);
      return cents > 0;
    })
    .map((l) => ({
      method: l.method,
      amount: Math.round((parseFloat(l.amount) || 0) * 100),
      ...(l.reference.trim() ? { reference: l.reference.trim() } : {}),
    }));
}

/** Sum all line amounts in cents. */
export function sumLineCents(lines: PaymentMethodLineInput[]): number {
  return lines.reduce((sum, l) => sum + Math.round((parseFloat(l.amount) || 0) * 100), 0);
}

/** Format payment method lines for display (e.g., notes, payment history). */
export function formatPaymentMethods(methods: PaymentMethodLine[] | null | undefined): string {
  if (!methods || methods.length === 0) return '';

  const labelMap: Record<string, string> = {};
  for (const opt of PAYMENT_METHOD_OPTIONS) {
    labelMap[opt.value] = opt.label;
  }

  if (methods.length === 1) {
    const m = methods[0];
    const label = labelMap[m.method] ?? m.method;
    return m.reference ? `${label} #${m.reference}` : label;
  }

  return methods
    .map((m) => {
      const label = labelMap[m.method] ?? m.method;
      const dollars = (m.amount / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const ref = m.reference ? ` #${m.reference}` : '';
      return `${label}${ref} ($${dollars})`;
    })
    .join(', ');
}

function referencePlaceholder(method: ManualPaymentMethod): string {
  switch (method) {
    case 'check':
      return 'Check number';
    case 'ach':
      return 'Confirmation number';
    case 'money_order':
      return 'Serial number';
    default:
      return 'Reference (optional)';
  }
}

export function PaymentMethodLinesInput({
  lines,
  onChange,
  totalAmount,
  hideTotalValidation,
}: PaymentMethodLinesInputProps) {
  const updateLine = (index: number, patch: Partial<PaymentMethodLineInput>) => {
    const updated = lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange(updated);
  };

  const addLine = () => {
    onChange([...lines, createEmptyLine()]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const totalCents = sumLineCents(lines);
  const showTotal = !hideTotalValidation && totalAmount !== undefined && lines.length > 1;

  return (
    <div className="space-y-3">
      <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
        Payment Method{lines.length > 1 ? 's' : ''}
      </Label>

      {lines.map((line, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Method select */}
              <Select
                value={line.method}
                onValueChange={(v) => updateLine(index, { method: v as ManualPaymentMethod })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Amount */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark text-body">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount}
                  onChange={(e) => updateLine(index, { amount: e.target.value })}
                  placeholder="0.00"
                  className="h-9 pl-7 tabular-nums"
                />
              </div>
            </div>

            {/* Reference */}
            <Input
              value={line.reference}
              onChange={(e) => updateLine(index, { reference: e.target.value })}
              placeholder={referencePlaceholder(line.method)}
              className="h-9"
            />
          </div>

          {/* Remove button */}
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => removeLine(index)}
              className="mt-1.5 p-1 rounded-md text-text-muted-light dark:text-text-muted-dark hover:text-red-500 dark:hover:text-red-400 hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors"
              title="Remove payment method"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      {/* Add another */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addLine}
        className="text-secondary-400 hover:text-secondary-500 dark:text-secondary-400 dark:hover:text-secondary-300 h-8 px-2"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add payment method
      </Button>

      {/* Running total validation */}
      {showTotal && (
        <div
          className={`flex justify-between text-label px-1 ${
            totalCents === totalAmount
              ? 'text-green-600 dark:text-green-400'
              : totalCents > totalAmount
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-500 dark:text-red-400'
          }`}
        >
          <span>Total across methods</span>
          <span className="tabular-nums">
            ${(totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {totalCents !== totalAmount && (
              <span className="ml-1">
                / ${(totalAmount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
