'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/shared/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { Reservation, Amenity } from '@/lib/types/database';

interface AmenityUsageProps {
  reservations: Reservation[];
  amenities: Amenity[];
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

const chartConfig = {
  reservations: {
    label: 'Reservations',
    theme: { light: '#7BD6AA', dark: '#7BD6AA' },
  },
} satisfies ChartConfig;

export function AmenityUsage({ reservations, amenities }: AmenityUsageProps) {
  const usageData = useMemo(() => {
    const approved = reservations.filter((r) => r.status === 'approved');

    return amenities
      .map((amenity) => {
        const amenityReservations = approved.filter((r) => r.amenity_id === amenity.id);
        const feeRevenue = amenityReservations.reduce((sum, r) => sum + r.fee_amount, 0);
        const depositRevenue = amenityReservations.reduce((sum, r) => sum + r.deposit_amount, 0);

        return {
          name: amenity.name,
          reservations: amenityReservations.length,
          feeRevenue,
          depositRevenue,
        };
      })
      .sort((a, b) => b.reservations - a.reservations);
  }, [reservations, amenities]);

  const hasData = usageData.some((d) => d.reservations > 0);

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Amenity Usage
      </h3>

      {!hasData ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          No reservation data available.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-meta">Amenity</TableHead>
                  <TableHead className="text-meta text-right">Reservations</TableHead>
                  <TableHead className="text-meta text-right">Fee Revenue</TableHead>
                  <TableHead className="text-meta text-right">Deposit Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="text-body font-medium">{d.name}</TableCell>
                    <TableCell className="text-body text-right tabular-nums">{d.reservations}</TableCell>
                    <TableCell className="text-body text-right tabular-nums">
                      ${formatDollars(d.feeRevenue)}
                    </TableCell>
                    <TableCell className="text-body text-right tabular-nums">
                      ${formatDollars(d.depositRevenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
            <BarChart
              data={usageData.filter((d) => d.reservations > 0)}
              layout="vertical"
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={100}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${value} reservation${Number(value) !== 1 ? 's' : ''}`}
                  />
                }
              />
              <Bar
                dataKey="reservations"
                fill="var(--color-reservations)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </>
      )}
    </div>
  );
}
