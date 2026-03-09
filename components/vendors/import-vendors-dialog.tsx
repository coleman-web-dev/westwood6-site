'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Download,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  autoMapVendorColumns,
  parseVendorsCSV,
} from '@/lib/utils/csv-parser';
import type { ParsedVendor } from '@/lib/utils/csv-parser';
import type { VendorCategoryRow } from '@/lib/types/database';

interface ImportVendorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  categories: VendorCategoryRow[];
  onImported: () => void;
}

type Step = 'upload' | 'mapping' | 'categories' | 'preview' | 'importing' | 'done';

const VENDOR_FIELDS: { value: keyof ParsedVendor | ''; label: string }[] = [
  { value: '', label: 'Skip this column' },
  { value: 'name', label: 'Contact Name' },
  { value: 'company', label: 'Company Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'category', label: 'Category' },
  { value: 'license_number', label: 'License Number' },
  { value: 'insurance_expiry', label: 'Insurance Expiry' },
  { value: 'tax_id', label: 'Tax ID' },
  { value: 'notes', label: 'Notes' },
  { value: 'address_line1', label: 'Address Line 1' },
  { value: 'address_line2', label: 'Address Line 2' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'ZIP Code' },
];

function generateTemplate(): string {
  const headers = [
    'name',
    'company',
    'phone',
    'email',
    'category',
    'license_number',
    'insurance_expiry',
    'notes',
    'address_line1',
    'city',
    'state',
    'zip',
  ];
  const sampleRow = [
    'John Smith',
    'Smith Landscaping LLC',
    '(555) 123-4567',
    'john@smithlandscaping.com',
    'Cleaning/Maintenance',
    'FL-12345',
    '2027-06-30',
    'Primary landscaper for community',
    '123 Main St',
    'Orlando',
    'FL',
    '32801',
  ];
  return headers.join(',') + '\n' + sampleRow.join(',') + '\n';
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Try to auto-match a CSV category string to an existing category.
 * Returns the category ID if matched, or null if no match found.
 */
function tryAutoMatch(categoryStr: string, cats: VendorCategoryRow[]): string | null {
  if (!categoryStr) return null;

  const lower = categoryStr.toLowerCase().trim();

  // Exact name match
  const exact = cats.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact.id;

  // Slug match
  const slug = slugify(categoryStr);
  const slugMatch = cats.find((c) => c.slug === slug);
  if (slugMatch) return slugMatch.id;

  // Partial match (either direction)
  const partial = cats.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase()),
  );
  if (partial) return partial.id;

  return null;
}

export function ImportVendorsDialog({
  open,
  onOpenChange,
  communityId,
  categories,
  onImported,
}: ImportVendorsDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, keyof ParsedVendor | ''>>({});
  const [parsedVendors, setParsedVendors] = useState<ParsedVendor[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Category mapping state
  const [uniqueFileCategories, setUniqueFileCategories] = useState<string[]>([]);
  // Maps CSV category string -> category ID
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
  // Local copy of categories that grows as user creates new ones during import
  const [localCategories, setLocalCategories] = useState<VendorCategoryRow[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  function reset() {
    setStep('upload');
    setFileName(null);
    setCsvContent('');
    setHeaders([]);
    setSampleRows([]);
    setColumnMapping({});
    setParsedVendors([]);
    setParseErrors([]);
    setImportedCount(0);
    setSkippedCount(0);
    setUniqueFileCategories([]);
    setCategoryMapping({});
    setLocalCategories([]);
    setNewCategoryName('');
    setCreatingCategory(false);
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function processFile(file: File) {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const csv = XLSX.utils.sheet_to_csv(firstSheet);
          handleCsvLoaded(csv);
        } catch {
          toast.error('Failed to read Excel file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          handleCsvLoaded(text);
        }
      };
      reader.readAsText(file);
    }
  }

  function handleCsvLoaded(csv: string) {
    setCsvContent(csv);

    const preview = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
    });

    if (!preview.meta.fields || preview.meta.fields.length === 0) {
      toast.error('Could not detect any columns in the file.');
      return;
    }

    const detectedHeaders = preview.meta.fields;
    setHeaders(detectedHeaders);
    setSampleRows(preview.data);

    const mapping = autoMapVendorColumns(detectedHeaders);
    setColumnMapping(mapping);

    setStep('mapping');
  }

  function handleMappingChange(csvColumn: string, vendorField: keyof ParsedVendor | '') {
    setColumnMapping((prev) => ({ ...prev, [csvColumn]: vendorField }));
  }

  /**
   * After column mapping, parse the file and determine if we need a category mapping step.
   */
  function handleAfterColumnMapping() {
    const mappedFields = Object.values(columnMapping);
    const hasName = mappedFields.includes('name');
    const hasCompany = mappedFields.includes('company');
    if (!hasName && !hasCompany) {
      toast.error('You must map at least "Contact Name" or "Company Name".');
      return;
    }

    // Parse the full file
    const result = parseVendorsCSV(csvContent, columnMapping);
    setParsedVendors(result.data);
    setParseErrors(result.errors);

    // Check if category column was mapped
    const hasCategoryColumn = mappedFields.includes('category');

    if (hasCategoryColumn) {
      // Extract unique non-empty category values from parsed data
      const catValues = new Set<string>();
      for (const v of result.data) {
        if (v.category.trim()) catValues.add(v.category.trim());
      }
      const uniqueCats = Array.from(catValues).sort();
      setUniqueFileCategories(uniqueCats);

      // Initialize local categories with the prop
      setLocalCategories([...categories]);

      // Auto-match what we can
      const autoMap: Record<string, string> = {};
      const generalId = categories.find((c) => c.slug === 'general')?.id ?? categories[0]?.id ?? '';

      for (const catStr of uniqueCats) {
        const matched = tryAutoMatch(catStr, categories);
        autoMap[catStr] = matched ?? generalId;
      }
      setCategoryMapping(autoMap);

      // If there are categories to map, show the step
      if (uniqueCats.length > 0) {
        setStep('categories');
        return;
      }
    }

    // No category column or no category values, skip to preview
    setStep('preview');
  }

  function handleCategoryMappingChange(csvCategory: string, categoryId: string) {
    setCategoryMapping((prev) => ({ ...prev, [csvCategory]: categoryId }));
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    // Check if already exists locally
    if (localCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`Category "${name}" already exists.`);
      return;
    }

    setCreatingCategory(true);
    const supabase = createClient();

    const slug = slugify(name);
    const maxOrder = localCategories.reduce((max, c) => Math.max(max, c.display_order), 0);

    const { data, error } = await supabase
      .from('vendor_categories')
      .insert({
        community_id: communityId,
        name,
        slug,
        display_order: maxOrder + 1,
        is_system: false,
      })
      .select()
      .single();

    setCreatingCategory(false);

    if (error) {
      toast.error(`Failed to create category: ${error.message}`);
      return;
    }

    const newCat = data as VendorCategoryRow;
    setLocalCategories((prev) => [...prev, newCat]);
    setNewCategoryName('');
    toast.success(`Created "${name}" category.`);
  }

  function resolveCategoryId(csvCategoryStr: string): string {
    if (!csvCategoryStr.trim()) {
      return localCategories.find((c) => c.slug === 'general')?.id ?? localCategories[0]?.id ?? '';
    }
    return categoryMapping[csvCategoryStr.trim()]
      ?? localCategories.find((c) => c.slug === 'general')?.id
      ?? localCategories[0]?.id
      ?? '';
  }

  async function handleImport() {
    setStep('importing');

    const supabase = createClient();
    let imported = 0;
    let skipped = 0;

    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('name')
      .eq('community_id', communityId);

    const existingNames = new Set(
      (existingVendors ?? []).map((v) => v.name.toLowerCase().trim()),
    );

    const batchSize = 50;
    const toInsert: Record<string, unknown>[] = [];

    for (const vendor of parsedVendors) {
      if (existingNames.has(vendor.name.toLowerCase().trim())) {
        skipped++;
        continue;
      }

      toInsert.push({
        community_id: communityId,
        name: vendor.name,
        company: vendor.company || null,
        phone: vendor.phone || null,
        email: vendor.email || null,
        category_id: resolveCategoryId(vendor.category),
        license_number: vendor.license_number || null,
        insurance_expiry: vendor.insurance_expiry || null,
        tax_id: vendor.tax_id || null,
        notes: vendor.notes || null,
        address_line1: vendor.address_line1 || null,
        address_line2: vendor.address_line2 || null,
        city: vendor.city || null,
        state: vendor.state || null,
        zip: vendor.zip || null,
      });
    }

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('vendors').insert(batch);

      if (error) {
        toast.error(`Failed to import batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        setStep('preview');
        return;
      }

      imported += batch.length;
    }

    setImportedCount(imported);
    setSkippedCount(skipped);
    setStep('done');
    onImported();
  }

  function handleDownloadTemplate() {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Count how many vendors use each file category
  const categoryCounts: Record<string, number> = {};
  for (const v of parsedVendors) {
    const cat = v.category.trim();
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import Vendors'}
            {step === 'mapping' && 'Map Columns'}
            {step === 'categories' && 'Map Categories'}
            {step === 'preview' && 'Review Import'}
            {step === 'importing' && 'Importing...'}
            {step === 'done' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Upload a CSV or Excel file containing your vendor list. The importer
              will auto-detect columns and let you review before importing.
            </p>

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
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed p-8
                transition-colors duration-150 cursor-pointer
                ${
                  isDragActive
                    ? 'border-secondary-400 bg-secondary-50/30 dark:bg-secondary-950/20'
                    : 'border-stroke-light bg-surface-light dark:border-stroke-dark dark:bg-surface-dark'
                }
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
                      setFileName(null);
                      setCsvContent('');
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
                  <div className="text-center">
                    <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      Upload CSV or Excel file
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

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-label text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download template CSV
            </button>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4 py-2">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              We detected {headers.length} columns in your file. Match each column to a vendor
              field, or skip columns you don&apos;t need. Each vendor needs at least a contact
              name or company name.
            </p>

            <div className="space-y-2">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-3 pb-1">
                <p className="flex-1 text-meta font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">
                  Your File
                </p>
                <div className="w-44 shrink-0">
                  <p className="text-meta font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">
                    Import As
                  </p>
                </div>
              </div>

              {headers.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-3 px-3 py-2 rounded-inner-card border border-stroke-light dark:border-stroke-dark"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                      {header}
                    </p>
                    {sampleRows[0] && sampleRows[0][header] && (
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark truncate">
                        e.g. {sampleRows[0][header]}
                      </p>
                    )}
                  </div>
                  <div className="w-44 shrink-0">
                    <Select
                      value={columnMapping[header] || '_skip'}
                      onValueChange={(v) =>
                        handleMappingChange(header, v === '_skip' ? '' : (v as keyof ParsedVendor))
                      }
                    >
                      <SelectTrigger className="h-8 text-label">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VENDOR_FIELDS.map((f) => (
                          <SelectItem key={f.value || '_skip'} value={f.value || '_skip'}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { reset(); }}>
                Back
              </Button>
              <Button onClick={handleAfterColumnMapping}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Category Mapping */}
        {step === 'categories' && (
          <div className="space-y-4 py-2">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Your file has {uniqueFileCategories.length} categor{uniqueFileCategories.length !== 1 ? 'ies' : 'y'}.
              Match each to an existing category, or create new ones.
            </p>

            <div className="space-y-2">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-3 pb-1">
                <p className="flex-1 text-meta font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">
                  In Your File
                </p>
                <div className="w-48 shrink-0">
                  <p className="text-meta font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark">
                    Assign To
                  </p>
                </div>
              </div>

              {uniqueFileCategories.map((fileCat) => {
                const isAutoMatched = tryAutoMatch(fileCat, categories) !== null;
                return (
                  <div
                    key={fileCat}
                    className="flex items-center gap-3 px-3 py-2 rounded-inner-card border border-stroke-light dark:border-stroke-dark"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                        {fileCat}
                      </p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                        {categoryCounts[fileCat] ?? 0} vendor{(categoryCounts[fileCat] ?? 0) !== 1 ? 's' : ''}
                        {isAutoMatched && (
                          <span className="ml-1.5 text-green-600 dark:text-green-400">
                            (auto-matched)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="w-48 shrink-0">
                      <Select
                        value={categoryMapping[fileCat] || '_general'}
                        onValueChange={(v) => handleCategoryMappingChange(fileCat, v)}
                      >
                        <SelectTrigger className="h-8 text-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {localCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create new category inline */}
            <div className="rounded-inner-card border border-dashed border-stroke-light dark:border-stroke-dark p-3">
              <p className="text-label font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                Need a new category?
              </p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="h-8 text-label flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCategory}
                  className="shrink-0"
                >
                  {creatingCategory ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Create
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button onClick={() => setStep('preview')}>
                Continue to Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            {parseErrors.length > 0 && (
              <div className="rounded-inner-card border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 p-3 space-y-1">
                <div className="flex items-center gap-2 text-body font-medium text-yellow-800 dark:text-yellow-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {parseErrors.length} warning{parseErrors.length !== 1 ? 's' : ''}
                </div>
                <ul className="text-meta text-yellow-700 dark:text-yellow-400 space-y-0.5 pl-6 list-disc max-h-24 overflow-y-auto">
                  {parseErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Ready to import <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">{parsedVendors.length}</span> vendor{parsedVendors.length !== 1 ? 's' : ''}.
              Vendors without a contact name will use their company name. Duplicates will be skipped automatically.
            </p>

            {/* Preview table */}
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-label">
                  <thead className="bg-surface-light-2 dark:bg-surface-dark-2 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-text-secondary-light dark:text-text-secondary-dark font-medium">Name</th>
                      <th className="px-3 py-2 text-left text-text-secondary-light dark:text-text-secondary-dark font-medium">Company</th>
                      <th className="px-3 py-2 text-left text-text-secondary-light dark:text-text-secondary-dark font-medium">Phone</th>
                      <th className="px-3 py-2 text-left text-text-secondary-light dark:text-text-secondary-dark font-medium">Email</th>
                      <th className="px-3 py-2 text-left text-text-secondary-light dark:text-text-secondary-dark font-medium">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke-light dark:divide-stroke-dark">
                    {parsedVendors.slice(0, 50).map((v, i) => {
                      const catId = resolveCategoryId(v.category);
                      const catName = (localCategories.length > 0 ? localCategories : categories)
                        .find((c) => c.id === catId)?.name ?? 'General';
                      return (
                        <tr key={i} className="text-text-primary-light dark:text-text-primary-dark">
                          <td className="px-3 py-1.5 whitespace-nowrap">{v.name}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap text-text-secondary-light dark:text-text-secondary-dark">{v.company || '-'}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap text-text-secondary-light dark:text-text-secondary-dark">{v.phone || '-'}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap text-text-secondary-light dark:text-text-secondary-dark">{v.email || '-'}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap text-text-muted-light dark:text-text-muted-dark">
                            {catName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedVendors.length > 50 && (
                <div className="px-3 py-2 text-meta text-text-muted-light dark:text-text-muted-dark bg-surface-light-2 dark:bg-surface-dark-2 border-t border-stroke-light dark:border-stroke-dark">
                  Showing first 50 of {parsedVendors.length} vendors
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setStep(uniqueFileCategories.length > 0 ? 'categories' : 'mapping')}
              >
                Back
              </Button>
              <Button onClick={handleImport} disabled={parsedVendors.length === 0}>
                Import {parsedVendors.length} Vendor{parsedVendors.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 5: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-secondary-400" />
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Importing vendors...
            </p>
          </div>
        )}

        {/* Step 6: Done */}
        {step === 'done' && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                Import complete!
              </p>
              <div className="text-center space-y-1">
                <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  {importedCount} vendor{importedCount !== 1 ? 's' : ''} imported successfully
                </p>
                {skippedCount > 0 && (
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {skippedCount} duplicate{skippedCount !== 1 ? 's' : ''} skipped
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
