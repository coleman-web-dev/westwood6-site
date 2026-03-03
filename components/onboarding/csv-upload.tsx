'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';

interface CSVUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
  accept?: string;
  label?: string;
  description?: string;
}

export function CSVUpload({
  onFileLoaded,
  accept = '.csv',
  label = 'Upload CSV',
  description,
}: CSVUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          onFileLoaded(text, file.name);
        }
      };
      reader.readAsText(file);
    },
    [onFileLoaded],
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
      if (file) {
        readFile(file);
      }
    },
    [readFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile],
  );

  const handleRemove = useCallback(() => {
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const handleZoneClick = useCallback(() => {
    if (!fileName) {
      inputRef.current?.click();
    }
  }, [fileName]);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleZoneClick();
          }
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
            <span className="text-body text-text-primary-light dark:text-text-primary-dark">
              {fileName}
            </span>
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
                {label}
              </p>
              {description && (
                <p className="mt-1 text-label text-text-secondary-light dark:text-text-secondary-dark">
                  {description}
                </p>
              )}
              <p className="mt-2 text-meta text-text-muted-light dark:text-text-muted-dark">
                Drag and drop or click to browse
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
