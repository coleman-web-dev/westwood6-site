'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Download } from 'lucide-react';
import { getJournalEntriesForExport } from '@/lib/actions/accounting-actions';
import { generateChartOfAccountsCSV, generateJournalEntriesCSV, getTrialBalance } from '@/lib/utils/accounting-reports';
import { toast } from 'sonner';

interface Props {
  communityId: string;
}

type ExportType = 'trial-balance' | 'journal-entries' | 'chart-of-accounts';

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ communityId }: Props) {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('journal-entries');
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      let csv = '';
      let filename = '';

      switch (exportType) {
        case 'trial-balance': {
          const rows = await getTrialBalance(communityId, endDate);
          csv = generateChartOfAccountsCSV(rows);
          filename = `trial-balance-${endDate}.csv`;
          break;
        }
        case 'chart-of-accounts': {
          const rows = await getTrialBalance(communityId);
          csv = generateChartOfAccountsCSV(rows);
          filename = `chart-of-accounts.csv`;
          break;
        }
        case 'journal-entries': {
          const entries = await getJournalEntriesForExport(communityId, startDate, endDate);
          csv = generateJournalEntriesCSV(entries);
          filename = `journal-entries-${startDate}-to-${endDate}.csv`;
          break;
        }
      }

      if (csv) {
        downloadCSV(csv, filename);
        toast.success(`Exported ${filename}`);
      } else {
        toast.error('No data to export');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
    setExporting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-light dark:bg-surface-dark border-stroke-light dark:border-stroke-dark">
        <DialogHeader>
          <DialogTitle className="text-text-primary-light dark:text-text-primary-dark">
            Export Financial Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
              Export Type
            </Label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as ExportType)}
              className="mt-1 w-full rounded-lg border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-body text-text-primary-light dark:text-text-primary-dark"
            >
              <option value="journal-entries">Journal Entries (for QuickBooks import)</option>
              <option value="trial-balance">Trial Balance</option>
              <option value="chart-of-accounts">Chart of Accounts</option>
            </select>
          </div>

          {exportType === 'journal-entries' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {exportType === 'journal-entries'
              ? 'Exports all posted journal entries with account codes in CSV format compatible with QuickBooks and other accounting software.'
              : exportType === 'trial-balance'
                ? 'Exports account balances as of the selected date.'
                : 'Exports the full chart of accounts with current balances.'}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Exporting...' : 'Download CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
