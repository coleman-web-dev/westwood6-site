'use client';

import { useState } from 'react';
import { Download, ChevronDown, FolderDown, Save, Loader2, Folder, FolderX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { toast } from 'sonner';
import { downloadCsv, saveCsvToDocuments, buildCsvBlob } from '@/lib/utils/export-csv';
import type { CsvColumn } from '@/lib/utils/export-csv';
import type { DocumentFolder } from '@/lib/types/database';

interface ExportCsvButtonProps<T> {
  filename: string;
  getData: () => T[];
  columns: CsvColumn<T>[];
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default' | 'ghost' | 'secondary';
  /** When provided, enables "Save to Documents" options. Board-only. */
  saveConfig?: {
    communityId: string;
    memberId: string;
    folders: DocumentFolder[];
  };
}

export function ExportCsvButton<T>({
  filename,
  getData,
  columns,
  label = 'Export CSV',
  size = 'sm',
  variant = 'outline',
  saveConfig,
}: ExportCsvButtonProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'menu' | 'folder'>('menu');
  const [action, setAction] = useState<'save' | 'both'>('save');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  function handleDownload() {
    const data = getData();
    downloadCsv(filename, data, columns);
    setMenuOpen(false);
  }

  function handlePickFolder(act: 'save' | 'both') {
    setAction(act);
    setStep('folder');
  }

  async function handleSaveToDocuments() {
    if (!saveConfig) return;
    setSaving(true);

    const data = getData();
    const blob = buildCsvBlob(data, columns);
    const supabase = createClient();

    if (action === 'both') {
      // Download first
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    const result = await saveCsvToDocuments(supabase, {
      filename,
      blob,
      communityId: saveConfig.communityId,
      memberId: saveConfig.memberId,
      folderId: selectedFolder,
    });

    setSaving(false);

    if (!result.success) {
      toast.error(result.error ?? 'Failed to save to documents.');
    } else {
      toast.success('Report saved to Documents.');
    }

    setMenuOpen(false);
    setStep('menu');
    setSelectedFolder(null);
  }

  // No save config = plain download button
  if (!saveConfig) {
    return (
      <Button variant={variant} size={size} onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        {label}
      </Button>
    );
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
    <div className="flex items-center">
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        className="rounded-r-none"
      >
        <Download className="h-4 w-4 mr-2" />
        {label}
      </Button>
      <Popover
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open) { setStep('menu'); setSelectedFolder(null); }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="rounded-l-none border-l-0 px-1.5"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1.5">
          {step === 'menu' ? (
            <div className="space-y-0.5">
              <button className={itemClass} onClick={handleDownload}>
                <Download className="h-4 w-4 shrink-0" />
                Download
              </button>
              <button className={itemClass} onClick={() => handlePickFolder('save')}>
                <FolderDown className="h-4 w-4 shrink-0" />
                Save to Documents
              </button>
              <button className={itemClass} onClick={() => handlePickFolder('both')}>
                <Save className="h-4 w-4 shrink-0" />
                Download and Save
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
    </div>
  );
}
