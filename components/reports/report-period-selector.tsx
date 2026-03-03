'use client';

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import type { Assessment } from '@/lib/types/database';

export type ReportPeriod = {
  type: 'last_12_months' | 'current_fiscal_year' | 'custom';
  startDate: string;
  endDate: string;
};

interface ReportPeriodSelectorProps {
  activeAssessment?: Assessment | null;
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

function getLast12Months(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getFiscalYear(assessment?: Assessment | null): { startDate: string; endDate: string } {
  if (assessment) {
    return {
      startDate: assessment.fiscal_year_start,
      endDate: assessment.fiscal_year_end,
    };
  }
  const year = new Date().getFullYear();
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

export function getDefaultPeriod(): ReportPeriod {
  const { startDate, endDate } = getLast12Months();
  return { type: 'last_12_months', startDate, endDate };
}

export function ReportPeriodSelector({ activeAssessment, value, onChange }: ReportPeriodSelectorProps) {
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);

  const fiscalDates = useMemo(() => getFiscalYear(activeAssessment), [activeAssessment]);

  function handleTypeChange(type: string) {
    if (type === 'last_12_months') {
      const { startDate, endDate } = getLast12Months();
      onChange({ type: 'last_12_months', startDate, endDate });
    } else if (type === 'current_fiscal_year') {
      onChange({ type: 'current_fiscal_year', startDate: fiscalDates.startDate, endDate: fiscalDates.endDate });
    } else if (type === 'custom') {
      onChange({ type: 'custom', startDate: customStart, endDate: customEnd });
    }
  }

  function handleCustomStartChange(date: string) {
    setCustomStart(date);
    if (value.type === 'custom') {
      onChange({ type: 'custom', startDate: date, endDate: customEnd });
    }
  }

  function handleCustomEndChange(date: string) {
    setCustomEnd(date);
    if (value.type === 'custom') {
      onChange({ type: 'custom', startDate: customStart, endDate: date });
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
          Period
        </label>
        <Select value={value.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_12_months">Last 12 Months</SelectItem>
            <SelectItem value="current_fiscal_year">Current Fiscal Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.type === 'custom' && (
        <>
          <div className="space-y-1">
            <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
              From
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
              To
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </>
      )}
    </div>
  );
}
