'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Check,
  Send,
  ChevronLeft,
  Bot,
  User,
  X,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  ALL_ESTOPPEL_VARIABLES,
} from '@/lib/utils/estoppel-template';
import type { EstoppelField, EstoppelFieldPhase, AgreementFieldType } from '@/lib/types/database';

interface EstoppelWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: string, fields: EstoppelField[]) => void;
  existingTemplate?: string | null;
  existingFields?: EstoppelField[];
}

const FIELD_TYPE_OPTIONS: { value: AgreementFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
];

const PHASE_CONFIG: Record<EstoppelFieldPhase, { label: string; color: string; bgClass: string; textClass: string; dotClass: string; description: string }> = {
  requester: {
    label: 'Requester fills this',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    bgClass: 'bg-blue-100 dark:bg-blue-900/60',
    textClass: 'text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-500',
    description: 'Title company / attorney provides this on the request form',
  },
  system: {
    label: 'Auto-filled',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
    bgClass: 'bg-green-100 dark:bg-green-900/60',
    textClass: 'text-green-700 dark:text-green-300',
    dotClass: 'bg-green-500',
    description: 'Pulled automatically from your HOA database',
  },
  board: {
    label: 'Board fills this',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    bgClass: 'bg-amber-100 dark:bg-amber-900/60',
    textClass: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    description: 'Board member fills this when reviewing the request',
  },
};

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Parse a template string into segments: text parts and placeholder parts.
 * Returns an array of { type: 'text' | 'placeholder', content, fieldKey? }
 */
function parseTemplate(template: string): Array<{ type: 'text' | 'placeholder'; content: string; fieldKey?: string }> {
  const segments: Array<{ type: 'text' | 'placeholder'; content: string; fieldKey?: string }> = [];
  const regex = /\{\{\s*(\w+)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: template.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'placeholder', content: match[0], fieldKey: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({ type: 'text', content: template.slice(lastIndex) });
  }

  return segments;
}

/**
 * Look up the human-readable label for a field key.
 */
function getFieldLabel(key: string, fields: EstoppelField[]): string {
  const field = fields.find((f) => f.key === key);
  if (field) return field.label;
  const variable = ALL_ESTOPPEL_VARIABLES.find((v) => v.key === key);
  if (variable) return variable.label;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Look up the phase for a field key.
 */
function getFieldPhase(key: string, fields: EstoppelField[]): EstoppelFieldPhase {
  const field = fields.find((f) => f.key === key);
  if (field) return field.fill_phase;
  const variable = ALL_ESTOPPEL_VARIABLES.find((v) => v.key === key);
  if (variable) return variable.phase;
  return 'board';
}

// ─── Pill Component ─────────────────────────────────────────────────────────

interface FieldPillProps {
  fieldKey: string;
  fields: EstoppelField[];
  onUpdateField: (key: string, updates: Partial<EstoppelField>) => void;
  onRemoveField: (key: string) => void;
  onAiRefine: (instruction: string) => void;
  isRefining: boolean;
}

function FieldPill({ fieldKey, fields, onUpdateField, onRemoveField, onAiRefine, isRefining }: FieldPillProps) {
  const [aiInput, setAiInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const field = fields.find((f) => f.key === fieldKey);
  const phase = getFieldPhase(fieldKey, fields);
  const label = getFieldLabel(fieldKey, fields);
  const config = PHASE_CONFIG[phase];

  function handleAiSubmit() {
    if (!aiInput.trim()) return;
    onAiRefine(`For the "${label}" field ({{${fieldKey}}}): ${aiInput.trim()}`);
    setAiInput('');
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-current/30 ${config.bgClass} ${config.textClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} shrink-0`} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <div className="p-3 border-b border-stroke-light dark:border-stroke-dark">
          <div className="flex items-center justify-between mb-1">
            <span className="text-body font-semibold text-text-primary-light dark:text-text-primary-dark">
              {label}
            </span>
            <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
              {config.label}
            </Badge>
          </div>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            {config.description}
          </p>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark font-mono mt-1">
            {`{{${fieldKey}}}`}
          </p>
        </div>

        {field && (
          <div className="p-3 space-y-2 border-b border-stroke-light dark:border-stroke-dark">
            <div>
              <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">Label</label>
              <Input
                value={field.label}
                onChange={(e) => onUpdateField(fieldKey, { label: e.target.value })}
                className="h-7 text-sm mt-0.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">Type</label>
                <Select
                  value={field.type}
                  onValueChange={(v) => onUpdateField(fieldKey, { type: v as AgreementFieldType })}
                >
                  <SelectTrigger className="h-7 text-sm mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">Who fills this</label>
                <Select
                  value={field.fill_phase}
                  onValueChange={(v) => onUpdateField(fieldKey, { fill_phase: v as EstoppelFieldPhase })}
                >
                  <SelectTrigger className="h-7 text-sm mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requester">Requester</SelectItem>
                    <SelectItem value="system">Auto-filled</SelectItem>
                    <SelectItem value="board">Board</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] text-text-muted-light dark:text-text-muted-dark">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdateField(fieldKey, { required: e.target.checked })}
                />
                Required field
              </label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  onRemoveField(fieldKey);
                  setIsOpen(false);
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
            {field.type === 'select' && (
              <div>
                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                  Options (comma separated)
                </label>
                <Input
                  value={(field.options ?? []).join(', ')}
                  onChange={(e) =>
                    onUpdateField(fieldKey, {
                      options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="h-7 text-sm mt-0.5"
                  placeholder="Option 1, Option 2"
                />
              </div>
            )}
            {field.fill_phase === 'board' && (
              <div>
                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                  Default answer (pre-filled every time)
                </label>
                <Input
                  value={field.default_value ?? ''}
                  onChange={(e) => onUpdateField(fieldKey, { default_value: e.target.value || undefined })}
                  className="h-7 text-sm mt-0.5"
                  placeholder="Leave blank to require manual entry"
                />
                {field.default_value && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                    This will be pre-filled during review. Board can still change it.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="p-3">
          <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark mb-1 block">
            Ask AI to change this field
          </label>
          <div className="flex gap-1.5">
            <Input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="e.g. Make this optional"
              className="h-7 text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRefining) {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleAiSubmit}
              disabled={isRefining || !aiInput.trim()}
            >
              {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Interactive Document Preview ───────────────────────────────────────────

interface DocumentPreviewProps {
  template: string;
  fields: EstoppelField[];
  onUpdateField: (key: string, updates: Partial<EstoppelField>) => void;
  onRemoveField: (key: string) => void;
  onAiRefine: (instruction: string) => void;
  isRefining: boolean;
}

function DocumentPreview({ template, fields, onUpdateField, onRemoveField, onAiRefine, isRefining }: DocumentPreviewProps) {
  const segments = useMemo(() => parseTemplate(template), [template]);

  return (
    <div className="bg-white dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-6 font-serif text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.content}</span>;
        }
        return (
          <FieldPill
            key={`${seg.fieldKey}-${i}`}
            fieldKey={seg.fieldKey!}
            fields={fields}
            onUpdateField={onUpdateField}
            onRemoveField={onRemoveField}
            onAiRefine={onAiRefine}
            isRefining={isRefining}
          />
        );
      })}
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

export function EstoppelWizardDialog({
  open,
  onOpenChange,
  onSave,
  existingTemplate,
  existingFields,
}: EstoppelWizardDialogProps) {
  const [step, setStep] = useState<1 | 2>(existingTemplate ? 2 : 1);
  const [rawText, setRawText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  const [template, setTemplate] = useState(existingTemplate ?? '');
  const [fields, setFields] = useState<EstoppelField[]>(existingFields ?? []);

  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; message: string }[]>([]);
  const [refinementInput, setRefinementInput] = useState('');
  const [refining, setRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showFieldList, setShowFieldList] = useState(false);

  useEffect(() => {
    if (open) {
      setTemplate(existingTemplate ?? '');
      setFields(existingFields ?? []);
      setChatHistory([]);
      setStep(existingTemplate ? 2 : 1);
      setShowFieldList(false);
    }
  }, [open, existingTemplate, existingFields]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setRawText('');
        setAnalyzing(false);
        setChatHistory([]);
        setRefinementInput('');
        setRefining(false);
        setShowFieldList(false);
        if (!existingTemplate) {
          setTemplate('');
          setFields([]);
        }
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, existingTemplate],
  );

  // ── File upload ──

  async function handlePdfUpload(file: File) {
    setExtractingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to extract text. Try pasting the text instead.');
        return;
      }

      if (!data.text) {
        toast.error('No text found in this file. It may be a scanned image. Try pasting the text instead.');
        return;
      }

      setRawText(data.text);
      toast.success(
        data.pageCount
          ? `Extracted text from ${data.pageCount} page${data.pageCount > 1 ? 's' : ''}.`
          : 'Text extracted successfully.',
      );
    } catch (err) {
      console.error('File extraction error:', err);
      toast.error('Failed to extract text. Try pasting the text instead.');
    } finally {
      setExtractingPdf(false);
    }
  }

  // ── AI analysis ──

  async function callEdgeFunction(body: Record<string, unknown>): Promise<{ template?: string; fields?: EstoppelField[]; summary?: string }> {
    const supabase = createClient();
    await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('You must be logged in to use AI analysis.');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-estoppel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Edge function returned ${response.status}`);
    }

    return data;
  }

  async function handleAnalyze() {
    if (!rawText.trim()) {
      toast.error('Please upload a file or paste the estoppel form text first.');
      return;
    }

    setAnalyzing(true);
    try {
      const data = await callEdgeFunction({ estoppel_text: rawText.trim() });

      if (!data.template) {
        throw new Error('AI returned an invalid response');
      }

      setTemplate(data.template);
      setFields(data.fields ?? []);
      if (data.summary) {
        setChatHistory([{ role: 'ai', message: data.summary }]);
      }
      setStep(2);
      toast.success('Form analyzed! Click any colored field to edit it.');
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  // ── AI refinement ──

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  async function handleRefine(instruction?: string) {
    const text = instruction ?? refinementInput.trim();
    if (!text) return;

    setRefining(true);
    setChatHistory((prev) => [...prev, { role: 'user', message: text }]);
    if (!instruction) setRefinementInput('');

    try {
      const data = await callEdgeFunction({
        refinement: {
          current_template: template,
          current_fields: fields,
          instruction: text,
        },
      });

      if (data.template) setTemplate(data.template);
      if (data.fields) setFields(data.fields);
      if (data.summary) {
        const summary = data.summary;
        setChatHistory((prev) => [...prev, { role: 'ai' as const, message: summary }]);
      }
    } catch (err) {
      console.error('Refinement error:', err);
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      ]);
    } finally {
      setRefining(false);
    }
  }

  // ── Field operations ──

  function updateField(key: string, updates: Partial<EstoppelField>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...updates } : f)));
  }

  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f.key !== key));
    // Also remove from template
    setTemplate((prev) => prev.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), ''));
  }

  function addField() {
    const idx = fields.length + 1;
    const newKey = `custom_field_${idx}`;
    const newField: EstoppelField = {
      id: generateId(),
      key: newKey,
      label: `Custom Field ${idx}`,
      type: 'text',
      required: false,
      fill_phase: 'board',
    };
    setFields((prev) => [...prev, newField]);
    // Append placeholder to template
    setTemplate((prev) => prev + `\n{{${newKey}}}`);
    toast.success('Field added to the end of the document. Click it to configure.');
  }

  const requesterFieldCount = fields.filter((f) => f.fill_phase === 'requester').length;
  const systemFieldCount = fields.filter((f) => f.fill_phase === 'system').length;
  const boardFieldCount = fields.filter((f) => f.fill_phase === 'board').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-page-title">
            {step === 1 ? 'Upload Estoppel Form' : 'Review Your Estoppel Certificate'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Upload your estoppel certificate or paste the form text. AI will analyze it and identify all fields.'
              : 'Click any colored field to edit it, change who fills it, or ask AI to modify it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* ── Step 1: Upload/Paste ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Tabs defaultValue="upload">
                <TabsList>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="paste">
                    <FileText className="h-4 w-4 mr-1.5" />
                    Paste Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <div className="border-2 border-dashed border-stroke-light dark:border-stroke-dark rounded-panel p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-3 text-text-muted-light dark:text-text-muted-dark" />
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-3">
                      Upload your estoppel certificate (PDF or Word)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      id="estoppel-pdf-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('estoppel-pdf-upload')?.click()}
                      disabled={extractingPdf}
                    >
                      {extractingPdf ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Extracting text...
                        </>
                      ) : (
                        'Choose File'
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="mt-4">
                  <Textarea
                    placeholder="Paste the full estoppel certificate text here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>

              {rawText && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-inner-card p-3">
                  <p className="text-body text-green-800 dark:text-green-200">
                    <Check className="h-4 w-4 inline mr-1.5" />
                    Text loaded ({rawText.length.toLocaleString()} characters). Ready for AI analysis.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Interactive Document Preview ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3" style={{ height: 'calc(90vh - 220px)', minHeight: 0 }}>
              {/* Legend */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-meta">
                  <span className="text-text-muted-light dark:text-text-muted-dark mr-1">Fields:</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${PHASE_CONFIG.requester.dotClass}`} />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      Requester ({requesterFieldCount})
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${PHASE_CONFIG.system.dotClass}`} />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      Auto-filled ({systemFieldCount})
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${PHASE_CONFIG.board.dotClass}`} />
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">
                      Board ({boardFieldCount})
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowFieldList(!showFieldList)}
                  >
                    {showFieldList ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Hide fields
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        All fields ({fields.length})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={addField}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add field
                  </Button>
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 min-h-0 overflow-hidden flex gap-3">
                {/* Document preview */}
                <ScrollArea className={`flex-1 ${showFieldList ? '' : 'w-full'}`}>
                  <div className="pr-2">
                    <DocumentPreview
                      template={template}
                      fields={fields}
                      onUpdateField={updateField}
                      onRemoveField={removeField}
                      onAiRefine={(instruction) => handleRefine(instruction)}
                      isRefining={refining}
                    />
                  </div>
                </ScrollArea>

                {/* Field list sidebar */}
                {showFieldList && (
                  <div className="w-64 shrink-0 border-l border-stroke-light dark:border-stroke-dark pl-3">
                    <ScrollArea className="h-full">
                      <div className="space-y-1 pr-2">
                        <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                          All Fields
                        </p>
                        {fields.map((field) => {
                          const config = PHASE_CONFIG[field.fill_phase];
                          return (
                            <div
                              key={field.id}
                              className="flex items-center gap-2 py-1 px-2 rounded text-xs group"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
                              <span className="flex-1 truncate text-text-primary-light dark:text-text-primary-dark">
                                {field.label}
                              </span>
                              {field.required && (
                                <span className="text-red-400 text-[10px]">req</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* AI Chat bar */}
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-3">
                {chatHistory.length > 0 && (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto mb-2 px-1">
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 text-xs ${msg.role === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.role === 'ai' && (
                          <Bot className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                        )}
                        <span
                          className={
                            msg.role === 'user'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2.5 py-1 rounded-lg max-w-[80%]'
                              : 'text-text-secondary-light dark:text-text-secondary-dark max-w-[80%]'
                          }
                        >
                          {msg.message}
                        </span>
                        {msg.role === 'user' && (
                          <User className="h-3.5 w-3.5 mt-0.5 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <Sparkles className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                  <Input
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    placeholder="Ask AI to make changes... e.g. &quot;Add a field for HOA management company&quot;"
                    className="flex-1 h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !refining) {
                        e.preventDefault();
                        handleRefine();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => handleRefine()}
                    disabled={refining || !refinementInput.trim()}
                  >
                    {refining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            {step === 1 && (
              <Button onClick={handleAnalyze} disabled={analyzing || !rawText.trim()}>
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Analyze with AI
                  </>
                )}
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => {
                  onSave(template, fields);
                  handleOpenChange(false);
                }}
                disabled={!template.trim() || fields.length === 0}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Save Template
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
