'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { ExportCsvButton } from '@/components/documents/export-csv-button';
import { useCommunity } from '@/lib/providers/community-provider';
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
  unitId: string;
  unitNumber: string;
  address: string | null;
  ownerName: string;
  email: string | null;
  phone: string | null;
  invoiceCount: number;
  amountOwed: number;
  oldestDueDate: string;
}

type SortKey = keyof DelinquentUnit;
type SortDir = 'asc' | 'desc';

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
}

const delinquentColumns: CsvColumn<DelinquentUnit>[] = [
  { header: 'Unit Number', value: (d) => d.unitNumber },
  { header: 'Address', value: (d) => d.address },
  { header: 'Owner Name', value: (d) => d.ownerName },
  { header: 'Email', value: (d) => d.email },
  { header: 'Phone', value: (d) => d.phone },
  { header: 'Invoice Count', value: (d) => d.invoiceCount },
  { header: 'Amount Owed', value: (d) => (d.amountOwed / 100).toFixed(2) },
  { header: 'Oldest Due Date', value: (d) => d.oldestDueDate },
];

function compareFn(a: DelinquentUnit, b: DelinquentUnit, key: SortKey, dir: SortDir): number {
  const av = a[key];
  const bv = b[key];
  const nullA = av == null || av === '';
  const nullB = bv == null || bv === '';
  if (nullA && nullB) return 0;
  if (nullA) return 1;
  if (nullB) return -1;
  let cmp = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
  }
  return dir === 'asc' ? cmp : -cmp;
}

function SortIcon({ sortKey, currentKey, dir }: { sortKey: SortKey; currentKey: SortKey; dir: SortDir }) {
  const cls = 'inline h-3 w-3 ml-1';
  if (sortKey !== currentKey) return <ArrowUpDown className={`${cls} opacity-30`} />;
  return dir === 'asc' ? <ArrowUp className={cls} /> : <ArrowDown className={cls} />;
}

export function DelinquentUnitsTable({ invoices, units, members, saveConfig }: DelinquentUnitsTableProps) {
  const router = useRouter();
  const { community } = useCommunity();
  const [sortKey, setSortKey] = useState<SortKey>('amountOwed');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'amountOwed' || key === 'invoiceCount' ? 'desc' : 'asc');
    }
  };

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
          unitId: inv.unit_id,
          unitNumber: unit?.unit_number ?? 'Unknown',
          address: unit?.address ?? null,
          ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'N/A',
          email: owner?.email ?? null,
          phone: owner?.phone ?? null,
          invoiceCount: 1,
          amountOwed: owed,
          oldestDueDate: inv.due_date,
        });
      }
    }

    return Array.from(unitMap.values()).sort((a, b) => compareFn(a, b, sortKey, sortDir));
  }, [invoices, units, members, sortKey, sortDir]);

  const headClass =
    'text-meta cursor-pointer select-none hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors';

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
                <TableHead className={headClass} onClick={() => toggleSort('unitNumber')}>
                  Unit # <SortIcon sortKey="unitNumber" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} hidden md:table-cell`} onClick={() => toggleSort('address')}>
                  Address <SortIcon sortKey="address" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={headClass} onClick={() => toggleSort('ownerName')}>
                  Owner <SortIcon sortKey="ownerName" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} hidden sm:table-cell`} onClick={() => toggleSort('email')}>
                  Email <SortIcon sortKey="email" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} hidden lg:table-cell`} onClick={() => toggleSort('phone')}>
                  Phone <SortIcon sortKey="phone" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} text-right`} onClick={() => toggleSort('invoiceCount')}>
                  Invoices <SortIcon sortKey="invoiceCount" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} text-right`} onClick={() => toggleSort('amountOwed')}>
                  Amount Owed <SortIcon sortKey="amountOwed" currentKey={sortKey} dir={sortDir} />
                </TableHead>
                <TableHead className={`${headClass} hidden sm:table-cell`} onClick={() => toggleSort('oldestDueDate')}>
                  Oldest Due <SortIcon sortKey="oldestDueDate" currentKey={sortKey} dir={sortDir} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delinquents.map((d) => (
                <TableRow
                  key={d.unitId}
                  className="cursor-pointer hover:bg-surface-light-2 dark:hover:bg-surface-dark-2"
                  onClick={() => router.push(`/${community.slug}/household?unit=${d.unitId}`)}
                >
                  <TableCell className="text-body font-medium">{d.unitNumber}</TableCell>
                  <TableCell className="text-meta text-text-secondary-light dark:text-text-secondary-dark hidden md:table-cell">
                    {d.address ?? '-'}
                  </TableCell>
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
