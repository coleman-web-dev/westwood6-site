'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { parseLedgerCSV, parseLedgerExcel, type ParsedLedgerRow } from '@/lib/utils/ledger-import';

interface StepUploadProps {
  onParsed: (headers: string[], rows: ParsedLedgerRow[], fileName: string) => void;
}

export function StepUpload({ onParsed }: StepUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ headers: string[]; rows: ParsedLedgerRow[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setParseErrors([]);
      setPreview(null);

      const ext = file.name.split('.').pop()?.toLowerCase();

      try {
        let headers: string[];
        let rows: ParsedLedgerRow[];
        let errors: string[];

        if (ext === 'csv') {
          const text = await file.text();
          const result = parseLedgerCSV(text);
          headers = result.headers;
          rows = result.rows;
          errors = result.errors;
        } else if (ext === 'xlsx' || ext === 'xls') {
          const buffer = await file.arrayBuffer();
          const result = await parseLedgerExcel(buffer);
          headers = result.headers;
          rows = result.rows;
          errors = result.errors;
        } else {
          setParseErrors(['Unsupported file type. Please upload a .csv, .xlsx, or .xls file.']);
          return;
        }

        if (errors.length > 0) {
          setParseErrors(errors);
        }

        if (rows.length === 0) {
          setParseErrors((prev) => [...prev, 'No data rows found in file.']);
          return;
        }

        setPreview({ headers, rows });
        onParsed(headers, rows, file.name);
      } catch (err) {
        setParseErrors([`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      }
    },
    [onParsed],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleRemove = useCallback(() => {
    setFileName(null);
    setPreview(null);
    setParseErrors([]);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleZoneClick = useCallback(() => {
    if (!fileName) inputRef.current?.click();
  }, [fileName]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-1">
          Upload Ledger File
        </h2>
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          Upload a CSV or Excel file containing your historical invoices and payments.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleZoneClick();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed p-8
          transition-colors duration-150
          ${
            isDragActive
              ? 'border-secondary-400 bg-secondary-50/30 dark:bg-secondary-950/20'
              : 'border-stroke-light bg-surface-light dark:border-stroke-dark dark:bg-surface-dark'
          }
          ${!fileName ? 'cursor-pointer' : ''}
        `}
      >
        {fileName ? (
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-secondary-500" />
            <span className="text-body text-text-primary-light dark:text-text-primary-dark">{fileName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
            <div className="text-center">
              <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                Upload Ledger File
              </p>
              <p className="mt-1 text-label text-text-secondary-light dark:text-text-secondary-dark">
                Supports .csv, .xlsx, and .xls files
              </p>
              <p className="mt-2 text-meta text-text-muted-light dark:text-text-muted-dark">
                Drag and drop or click to browse
              </p>
            </div>
          </>
        )}
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-inner-card border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-label font-semibold text-red-700 dark:text-red-400">Parse Errors</span>
          </div>
          <ul className="space-y-0.5 text-meta text-red-600 dark:text-red-400">
            {parseErrors.slice(0, 10).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {parseErrors.length > 10 && (
              <li className="font-medium">...and {parseErrors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Data preview */}
      {preview && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
              Preview
            </p>
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              {preview.rows.length} rows, {preview.headers.length} columns
            </p>
          </div>
          <div className="overflow-x-auto rounded-inner-card border border-stroke-light dark:border-stroke-dark">
            <table className="w-full text-meta">
              <thead>
                <tr className="bg-surface-light-2 dark:bg-surface-dark-2">
                  {preview.headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 10).map((row) => (
                  <tr
                    key={row.rowNumber}
                    className="border-t border-stroke-light dark:border-stroke-dark"
                  >
                    {preview.headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-1.5 text-text-primary-light dark:text-text-primary-dark whitespace-nowrap"
                      >
                        {row.raw[h] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 10 && (
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark text-center">
              Showing first 10 of {preview.rows.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}
