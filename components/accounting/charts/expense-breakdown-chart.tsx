'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/ui/chart';
import type { CategoryBreakdown } from '@/lib/types/accounting';

interface ExpenseBreakdownChartProps {
  data: CategoryBreakdown[];
}

const chartConfig = {
  amount: {
    label: 'Amount',
    theme: { light: '#F4AE90', dark: '#F4AE90' },
  },
} satisfies ChartConfig;

function currencyFormatter(value: number | string) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const chartData = data.map((d) => ({
    name: d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name,
    fullName: d.name,
    amount: d.amount / 100,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
        No expense data available.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `$${v.toLocaleString()}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={currencyFormatter}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullName || '';
              }}
            />
          }
        />
        <Bar
          dataKey="amount"
          fill="var(--color-amount)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
