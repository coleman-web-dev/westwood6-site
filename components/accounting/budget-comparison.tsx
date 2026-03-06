'use client';

import { useState, useEffect } from 'react';
import { getBudgetComparison } from '@/lib/utils/accounting-reports';

interface Props {
  communityId: string;
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

interface YearData {
  year: number;
  items: { category: string; name: string; budgeted: number; actual: number; is_income: boolean }[];
}

export function BudgetComparison({ communityId }: Props) {
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState([currentYear - 1, currentYear]);
  const [data, setData] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getBudgetComparison(communityId, years);
        setData(result);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [communityId, years]);

  function toggleYear(year: number) {
    if (years.includes(year)) {
      if (years.length > 1) setYears(years.filter((y) => y !== year));
    } else {
      setYears([...years, year].sort());
    }
  }

  // Merge all unique line items across years
  const allNames = new Set<string>();
  for (const yd of data) {
    for (const item of yd.items) {
      allNames.add(`${item.is_income ? 'I' : 'E'}|${item.name}`);
    }
  }

  const incomeNames = [...allNames].filter((n) => n.startsWith('I|')).map((n) => n.slice(2));
  const expenseNames = [...allNames].filter((n) => n.startsWith('E|')).map((n) => n.slice(2));

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="animate-pulse h-48 rounded bg-muted" />
      </div>
    );
  }

  const hasData = data.some((d) => d.items.length > 0);

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Multi-Year Budget Comparison
        </h3>
        <div className="flex gap-1">
          {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
            <button
              key={y}
              onClick={() => toggleYear(y)}
              className={`px-2 py-1 rounded text-meta transition-colors ${
                years.includes(y)
                  ? 'bg-primary-700 text-white dark:bg-primary-300 dark:text-primary-900'
                  : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No budgets found for the selected years.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-stroke-light dark:border-stroke-dark">
                <th className="text-left py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                  Line Item
                </th>
                {years.map((y) => (
                  <th key={`${y}-b`} className="text-right py-2 px-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    {y} Budget
                  </th>
                ))}
                {years.map((y) => (
                  <th key={`${y}-a`} className="text-right py-2 px-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    {y} Actual
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incomeNames.length > 0 && (
                <>
                  <tr>
                    <td colSpan={1 + years.length * 2} className="pt-4 pb-1 text-label text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide font-medium">
                      Income
                    </td>
                  </tr>
                  {incomeNames.map((name) => (
                    <ComparisonRow key={`I-${name}`} name={name} years={years} data={data} isIncome />
                  ))}
                </>
              )}
              {expenseNames.length > 0 && (
                <>
                  <tr>
                    <td colSpan={1 + years.length * 2} className="pt-4 pb-1 text-label text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide font-medium">
                      Expenses
                    </td>
                  </tr>
                  {expenseNames.map((name) => (
                    <ComparisonRow key={`E-${name}`} name={name} years={years} data={data} isIncome={false} />
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComparisonRow({ name, years, data, isIncome }: { name: string; years: number[]; data: YearData[]; isIncome: boolean }) {
  function getItem(year: number) {
    const yd = data.find((d) => d.year === year);
    return yd?.items.find((i) => i.name === name && i.is_income === isIncome);
  }

  return (
    <tr className="border-b border-stroke-light/50 dark:border-stroke-dark/50">
      <td className="py-2 pr-4 text-text-primary-light dark:text-text-primary-dark">
        {name}
      </td>
      {years.map((y) => (
        <td key={`${y}-b`} className="py-2 px-2 text-right text-text-secondary-light dark:text-text-secondary-dark">
          {getItem(y) ? fmt(getItem(y)!.budgeted) : '-'}
        </td>
      ))}
      {years.map((y) => (
        <td key={`${y}-a`} className="py-2 px-2 text-right text-text-primary-light dark:text-text-primary-dark">
          {getItem(y) ? fmt(getItem(y)!.actual) : '-'}
        </td>
      ))}
    </tr>
  );
}
