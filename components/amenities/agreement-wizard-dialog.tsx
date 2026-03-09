'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Switch } from '@/components/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Send,
  Bot,
  User,
} from 'lucide-react';
import {
  SYSTEM_VARIABLES,
  fillTemplateWithExamples,
} from '@/lib/utils/agreement-template';
import type { AgreementField, AgreementFieldType } from '@/lib/types/database';

interface AgreementWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: string, fields: AgreementField[]) => void;
  existingTemplate?: string | null;
  existingFields?: AgreementField[];
}

const FIELD_TYPE_OPTIONS: { value: AgreementFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
];

const FIELD_TYPE_BADGE: Record<AgreementFieldType, string> = {
  text: 'Text',
  number: 'Number',
  yes_no: 'Yes/No',
  select: 'Dropdown',
  date: 'Date',
};

function generateId(): string {
  return crypto.randomUUID();
}

export function AgreementWizardDialog({
  open,
  onOpenChange,
  onSave,
  existingTemplate,
  existingFields,
}: AgreementWizardDialogProps) {
  // Wizard step: 1=upload/paste, 2=AI review/edit, 3=preview/confirm
  const [step, setStep] = useState<1 | 2 | 3>(existingTemplate ? 2 : 1);
  const [rawText, setRawText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  // AI results (editable in step 2)
  const [template, setTemplate] = useState(existingTemplate ?? '');
  const [fields, setFields] = useState<AgreementField[]>(existingFields ?? []);
  const [aiSummary, setAiSummary] = useState('');

  // Chat refinement
  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; message: string }[]>([]);
  const [refinementInput, setRefinementInput] = useState('');
  const [refining, setRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Editing a field
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Template textarea ref for variable insertion
  const templateRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset on close
        setStep(existingTemplate ? 2 : 1);
        setRawText('');
        setAnalyzing(false);
        setAiSummary('');
        setChatHistory([]);
        setRefinementInput('');
        setRefining(false);
        if (!existingTemplate) {
          setTemplate('');
          setFields([]);
        }
      } else {
        setTemplate(existingTemplate ?? '');
        setFields(existingFields ?? []);
        setChatHistory([]);
        setStep(existingTemplate ? 2 : 1);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, existingTemplate, existingFields],
  );

  // PDF text extraction
  async function handlePdfUpload(file: File) {
    setExtractingPdf(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');

      // Use local worker from public/ (excluded from middleware via matcher config)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items as Array<{ str?: string }>)
          .map((item) => item.str ?? '')
          .join(' ');
        fullText += pageText + '\n\n';
      }

      const trimmed = fullText.trim();

      if (!trimmed) {
        toast.error(
          'No text found in this PDF. It may be a scanned image. Try pasting the text instead.',
        );
        return;
      }

      setRawText(trimmed);
      toast.success(`Extracted text from ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('PDF extraction error:', err);
      const message =
        err instanceof Error && err.message.includes('password')
          ? 'This PDF is password-protected. Please remove the password and try again, or paste the text instead.'
          : 'Failed to extract text from PDF. Try pasting the text instead.';
      toast.error(message);
    } finally {
      setExtractingPdf(false);
    }
  }

  // AI analysis
  async function handleAnalyze() {
    if (!rawText.trim()) {
      toast.error('Please upload a PDF or paste the agreement text first.');
      return;
    }

    setAnalyzing(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('You must be logged in to use AI analysis.');
        setAnalyzing(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-agreement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ agreement_text: rawText.trim() }),
        },
      );

      const data = await response.json();
      console.log('Edge function response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || `Edge function returned ${response.status}`);
      }

      if (!data.template) {
        throw new Error('AI returned an invalid response');
      }

      setTemplate(data.template);
      setFields(data.fields ?? []);
      setAiSummary(data.summary ?? '');
      setStep(2);
      toast.success('Agreement analyzed successfully!');
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error(
        err instanceof Error ? err.message : 'AI analysis failed. Please try again.',
      );
    } finally {
      setAnalyzing(false);
    }
  }

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // AI refinement (conversational follow-up)
  async function handleRefine() {
    const instruction = refinementInput.trim();
    if (!instruction) return;

    setRefining(true);
    setChatHistory((prev) => [...prev, { role: 'user', message: instruction }]);
    setRefinementInput('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('You must be logged in.');
        setRefining(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-agreement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            refinement: {
              current_template: template,
              current_fields: fields,
              instruction,
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Refinement failed (${response.status})`);
      }

      if (!data.template) {
        throw new Error('AI returned an invalid response');
      }

      setTemplate(data.template);
      setFields(data.fields ?? []);
      setChatHistory((prev) => [...prev, { role: 'ai', message: data.summary ?? 'Changes applied.' }]);
    } catch (err) {
      console.error('Refinement error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Refinement failed.';
      setChatHistory((prev) => [...prev, { role: 'ai', message: `Error: ${errorMsg}` }]);
      toast.error(errorMsg);
    } finally {
      setRefining(false);
    }
  }

  // Field management
  function addField() {
    const newField: AgreementField = {
      id: generateId(),
      key: '',
      label: '',
      type: 'text',
      required: true,
    };
    setFields((prev) => [...prev, newField]);
    setEditingFieldId(newField.id);
  }

  function updateField(id: string, updates: Partial<AgreementField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  }

  // Auto-generate key from label
  function labelToKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  // Insert variable into template at cursor position
  function insertVariable(key: string) {
    const textarea = templateRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const insertion = `{{${key}}}`;
    const newText = template.substring(0, start) + insertion + template.substring(end);
    setTemplate(newText);
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
      textarea.focus();
    });
  }

  // Preview text
  const previewText = template
    ? fillTemplateWithExamples(
        template,
        Object.fromEntries(
          fields.map((f) => [
            f.key,
            f.type === 'yes_no'
              ? 'Yes'
              : f.type === 'select' && f.options?.length
                ? f.options[0]
                : f.placeholder || `[${f.label}]`,
          ]),
        ),
      )
    : '';

  function handleSave() {
    if (!template.trim()) {
      toast.error('Agreement template cannot be empty.');
      return;
    }
    // Validate fields have keys
    for (const f of fields) {
      if (!f.key.trim()) {
        toast.error(`Question "${f.label || 'Untitled'}" needs a variable key.`);
        return;
      }
      if (!f.label.trim()) {
        toast.error('All questions need a label.');
        return;
      }
    }
    onSave(template, fields);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary-500" />
            {step === 1
              ? 'Set Up Rental Agreement'
              : step === 2
                ? 'Review Agreement Setup'
                : 'Preview Agreement'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Upload your rental agreement PDF or paste the text. AI will analyze it and set up the form automatically.'
              : step === 2
                ? 'Review and edit the questions and template that AI generated. Make any adjustments before saving.'
                : 'Preview how the agreement will look with example data filled in.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-meta font-medium transition-colors ${
                  step === s
                    ? 'bg-secondary-500 text-white'
                    : step > s
                      ? 'bg-secondary-200 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300'
                      : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark'
                }`}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-0.5 ${
                    step > s
                      ? 'bg-secondary-300 dark:bg-secondary-700'
                      : 'bg-stroke-light dark:bg-stroke-dark'
                  }`}
                />
              )}
            </div>
          ))}
          <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-2">
            {step === 1 ? 'Upload' : step === 2 ? 'Configure' : 'Preview'}
          </span>
        </div>

        {/* ── STEP 1: Upload / Paste ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Upload PDF
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Paste Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-3 pt-2">
                <div className="border-2 border-dashed border-stroke-light dark:border-stroke-dark rounded-panel p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-text-muted-light dark:text-text-muted-dark mb-2" />
                  <p className="text-body text-text-secondary-light dark:text-text-secondary-dark mb-3">
                    Upload your rental agreement PDF
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    id="pdf-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePdfUpload(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    disabled={extractingPdf}
                  >
                    {extractingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Extracting text...
                      </>
                    ) : (
                      'Choose PDF File'
                    )}
                  </Button>
                </div>
                {rawText && (
                  <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-1">
                      Extracted text preview:
                    </p>
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark line-clamp-4 whitespace-pre-line">
                      {rawText.substring(0, 500)}...
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-3 pt-2">
                <Textarea
                  placeholder="Paste your rental agreement text here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={12}
                  className="resize-none text-body"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── STEP 2: AI Review / Edit ── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            {/* AI Chat / Refinement */}
            <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark overflow-hidden">
              {/* Chat messages */}
              <div className="max-h-[160px] overflow-y-auto p-3 space-y-2">
                {/* Initial AI summary */}
                {aiSummary && (
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 text-secondary-500 shrink-0 mt-0.5" />
                    <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                      {aiSummary}
                    </p>
                  </div>
                )}
                {/* Conversation history */}
                {chatHistory.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {msg.role === 'user' ? (
                      <User className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                    ) : (
                      <Bot className="h-4 w-4 text-secondary-500 shrink-0 mt-0.5" />
                    )}
                    <p className={`text-body ${
                      msg.role === 'user'
                        ? 'text-text-primary-light dark:text-text-primary-dark'
                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                ))}
                {refining && (
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-secondary-500 shrink-0" />
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">Thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Refinement input */}
              <div className="flex items-center gap-2 border-t border-stroke-light dark:border-stroke-dark px-3 py-2">
                <Input
                  value={refinementInput}
                  onChange={(e) => setRefinementInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !refining) { e.preventDefault(); handleRefine(); } }}
                  placeholder="Tell the AI what to change..."
                  className="text-body flex-1"
                  disabled={refining}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefine}
                  disabled={refining || !refinementInput.trim()}
                  className="shrink-0"
                >
                  {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Custom Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
                  Custom Questions
                </h3>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Question
                </Button>
              </div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                These questions will be asked when a member makes a reservation. System fields
                (name, dates, amounts) are filled automatically.
              </p>

              {fields.length === 0 ? (
                <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-4 text-center">
                  <p className="text-body text-text-muted-light dark:text-text-muted-dark">
                    No custom questions. The agreement uses only system variables.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="rounded-inner-card border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-3"
                    >
                      {editingFieldId === field.id ? (
                        /* Edit mode */
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                                Question
                              </label>
                              <Input
                                value={field.label}
                                onChange={(e) => {
                                  const label = e.target.value;
                                  const updates: Partial<AgreementField> = { label };
                                  if (!field.key || field.key === labelToKey(field.label)) {
                                    updates.key = labelToKey(label);
                                  }
                                  updateField(field.id, updates);
                                }}
                                placeholder="e.g. Will alcohol be served?"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                                Type
                              </label>
                              <Select
                                value={field.type}
                                onValueChange={(v) =>
                                  updateField(field.id, { type: v as AgreementFieldType })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                                Variable key
                              </label>
                              <div className="flex items-center gap-1">
                                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">{'{{'}</span>
                                <Input
                                  value={field.key}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                                    })
                                  }
                                  placeholder="variable_name"
                                  className="font-mono text-body"
                                />
                                <span className="text-meta text-text-muted-light dark:text-text-muted-dark">{'}}'}</span>
                              </div>
                            </div>
                            <div className="flex items-end gap-3 pb-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(v) =>
                                    updateField(field.id, { required: v })
                                  }
                                />
                                <span className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                                  Required
                                </span>
                              </label>
                            </div>
                          </div>
                          {field.type === 'select' && (
                            <div className="space-y-1">
                              <label className="text-meta text-text-muted-light dark:text-text-muted-dark">
                                Options (comma-separated)
                              </label>
                              <Input
                                value={field.options?.join(', ') ?? ''}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    options: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(field.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setEditingFieldId(null)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setEditingFieldId(field.id)}
                        >
                          <GripVertical className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                                {field.label || 'Untitled question'}
                              </span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {FIELD_TYPE_BADGE[field.type]}
                              </Badge>
                              {field.required && (
                                <span className="text-red-500 text-meta">*</span>
                              )}
                            </div>
                            <span className="text-meta text-text-muted-light dark:text-text-muted-dark font-mono">
                              {`{{${field.key || '...'}}}`}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeField(field.id);
                            }}
                            className="shrink-0 text-text-muted-light dark:text-text-muted-dark hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Variables Info */}
            <div className="space-y-1.5">
              <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
                System Variables (auto-filled)
              </h3>
              <div className="flex flex-wrap gap-1">
                {SYSTEM_VARIABLES.map((v) => (
                  <span
                    key={v.key}
                    className="px-2 py-0.5 text-[11px] rounded border border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-950/30 text-secondary-700 dark:text-secondary-300 font-mono"
                  >
                    {`{{${v.key}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Agreement Template */}
            <div className="space-y-2">
              <h3 className="text-label text-text-primary-light dark:text-text-primary-dark">
                Agreement Template
              </h3>

              {/* Variable insertion toolbar */}
              <div className="space-y-1">
                <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                  Click a variable to insert it at the cursor:
                </p>
                <div className="flex flex-wrap gap-1">
                  {SYSTEM_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-1.5 py-0.5 text-[11px] rounded border border-stroke-light dark:border-stroke-dark
                        hover:bg-secondary-400/10 hover:border-secondary-400/50 transition-colors font-mono"
                    >
                      {v.label}
                    </button>
                  ))}
                  {fields.map((f) =>
                    f.key ? (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => insertVariable(f.key)}
                        className="px-1.5 py-0.5 text-[11px] rounded border border-mint/30
                          hover:bg-mint/10 hover:border-mint/50 transition-colors font-mono text-mint"
                      >
                        {f.label || f.key}
                      </button>
                    ) : null,
                  )}
                </div>
              </div>

              <Textarea
                ref={templateRef}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={12}
                className="resize-none font-mono text-[13px] leading-relaxed"
                placeholder="Agreement template text with {{placeholders}}..."
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
              <AlertCircle className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark shrink-0 mt-0.5" />
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                This preview shows the agreement with example values filled in.
                Actual values will come from the member's reservation details and form answers.
              </p>
            </div>

            <ScrollArea className="h-[350px] rounded-inner-card border border-stroke-light dark:border-stroke-dark p-4">
              <div className="whitespace-pre-line text-body text-text-primary-light dark:text-text-primary-dark leading-relaxed">
                {previewText}
              </div>
            </ScrollArea>

            {fields.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                  Questions that will be asked:
                </h4>
                <ul className="space-y-1">
                  {fields.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 text-body text-text-secondary-light dark:text-text-secondary-dark"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-400 shrink-0" />
                      {f.label}
                      {f.required && <span className="text-red-500 text-meta">*</span>}
                      <Badge variant="outline" className="text-[10px]">
                        {FIELD_TYPE_BADGE[f.type]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAnalyze} disabled={!rawText.trim() || analyzing}>
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!template.trim()}>
                Preview
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Edit
              </Button>
              <Button onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Save Agreement
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
