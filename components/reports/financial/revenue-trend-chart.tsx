'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/ui/chart';
import type { Invoice, Payment } from '@/lib/types/database';

interface RevenueTrendChartProps {
  payments: Payment[];
  invoices?: Invoice[];
}

const chartConfig = {
  amount: {
    label: 'Revenue',
    theme: { light: '#7BD6AA', dark: '#7BD6AA' },
  },
} satisfies ChartConfig;

export function RevenueTrendChart({ payments, invoices }: RevenueTrendChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; amount: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push({ label, key, amount: 0 });
    }

    // Prefer payments table if data exists, otherwise derive from invoices
    if (payments.length > 0) {
      for (const p of payments) {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const month = months.find((m) => m.key === key);
        if (month) {
          month.amount += p.amount;
        }
      }
    } else if (invoices) {
      // Use invoice amount_paid grouped by due_date month as fallback
      const nonVoided = invoices.filter((inv) => inv.status !== 'voided' && inv.amount_paid > 0);
      for (const inv of nonVoided) {
        const d = new Date(inv.due_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const month = months.find((m) => m.key === key);
        if (month) {
          month.amount += inv.amount_paid;
        }
      }
    }

    return months.map((m) => ({
      month: m.label,
      amount: m.amount / 100,
    }));
  }, [payments, invoices]);

  const hasData = payments.length > 0 || (invoices && invoices.some((inv) => inv.status !== 'voided' && inv.amount_paid > 0));

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Revenue Trend
      </h3>
      {!hasData ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          No payment data available.
        </p>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-[4/1] w-full max-h-[280px]">
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              width={60}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
