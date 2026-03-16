'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, FolderDown, Loader2, Folder, FolderX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { toast } from 'sonner';
import { buildCsvBlob, downloadCsv } from '@/lib/utils/export-csv';
import { buildXlsxBlob, downloadXlsx } from '@/lib/utils/export-xlsx';
import type { CsvColumn } from '@/lib/utils/export-csv';
import type { DocumentFolder } from '@/lib/types/database';

interface ExportDirectoryButtonProps<T> {
  getData: () => T[];
  columns: CsvColumn<T>[];
  saveConfig: {
    communityId: string;
    memberId: string;
    folders: DocumentFolder[];
  };
}

type Format = 'csv' | 'xlsx';
type Step = 'menu' | 'folder';

export function ExportDirectoryButton<T>({
  getData,
  columns,
  saveConfig,
}: ExportDirectoryButtonProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [saveFormat, setSaveFormat] = useState<Format>('xlsx');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  function handleDownload(format: Format) {
    const data = getData();
    if (format === 'csv') {
      downloadCsv('member-directory.csv', data, columns);
    } else {
      downloadXlsx('member-directory.xlsx', data, columns);
    }
    setMenuOpen(false);
  }

  function handleSaveOption(format: Format) {
    setSaveFormat(format);
    setStep('folder');
  }

  async function handleSaveToDocuments() {
    setSaving(true);
    const data = getData();
    const isCsv = saveFormat === 'csv';
    const filename = isCsv ? 'member-directory.csv' : 'member-directory.xlsx';
    const blob = isCsv ? buildCsvBlob(data, columns) : buildXlsxBlob(data, columns);
    const supabase = createClient();

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
    const filePath = `${saveConfig.communityId}/reports/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, blob);

    if (uploadError) {
      toast.error('Failed to upload file.');
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      community_id: saveConfig.communityId,
      title: filename.replace(/\.(csv|xlsx)$/, ''),
      category: 'financial',
      folder_id: selectedFolder ?? null,
      file_path: filePath,
      file_size: blob.size,
      uploaded_by: saveConfig.memberId,
    });

    if (insertError) {
      await supabase.storage.from('hoa-documents').remove([filePath]);
      toast.error('Failed to save document record.');
      setSaving(false);
      return;
    }

    toast.success('Report saved to Documents.');
    setSaving(false);
    setMenuOpen(false);
    setStep('menu');
    setSelectedFolder(null);
  }

  const itemClass =
    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-body hover:bg-surface-light-2 dark:hover:bg-surface-dark-2 transition-colors text-text-primary-light dark:text-text-primary-dark';

  const folderItemClass = (active: boolean) =>
    `w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-body transition-colors ${
      active
        ? 'bg-secondary-100 dark:bg-secondary-900/30 ring-1 ring-secondary-400'
        : 'hover:bg-surface-light-2 dark:hover:bg-surface-dark-2'
    } text-text-primary-light dark:text-text-primary-dark`;

  return (
    <Popover
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (!open) { setStep('menu'); setSelectedFolder(null); }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
          <ChevronDown className="h-3.5 w-3.5 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1.5">
        {step === 'menu' ? (
          <div className="space-y-0.5">
            <p className="text-label text-text-muted-light dark:text-text-muted-dark px-3 py-1">
              Download
            </p>
            <button className={itemClass} onClick={() => handleDownload('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Excel (.xlsx)
            </button>
            <button className={itemClass} onClick={() => handleDownload('csv')}>
              <FileText className="h-4 w-4 shrink-0" />
              CSV (.csv)
            </button>
            <div className="border-t border-stroke-light dark:border-stroke-dark my-1" />
            <p className="text-label text-text-muted-light dark:text-text-muted-dark px-3 py-1">
              Save to Documents
            </p>
            <button className={itemClass} onClick={() => handleSaveOption('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              Excel (.xlsx)
            </button>
            <button className={itemClass} onClick={() => handleSaveOption('csv')}>
              <FileText className="h-4 w-4 shrink-0" />
              CSV (.csv)
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-label text-text-secondary-light dark:text-text-secondary-dark px-2 py-1">
              Choose folder
            </p>
            <button
              className={folderItemClass(selectedFolder === null)}
              onClick={() => setSelectedFolder(null)}
            >
              <FolderX className="h-4 w-4 shrink-0 text-text-muted-light dark:text-text-muted-dark" />
              No folder
            </button>
            {saveConfig.folders.map((f) => (
              <button
                key={f.id}
                className={folderItemClass(selectedFolder === f.id)}
                onClick={() => setSelectedFolder(f.id)}
              >
                <Folder className="h-4 w-4 shrink-0 text-secondary-500" />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            <Button
              size="sm"
              className="w-full mt-1"
              onClick={handleSaveToDocuments}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FolderDown className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
