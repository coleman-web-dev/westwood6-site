'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Switch } from '@/components/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2, Plus, X, Sparkles } from 'lucide-react';
import type { BudgetCategory } from '@/lib/types/database';

const CATEGORY_OPTIONS: { value: BudgetCategory; label: string }[] = [
  { value: 'dues', label: 'Dues' },
  { value: 'assessments', label: 'Assessments' },
  { value: 'amenity_fees', label: 'Amenity Fees' },
  { value: 'interest', label: 'Interest' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'management', label: 'Management' },
  { value: 'legal', label: 'Legal' },
  { value: 'reserves', label: 'Reserves' },
  { value: 'other', label: 'Other' },
];

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp';

interface ParsedItem {
  name: string;
  category: BudgetCategory;
  budgeted_amount: number; // cents
  is_income: boolean;
}

interface ImportBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onImported: () => void;
}

export function ImportBudgetDialog({
  open,
  onOpenChange,
  budgetId,
  onImported,
}: ImportBudgetDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleParse() {
    if (!file) return;

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/budget/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to parse document.');
        setParsing(false);
        return;
      }

      if (!data.items || data.items.length === 0) {
        toast.error('No budget line items found in the document.');
        setParsing(false);
        return;
      }

      setItems(data.items);
      setStep('review');
      toast.success(`Found ${data.items.length} line items.`);
    } catch {
      toast.error('Failed to analyze document. Please try again.');
    }
    setParsing(false);
  }

  function updateItem(index: number, updates: Partial<ParsedItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: '', category: 'other', budgeted_amount: 0, is_income: false },
    ]);
  }

  async function handleSave() {
    const validItems = items.filter((item) => item.name.trim() && item.budgeted_amount > 0);

    if (validItems.length === 0) {
      toast.error('No valid line items to save. Each item needs a name and amount.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const rows = validItems.map((item) => ({
      budget_id: budgetId,
      category: item.category,
      name: item.name.trim(),
      budgeted_amount: item.budgeted_amount,
      actual_amount: 0,
      is_income: item.is_income,
      notes: null,
    }));

    const { error } = await supabase.from('budget_line_items').insert(rows);

    setSaving(false);

    if (error) {
      toast.error('Failed to save line items.');
      return;
    }

    toast.success(`${validItems.length} line items imported.`);
    resetAndClose();
    onImported();
  }

  function resetAndClose() {
    setFile(null);
    setItems([]);
    setStep('upload');
    onOpenChange(false);
  }

  const incomeTotal = items.filter((i) => i.is_income).reduce((s, i) => s + i.budgeted_amount, 0);
  const expenseTotal = items.filter((i) => !i.is_income).reduce((s, i) => s + i.budgeted_amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary-400" />
            Import Budget from Document
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
              Upload your budget document and AI will extract the line items automatically. You can review and edit everything before saving.
            </p>

            <div
              className="flex flex-col items-center justify-center gap-3 rounded-inner-card border-2 border-dashed border-stroke-light dark:border-stroke-dark p-8 cursor-pointer hover:border-secondary-400/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
              {file ? (
                <div className="text-center">
                  <p className="text-body text-text-primary-light dark:text-text-primary-dark font-medium">
                    {file.name}
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                    Click to select a file
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                    PDF or image (JPG, PNG), up to 50 MB
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleParse} disabled={!file || parsing}>
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Document
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 py-2">
            {/* Summary bar */}
            <div className="flex items-center gap-4 text-body">
              <span className="text-text-muted-light dark:text-text-muted-dark">
                {items.length} items
              </span>
              <span className="text-green-600 dark:text-green-400">
                Income: ${(incomeTotal / 100).toFixed(2)}
              </span>
              <span className="text-red-600 dark:text-red-400">
                Expenses: ${(expenseTotal / 100).toFixed(2)}
              </span>
            </div>

            {/* Editable line items */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[auto_1fr_1fr_120px_auto] gap-2 items-center rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 px-3 py-2"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Switch
                      checked={item.is_income}
                      onCheckedChange={(v) => updateItem(index, { is_income: v })}
                      className="scale-75"
                    />
                    <span className="text-[10px] text-text-muted-light dark:text-text-muted-dark">
                      {item.is_income ? 'Inc' : 'Exp'}
                    </span>
                  </div>

                  <Select
                    value={item.category}
                    onValueChange={(v) => updateItem(index, { category: v as BudgetCategory })}
                  >
                    <SelectTrigger className="h-8 text-body">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="Line item name"
                    className="h-8 text-body"
                  />

                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark text-body">
                      $
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(item.budgeted_amount / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(index, {
                          budgeted_amount: Math.round(Number(e.target.value) * 100),
                        })
                      }
                      className="h-8 text-body pl-5 text-right tabular-nums"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-7 w-7 p-0 text-text-muted-light dark:text-text-muted-dark hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => { setStep('upload'); setItems([]); }}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save ${items.filter((i) => i.name.trim() && i.budgeted_amount > 0).length} Items`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
