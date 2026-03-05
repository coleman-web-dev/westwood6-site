'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { downloadCsv } from '@/lib/utils/export-csv';
import type { CsvColumn } from '@/lib/utils/export-csv';

interface Vendor1099ReportProps {
  communityId: string;
}

interface VendorPaymentRow {
  vendorId: string;
  vendorName: string;
  company: string | null;
  taxId: string | null;
  w9OnFile: boolean;
  totalPayments: number;
  requires1099: boolean;
}

const THRESHOLD_CENTS = 60000; // $600

export function Vendor1099Report({ communityId }: Vendor1099ReportProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [rows, setRows] = useState<VendorPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Fetch journal entries with vendor_id in the selected year, joined with lines
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, vendor_id, journal_lines(debit, account:account_id(account_type))')
      .eq('community_id', communityId)
      .not('vendor_id', 'is', null)
      .eq('status', 'posted')
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    // Fetch all vendors for this community
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, company, tax_id, w9_on_file')
      .eq('community_id', communityId);

    if (!vendors) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Sum debits on expense accounts per vendor
    const vendorTotals = new Map<string, number>();
    if (entries) {
      for (const entry of entries) {
        if (!entry.vendor_id) continue;
        const lines = entry.journal_lines as Array<{
          debit: number;
          account: { account_type: string } | null;
        }>;
        if (!lines) continue;
        for (const line of lines) {
          if (line.account?.account_type === 'expense' && line.debit > 0) {
            vendorTotals.set(
              entry.vendor_id,
              (vendorTotals.get(entry.vendor_id) || 0) + line.debit,
            );
          }
        }
      }
    }

    // Build rows for all vendors that had payments
    const result: VendorPaymentRow[] = [];
    for (const v of vendors) {
      const total = vendorTotals.get(v.id) || 0;
      if (total === 0) continue;
      result.push({
        vendorId: v.id,
        vendorName: v.name,
        company: v.company,
        taxId: v.tax_id,
        w9OnFile: v.w9_on_file,
        totalPayments: total,
        requires1099: total >= THRESHOLD_CENTS,
      });
    }

    result.sort((a, b) => b.totalPayments - a.totalPayments);
    setRows(result);
    setLoading(false);
  }, [communityId, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function maskTaxId(id: string | null) {
    if (!id) return '';
    const digits = id.replace(/\D/g, '');
    if (digits.length < 4) return id;
    return '***-**-' + digits.slice(-4);
  }

  function handleExport() {
    const columns: CsvColumn<VendorPaymentRow>[] = [
      { header: 'Vendor Name', value: (r) => r.vendorName },
      { header: 'Company', value: (r) => r.company ?? '' },
      { header: 'Tax ID', value: (r) => r.taxId ?? '' },
      { header: 'W-9 On File', value: (r) => (r.w9OnFile ? 'Yes' : 'No') },
      { header: 'Total Payments', value: (r) => (r.totalPayments / 100).toFixed(2) },
      { header: '1099 Required', value: (r) => (r.requires1099 ? 'Yes' : 'No') },
    ];
    downloadCsv(`1099-vendor-report-${year}.csv`, rows, columns);
  }

  const totalVendors = rows.length;
  const vendorsRequiring1099 = rows.filter((r) => r.requires1099).length;
  const vendorsMissingInfo = rows.filter(
    (r) => r.requires1099 && (!r.taxId || !r.w9OnFile),
  ).length;

  const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export 1099 CSV
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-grid-gap">
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">Vendors Paid</p>
          <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark">{totalVendors}</p>
        </div>
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">Requiring 1099</p>
          <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark">{vendorsRequiring1099}</p>
        </div>
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">Missing W-9 / TIN</p>
          <p className="text-metric-xl text-text-primary-light dark:text-text-primary-dark">
            {vendorsMissingInfo > 0 ? (
              <span className="text-destructive">{vendorsMissingInfo}</span>
            ) : (
              '0'
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-32 rounded bg-muted" />
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">
            No vendor payments recorded for {year}.
          </p>
        </div>
      ) : (
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-stroke-light dark:border-stroke-dark bg-surface-light-2 dark:bg-surface-dark-2">
                  <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">Vendor</th>
                  <th className="text-left p-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">Tax ID</th>
                  <th className="text-center p-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">W-9</th>
                  <th className="text-right p-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">Total Paid</th>
                  <th className="text-center p-3 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">1099</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.vendorId}
                    className="border-b border-stroke-light dark:border-stroke-dark last:border-0"
                  >
                    <td className="p-3">
                      <p className="text-text-primary-light dark:text-text-primary-dark font-medium">{r.vendorName}</p>
                      {r.company && (
                        <p className="text-meta text-text-muted-light dark:text-text-muted-dark">{r.company}</p>
                      )}
                    </td>
                    <td className="p-3 text-text-secondary-light dark:text-text-secondary-dark">
                      {r.taxId ? maskTaxId(r.taxId) : (
                        <span className="text-text-muted-light dark:text-text-muted-dark flex items-center gap-1">
                          {r.requires1099 && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                          None
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {r.w9OnFile ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                      ) : r.requires1099 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto" />
                      ) : (
                        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-text-primary-light dark:text-text-primary-dark tabular-nums">
                      ${(r.totalPayments / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      {r.requires1099 ? (
                        <Badge variant="default" className="text-meta">Required</Badge>
                      ) : (
                        <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Under $600</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
