'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Download, FolderDown, Folder, FolderX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { getJournalEntriesForExport } from '@/lib/actions/accounting-actions';
import { generateChartOfAccountsCSV, generateJournalEntriesCSV, getTrialBalance } from '@/lib/utils/accounting-reports';
import { saveCsvToDocuments } from '@/lib/utils/export-csv';
import { toast } from 'sonner';
import type { DocumentFolder } from '@/lib/types/database';

interface Props {
  communityId: string;
}

type ExportType = 'trial-balance' | 'journal-entries' | 'chart-of-accounts';
type Destination = 'download' | 'save' | 'both';

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
  const { member } = useCommunity();
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('journal-entries');
  const now = new Date();
  const [startDate, setStartDate] = useState(`${now.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);
  const [destination, setDestination] = useState<Destination>('download');
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('document_folders')
      .select('*')
      .eq('community_id', communityId)
      .order('name', { ascending: true });
    setFolders((data as DocumentFolder[]) ?? []);
  }, [communityId]);

  useEffect(() => {
    if (open) fetchFolders();
  }, [open, fetchFolders]);

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

      if (!csv) {
        toast.error('No data to export');
        setExporting(false);
        return;
      }

      // Download to computer
      if (destination === 'download' || destination === 'both') {
        downloadCSV(csv, filename);
      }

      // Save to documents
      if ((destination === 'save' || destination === 'both') && member) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const supabase = createClient();
        const result = await saveCsvToDocuments(supabase, {
          filename,
          blob,
          communityId,
          memberId: member.id,
          folderId: selectedFolder,
        });

        if (!result.success) {
          toast.error(result.error ?? 'Failed to save to documents.');
          setExporting(false);
          return;
        }

        if (destination === 'save') {
          toast.success('Report saved to Documents.');
        } else {
          toast.success(`Exported ${filename} and saved to Documents.`);
        }
      } else if (destination === 'download') {
        toast.success(`Exported ${filename}`);
      }

      setOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
    setExporting(false);
  }

  const showFolderPicker = destination === 'save' || destination === 'both';

  const destClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-inner-card cursor-pointer transition-colors text-body ${
      active
        ? 'bg-secondary-100 dark:bg-secondary-900/30 ring-1 ring-secondary-400 text-text-primary-light dark:text-text-primary-dark'
        : 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark'
    }`;

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

          {/* Destination */}
          <div>
            <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-1.5 block">
              Destination
            </Label>
            <div className="space-y-1">
              <button
                className={destClass(destination === 'download')}
                onClick={() => setDestination('download')}
              >
                <Download className="h-4 w-4 shrink-0" />
                Download to computer
              </button>
              <button
                className={destClass(destination === 'save')}
                onClick={() => setDestination('save')}
              >
                <FolderDown className="h-4 w-4 shrink-0" />
                Save to Documents
              </button>
              <button
                className={destClass(destination === 'both')}
                onClick={() => setDestination('both')}
              >
                <Download className="h-4 w-4 shrink-0" />
                Download and Save
              </button>
            </div>
          </div>

          {/* Folder picker */}
          {showFolderPicker && (
            <div>
              <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark mb-1.5 block">
                Folder
              </Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <button
                  className={destClass(selectedFolder === null)}
                  onClick={() => setSelectedFolder(null)}
                >
                  <FolderX className="h-4 w-4 shrink-0" />
                  No folder
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    className={destClass(selectedFolder === f.id)}
                    onClick={() => setSelectedFolder(f.id)}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-secondary-500" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
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
              {exporting ? 'Exporting...' : destination === 'save' ? 'Save' : destination === 'both' ? 'Download & Save' : 'Download CSV'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
