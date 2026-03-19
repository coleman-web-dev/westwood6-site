'use client';

import { useMemo, useState } from 'react';
import { Check, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  type MatchedRow,
  type MatchConfidence,
  type UnitRecord,
  confidenceLabel,
  confidenceColor,
  confidenceBg,
  formatCents,
} from '@/lib/utils/ledger-import';

interface StepMatchUnitsProps {
  matchedRows: MatchedRow[];
  units: UnitRecord[];
  onUpdateMatch: (rowNumber: number, unitId: string | null) => void;
  skipUnmatched: boolean;
  onSkipUnmatchedChange: (skip: boolean) => void;
}

export function StepMatchUnits({
  matchedRows,
  units,
  onUpdateMatch,
  skipUnmatched,
  onSkipUnmatchedChange,
}: StepMatchUnitsProps) {
  const [showAll, setShowAll] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Count by confidence
  const counts = useMemo(() => {
    const c: Record<MatchConfidence, number> = { exact: 0, fuzzy: 0, name: 0, unmatched: 0 };
    for (const row of matchedRows) {
      c[row.confidence]++;
    }
    return c;
  }, [matchedRows]);

  const totalMatched = counts.exact + counts.fuzzy + counts.name;

  // Filter rows
  const filteredRows = useMemo(() => {
    let rows = matchedRows;

    // If not showing all, only show non-exact matches
    if (!showAll) {
      rows = rows.filter((r) => r.confidence !== 'exact');
    }

    // Apply search filter
    if (searchFilter) {
      const lower = searchFilter.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.mapped.unitIdentifier.toLowerCase().includes(lower) ||
          (r.unitLabel && r.unitLabel.toLowerCase().includes(lower)),
      );
    }

    return rows;
  }, [matchedRows, showAll, searchFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Match to Units
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          We matched rows to your community units. Review and fix any uncertain matches.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-pill bg-green-50 dark:bg-green-950/30 px-3 py-1.5">
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-label font-medium text-green-700 dark:text-green-400">
            {counts.exact} exact
          </span>
        </div>
        {counts.fuzzy > 0 && (
          <div className="flex items-center gap-1.5 rounded-pill bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5">
            <span className="text-label font-medium text-amber-700 dark:text-amber-400">
              {counts.fuzzy} fuzzy
            </span>
          </div>
        )}
        {counts.name > 0 && (
          <div className="flex items-center gap-1.5 rounded-pill bg-yellow-50 dark:bg-yellow-950/30 px-3 py-1.5">
            <span className="text-label font-medium text-yellow-700 dark:text-yellow-400">
              {counts.name} by name
            </span>
          </div>
        )}
        {counts.unmatched > 0 && (
          <div className="flex items-center gap-1.5 rounded-pill bg-red-50 dark:bg-red-950/30 px-3 py-1.5">
            <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span className="text-label font-medium text-red-700 dark:text-red-400">
              {counts.unmatched} unmatched
            </span>
          </div>
        )}
        <div className="rounded-pill bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-1.5">
          <span className="text-label font-medium text-text-secondary-light dark:text-text-secondary-dark">
            {totalMatched} / {matchedRows.length} matched
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted-light dark:text-text-muted-dark" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search addresses or units..."
            className="w-full rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark pl-9 pr-3 py-1.5 text-body text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Hide exact matches
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Show all ({matchedRows.length})
            </>
          )}
        </Button>
        {counts.unmatched > 0 && (
          <label className="flex items-center gap-2 text-label text-text-secondary-light dark:text-text-secondary-dark cursor-pointer">
            <input
              type="checkbox"
              checked={skipUnmatched}
              onChange={(e) => onSkipUnmatchedChange(e.target.checked)}
              className="rounded"
            />
            Skip unmatched rows
          </label>
        )}
      </div>

      {/* Match table */}
      <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-meta">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
                <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                  #
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                  File Value
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap min-w-[200px]">
                  Matched Unit
                </th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                  Due
                </th>
                <th className="px-3 py-2 text-right font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap">
                  Paid
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((mr) => (
                <tr
                  key={mr.row.rowNumber}
                  className={`border-t border-stroke-light dark:border-stroke-dark ${confidenceBg(mr.confidence)}`}
                >
                  <td className="px-3 py-2 text-text-muted-light dark:text-text-muted-dark">
                    {mr.row.rowNumber}
                  </td>
                  <td className="px-3 py-2 text-text-primary-light dark:text-text-primary-dark whitespace-nowrap">
                    {mr.mapped.unitIdentifier}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`font-medium ${confidenceColor(mr.confidence)}`}>
                      {confidenceLabel(mr.confidence)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {mr.confidence === 'unmatched' || mr.confidence === 'fuzzy' || mr.confidence === 'name' ? (
                      <Select
                        value={mr.unitId || '__none__'}
                        onValueChange={(val) =>
                          onUpdateMatch(mr.row.rowNumber, val === '__none__' ? null : val)
                        }
                      >
                        <SelectTrigger className="h-7 text-meta">
                          <SelectValue placeholder="Select unit..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-text-muted-light dark:text-text-muted-dark">
                              No match
                            </span>
                          </SelectItem>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              Unit {u.unit_number}
                              {u.address ? ` - ${u.address}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-text-primary-light dark:text-text-primary-dark">
                        {mr.unitLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary-light dark:text-text-primary-dark whitespace-nowrap font-mono">
                    {formatCents(mr.mapped.amountDue)}
                  </td>
                  <td className="px-3 py-2 text-right text-text-primary-light dark:text-text-primary-dark whitespace-nowrap font-mono">
                    {mr.mapped.amountPaid > 0 ? formatCents(mr.mapped.amountPaid) : '-'}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-body text-text-muted-light dark:text-text-muted-dark">
                    {searchFilter
                      ? 'No rows match your search.'
                      : 'All rows are exact matches. Click "Show all" to review them.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
