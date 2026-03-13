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
import { ExportCsvButton } from '@/components/documents/export-csv-button';
import type { CsvColumn } from '@/lib/utils/export-csv';
import type { Invoice, Unit, Member, DocumentFolder } from '@/lib/types/database';

interface DelinquentUnitsTableProps {
  invoices: Invoice[];
  units: Unit[];
  members: Member[];
  saveConfig?: {
    communityId: string;
    memberId: string;
    folders: DocumentFolder[];
  };
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

const delinquentColumns: CsvColumn<DelinquentUnit>[] = [
  { header: 'Unit Number', value: (d) => d.unitNumber },
  { header: 'Owner Name', value: (d) => d.ownerName },
  { header: 'Email', value: (d) => d.email },
  { header: 'Phone', value: (d) => d.phone },
  { header: 'Invoice Count', value: (d) => d.invoiceCount },
  { header: 'Amount Owed', value: (d) => (d.amountOwed / 100).toFixed(2) },
  { header: 'Oldest Due Date', value: (d) => d.oldestDueDate },
];

export function DelinquentUnitsTable({ invoices, units, members, saveConfig }: DelinquentUnitsTableProps) {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
          Delinquent Units
        </h3>
        {delinquents.length > 0 && (
          <ExportCsvButton
            filename="delinquent-units.csv"
            getData={() => delinquents}
            columns={delinquentColumns}
            label="Export"
            variant="ghost"
            saveConfig={saveConfig}
          />
        )}
      </div>
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
