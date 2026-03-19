'use client';

import { useMemo } from 'react';
import { Check, AlertCircle, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  LEDGER_FIELDS,
  type ColumnMapping,
  type LedgerFieldKey,
  type ParsedLedgerRow,
} from '@/lib/utils/ledger-import';

interface StepMapColumnsProps {
  headers: string[];
  rows: ParsedLedgerRow[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
}

export function StepMapColumns({ headers, rows, mapping, onMappingChange }: StepMapColumnsProps) {
  // Track which fields are already assigned
  const usedFields = useMemo(() => {
    const used = new Set<string>();
    for (const val of Object.values(mapping)) {
      if (val) used.add(val);
    }
    return used;
  }, [mapping]);

  const requiredFields = LEDGER_FIELDS.filter((f) => f.required);
  const optionalFields = LEDGER_FIELDS.filter((f) => !f.required);

  const missingRequired = requiredFields.filter((f) => !usedFields.has(f.key));

  function handleChange(csvColumn: string, value: string) {
    const newMapping = { ...mapping };

    // If "ignore" selected, clear this column's mapping
    if (value === '__ignore__') {
      newMapping[csvColumn] = '';
    } else {
      // Clear any other column that was mapped to this field
      for (const [col, field] of Object.entries(newMapping)) {
        if (field === value && col !== csvColumn) {
          newMapping[col] = '';
        }
      }
      newMapping[csvColumn] = value as LedgerFieldKey;
    }

    onMappingChange(newMapping);
  }

  // Sample values for each column (first non-empty from first 5 rows)
  const sampleValues = useMemo(() => {
    const samples: Record<string, string> = {};
    for (const header of headers) {
      for (const row of rows.slice(0, 5)) {
        const val = (row.raw[header] ?? '').trim();
        if (val) {
          samples[header] = val;
          break;
        }
      }
    }
    return samples;
  }, [headers, rows]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Map Columns
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Match your file columns to the expected fields. We auto-detected what we could.
        </p>
      </div>

      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="rounded-inner-card border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-label font-semibold text-amber-700 dark:text-amber-400">
              Missing required fields: {missingRequired.map((f) => f.label).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Column mapping table */}
      <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
              <th className="px-4 py-2.5 text-left text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                File Column
              </th>
              <th className="px-2 py-2.5 w-8" />
              <th className="px-4 py-2.5 text-left text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Maps To
              </th>
              <th className="px-4 py-2.5 text-left text-label font-semibold text-text-secondary-light dark:text-text-secondary-dark">
                Sample Value
              </th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => {
              const currentField = mapping[header] || '';
              const fieldDef = LEDGER_FIELDS.find((f) => f.key === currentField);
              const isMapped = !!currentField;

              return (
                <tr
                  key={header}
                  className="border-t border-stroke-light dark:border-stroke-dark"
                >
                  <td className="px-4 py-2.5">
                    <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      {header}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    {isMapped ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Select
                      value={currentField || '__ignore__'}
                      onValueChange={(val) => handleChange(header, val)}
                    >
                      <SelectTrigger className="h-8 w-full max-w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__ignore__">
                          <span className="text-text-muted-light dark:text-text-muted-dark">Ignore</span>
                        </SelectItem>
                        {requiredFields.map((f) => (
                          <SelectItem
                            key={f.key}
                            value={f.key}
                            disabled={usedFields.has(f.key) && mapping[header] !== f.key}
                          >
                            {f.label} *
                          </SelectItem>
                        ))}
                        {optionalFields.map((f) => (
                          <SelectItem
                            key={f.key}
                            value={f.key}
                            disabled={usedFields.has(f.key) && mapping[header] !== f.key}
                          >
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark font-mono">
                      {sampleValues[header] || '(empty)'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
        Fields marked with * are required. Unmapped columns will be ignored during import.
      </p>
    </div>
  );
}
