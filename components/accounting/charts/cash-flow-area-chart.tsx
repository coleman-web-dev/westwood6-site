'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/ui/chart';
import type { MonthlyFlowPoint } from '@/lib/types/accounting';

interface CashFlowAreaChartProps {
  data: MonthlyFlowPoint[];
}

const chartConfig = {
  income: {
    label: 'Income',
    theme: { light: '#7BD6AA', dark: '#7BD6AA' },
  },
  expenses: {
    label: 'Expenses',
    theme: { light: '#FF5A5A', dark: '#FF5A5A' },
  },
} satisfies ChartConfig;

function currencyFormatter(value: number | string) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export function CashFlowAreaChart({ data }: CashFlowAreaChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    income: d.income / 100,
    expenses: d.expenses / 100,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
        No cash flow data available.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
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
          content={<ChartTooltipContent formatter={currencyFormatter} />}
        />
        <Area
          type="monotone"
          dataKey="income"
          fill="var(--color-income)"
          stroke="var(--color-income)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          fill="var(--color-expenses)"
          stroke="var(--color-expenses)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
