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
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  Bot,
  User,
} from 'lucide-react';
import {
  ALL_ESTOPPEL_VARIABLES,
  fillEstoppelTemplateWithExamples,
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

const PHASE_OPTIONS: { value: EstoppelFieldPhase; label: string; color: string }[] = [
  { value: 'requester', label: 'Requester', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'system', label: 'System', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'board', label: 'Board', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
];

function generateId(): string {
  return crypto.randomUUID();
}

function getPhaseBadgeColor(phase: EstoppelFieldPhase): string {
  return PHASE_OPTIONS.find((p) => p.value === phase)?.color ?? '';
}

export function EstoppelWizardDialog({
  open,
  onOpenChange,
  onSave,
  existingTemplate,
  existingFields,
}: EstoppelWizardDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(existingTemplate ? 2 : 1);
  const [rawText, setRawText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  const [template, setTemplate] = useState(existingTemplate ?? '');
  const [fields, setFields] = useState<EstoppelField[]>(existingFields ?? []);
  const [aiSummary, setAiSummary] = useState('');

  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; message: string }[]>([]);
  const [refinementInput, setRefinementInput] = useState('');
  const [refining, setRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTemplate(existingTemplate ?? '');
      setFields(existingFields ?? []);
      setChatHistory([]);
      setEditingFieldId(null);
      setStep(existingTemplate ? 2 : 1);
    }
  }, [open, existingTemplate, existingFields]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
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
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, existingTemplate],
  );

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
        toast.error(data.error || 'Failed to extract text from PDF. Try pasting the text instead.');
        return;
      }

      if (!data.text) {
        toast.error(
          'No text found in this PDF. It may be a scanned image. Try pasting the text instead.',
        );
        return;
      }

      setRawText(data.text);
      toast.success(`Extracted text from ${data.pageCount} page${data.pageCount > 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('PDF extraction error:', err);
      toast.error('Failed to extract text from PDF. Try pasting the text instead.');
    } finally {
      setExtractingPdf(false);
    }
  }

  async function handleAnalyze() {
    if (!rawText.trim()) {
      toast.error('Please upload a PDF or paste the estoppel form text first.');
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
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-estoppel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ estoppel_text: rawText.trim() }),
        },
      );

      const data = await response.json();

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
      toast.success('Estoppel form analyzed successfully!');
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error(
        err instanceof Error ? err.message : 'AI analysis failed. Please try again.',
      );
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-estoppel`,
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
        throw new Error(data.error || 'Refinement failed');
      }

      if (data.template) setTemplate(data.template);
      if (data.fields) setFields(data.fields);
      if (data.summary) {
        setChatHistory((prev) => [...prev, { role: 'ai', message: data.summary }]);
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

  function addField() {
    const newField: EstoppelField = {
      id: generateId(),
      key: `custom_field_${fields.length + 1}`,
      label: 'New field',
      type: 'text',
      required: false,
      fill_phase: 'board',
    };
    setFields((prev) => [...prev, newField]);
    setEditingFieldId(newField.id);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  }

  function updateField(id: string, updates: Partial<EstoppelField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  }

  function insertVariable(key: string) {
    const textarea = templateRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = template;
    const insertion = `{{${key}}}`;
    setTemplate(text.substring(0, start) + insertion + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  }

  const requesterFieldCount = fields.filter((f) => f.fill_phase === 'requester').length;
  const systemFieldCount = fields.filter((f) => f.fill_phase === 'system').length;
  const boardFieldCount = fields.filter((f) => f.fill_phase === 'board').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-page-title">
            {step === 1 && 'Upload Estoppel Form'}
            {step === 2 && 'Review Template & Fields'}
            {step === 3 && 'Preview Certificate'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Upload your estoppel certificate PDF or paste the form text. AI will analyze it and identify all fields.'}
            {step === 2 && 'Review the extracted fields and their categories. You can edit, add, or remove fields.'}
            {step === 3 && 'Preview how the completed certificate will look with example data.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload/Paste */}
          {step === 1 && (
            <div className="space-y-4">
              <Tabs defaultValue="upload">
                <TabsList>
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload PDF
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

          {/* Step 2: AI Review & Edit */}
          {step === 2 && (
            <div className="space-y-4 h-full">
              {aiSummary && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-inner-card p-3">
                  <p className="text-body text-blue-800 dark:text-blue-200">
                    <Sparkles className="h-4 w-4 inline mr-1.5" />
                    {aiSummary}
                  </p>
                </div>
              )}

              <div className="flex gap-2 text-meta">
                <Badge variant="secondary" className={getPhaseBadgeColor('requester')}>
                  {requesterFieldCount} Requester
                </Badge>
                <Badge variant="secondary" className={getPhaseBadgeColor('system')}>
                  {systemFieldCount} System
                </Badge>
                <Badge variant="secondary" className={getPhaseBadgeColor('board')}>
                  {boardFieldCount} Board
                </Badge>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {/* Template */}
                  <div className="space-y-2">
                    <label className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                      Template
                    </label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ALL_ESTOPPEL_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-light-2 dark:bg-surface-dark-2 text-text-muted-light dark:text-text-muted-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors"
                          title={`Insert {{${v.key}}} - ${v.label}`}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      ref={templateRef}
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      className="min-h-[150px] font-mono text-xs"
                    />
                  </div>

                  {/* Fields */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                        Fields ({fields.length})
                      </label>
                      <Button variant="outline" size="sm" onClick={addField}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Field
                      </Button>
                    </div>

                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="border border-stroke-light dark:border-stroke-dark rounded-inner-card p-3"
                      >
                        {editingFieldId === field.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  Label
                                </label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  Key
                                </label>
                                <Input
                                  value={field.key}
                                  onChange={(e) => updateField(field.id, { key: e.target.value })}
                                  className="h-8 text-sm font-mono"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  Type
                                </label>
                                <Select
                                  value={field.type}
                                  onValueChange={(v) => updateField(field.id, { type: v as AgreementFieldType })}
                                >
                                  <SelectTrigger className="h-8 text-sm">
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
                              <div>
                                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  Phase
                                </label>
                                <Select
                                  value={field.fill_phase}
                                  onValueChange={(v) => updateField(field.id, { fill_phase: v as EstoppelFieldPhase })}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PHASE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1.5 text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                  />
                                  Required
                                </label>
                              </div>
                            </div>
                            {field.type === 'select' && (
                              <div>
                                <label className="text-[11px] text-text-muted-light dark:text-text-muted-dark">
                                  Options (comma separated)
                                </label>
                                <Input
                                  value={(field.options ?? []).join(', ')}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                    })
                                  }
                                  className="h-8 text-sm"
                                  placeholder="Option 1, Option 2, Option 3"
                                />
                              </div>
                            )}
                            <div className="flex justify-end">
                              <Button variant="ghost" size="sm" onClick={() => setEditingFieldId(null)}>
                                Done
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => setEditingFieldId(field.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-body text-text-primary-light dark:text-text-primary-dark">
                                  {field.label}
                                </span>
                                <Badge variant="secondary" className={`text-[10px] ${getPhaseBadgeColor(field.fill_phase)}`}>
                                  {field.fill_phase}
                                </Badge>
                                <span className="text-meta text-text-muted-light dark:text-text-muted-dark font-mono">
                                  {`{{${field.key}}}`}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-text-muted-light dark:text-text-muted-dark hover:text-red-500"
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat refinement */}
                  <div className="space-y-2 border-t border-stroke-light dark:border-stroke-dark pt-4">
                    <label className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                      AI Refinement
                    </label>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      Ask the AI to make changes to the template or fields.
                    </p>

                    {chatHistory.length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {chatHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex gap-2 text-sm ${
                              msg.role === 'user' ? 'justify-end' : ''
                            }`}
                          >
                            {msg.role === 'ai' && (
                              <Bot className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                            )}
                            <span
                              className={`${
                                msg.role === 'user'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-lg'
                                  : 'text-text-secondary-light dark:text-text-secondary-dark'
                              }`}
                            >
                              {msg.message}
                            </span>
                            {msg.role === 'user' && (
                              <User className="h-4 w-4 mt-0.5 text-text-muted-light dark:text-text-muted-dark shrink-0" />
                            )}
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        placeholder='e.g., "Add a field for HOA management company"'
                        className="flex-1"
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
                        onClick={handleRefine}
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
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <ScrollArea className="h-[500px]">
              <div className="pr-4">
                <div className="bg-white dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-6">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: fillEstoppelTemplateWithExamples(template)
                        .replace(/\n/g, '<br/>')
                        .replace(
                          /\{\{(\w+)\}\}/g,
                          '<span style="background: #fef3c7; padding: 1px 4px; border-radius: 3px;">{{$1}}</span>',
                        ),
                    }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Field Summary
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-inner-card p-3">
                      <p className="text-meta text-blue-600 dark:text-blue-400 font-semibold mb-1">
                        Requester Fields ({requesterFieldCount})
                      </p>
                      <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70">
                        Filled by title company / attorney on the public form
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 rounded-inner-card p-3">
                      <p className="text-meta text-green-600 dark:text-green-400 font-semibold mb-1">
                        System Fields ({systemFieldCount})
                      </p>
                      <p className="text-[11px] text-green-600/70 dark:text-green-400/70">
                        Auto-filled from HOA database
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950 rounded-inner-card p-3">
                      <p className="text-meta text-amber-600 dark:text-amber-400 font-semibold mb-1">
                        Board Fields ({boardFieldCount})
                      </p>
                      <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
                        Filled by board during review
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
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
              <Button onClick={() => setStep(3)} disabled={!template.trim() || fields.length === 0}>
                Preview
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={() => {
                  onSave(template, fields);
                  handleOpenChange(false);
                }}
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
