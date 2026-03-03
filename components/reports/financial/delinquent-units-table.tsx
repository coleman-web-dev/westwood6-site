'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { Invoice, Unit, Member } from '@/lib/types/database';

interface DelinquentUnitsTableProps {
  invoices: Invoice[];
  units: Unit[];
  members: Member[];
}

interface DelinquentUnit {
  unitNumber: string;
  ownerName: string;
  email: string | null;
  phone: string | null;
  invoiceCount: number;
  amountOwed: number;
  oldestDueDate: string;
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export function DelinquentUnitsTable({ invoices, units, members }: DelinquentUnitsTableProps) {
  const delinquents = useMemo(() => {
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === 'overdue' || inv.status === 'partial'
    );

    const unitMap = new Map<string, DelinquentUnit>();

    for (const inv of overdueInvoices) {
      const owed = inv.amount - inv.amount_paid;
      const existing = unitMap.get(inv.unit_id);

      if (existing) {
        existing.invoiceCount += 1;
        existing.amountOwed += owed;
        if (inv.due_date < existing.oldestDueDate) {
          existing.oldestDueDate = inv.due_date;
        }
      } else {
        const unit = units.find((u) => u.id === inv.unit_id);
        const owner = members.find(
          (m) => m.unit_id === inv.unit_id && m.member_role === 'owner' && !m.parent_member_id
        );

        unitMap.set(inv.unit_id, {
          unitNumber: unit?.unit_number ?? 'Unknown',
          ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'N/A',
          email: owner?.email ?? null,
          phone: owner?.phone ?? null,
          invoiceCount: 1,
          amountOwed: owed,
          oldestDueDate: inv.due_date,
        });
      }
    }

    return Array.from(unitMap.values()).sort((a, b) => b.amountOwed - a.amountOwed);
  }, [invoices, units, members]);

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Delinquent Units
      </h3>
      {delinquents.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          All accounts are current.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-meta">Unit #</TableHead>
                <TableHead className="text-meta">Owner</TableHead>
                <TableHead className="text-meta hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-meta hidden lg:table-cell">Phone</TableHead>
                <TableHead className="text-meta text-right">Invoices</TableHead>
                <TableHead className="text-meta text-right">Amount Owed</TableHead>
                <TableHead className="text-meta hidden sm:table-cell">Oldest Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delinquents.map((d) => (
                <TableRow key={d.unitNumber + d.ownerName}>
                  <TableCell className="text-body font-medium">{d.unitNumber}</TableCell>
                  <TableCell className="text-body">{d.ownerName}</TableCell>
                  <TableCell className="text-meta text-text-secondary-light dark:text-text-secondary-dark hidden sm:table-cell">
                    {d.email ?? '-'}
                  </TableCell>
                  <TableCell className="text-meta text-text-secondary-light dark:text-text-secondary-dark hidden lg:table-cell">
                    {d.phone ?? '-'}
                  </TableCell>
                  <TableCell className="text-body text-right tabular-nums">{d.invoiceCount}</TableCell>
                  <TableCell className="text-body text-right tabular-nums font-medium text-red-500">
                    ${formatDollars(d.amountOwed)}
                  </TableCell>
                  <TableCell className="text-meta text-text-secondary-light dark:text-text-secondary-dark hidden sm:table-cell">
                    {new Date(d.oldestDueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
