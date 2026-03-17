'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { toast } from 'sonner';
import { Loader2, Send, Save, X, RefreshCw } from 'lucide-react';
import type { EstoppelRequest, EstoppelSettings, EstoppelField } from '@/lib/types/database';
import { partitionEstoppelFieldsByPhase, fillEstoppelTemplateHtml } from '@/lib/utils/estoppel-template';
import { fetchEstoppelSystemFields } from '@/lib/actions/estoppel-actions';

interface EstoppelReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: EstoppelRequest;
  communityId: string;
}

export function EstoppelReviewDialog({
  open,
  onOpenChange,
  request,
  communityId,
}: EstoppelReviewDialogProps) {
  const { community, member } = useCommunity();
  const estoppelSettings = community?.theme?.estoppel_settings as EstoppelSettings | undefined;
  const templateFields = estoppelSettings?.fields ?? [];

  const { boardFields: boardFieldDefs } = partitionEstoppelFieldsByPhase(templateFields);

  const [boardAnswers, setBoardAnswers] = useState<Record<string, string>>(
    (request.board_fields as Record<string, string>) ?? {},
  );
  const [signatureName, setSignatureName] = useState(request.signature_name ?? '');
  const [signatureTitle, setSignatureTitle] = useState(request.completed_by_title ?? '');
  const [eSignConsent, setESignConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // System fields: loaded on-demand from the ledger
  const existingSystemFields = (request.system_fields as Record<string, string>) ?? {};
  const hasExistingFields = Object.keys(existingSystemFields).length > 0;
  const [systemFields, setSystemFields] = useState<Record<string, string>>(existingSystemFields);
  const [systemFieldsLoading, setSystemFieldsLoading] = useState(!hasExistingFields);

  const loadSystemFields = useCallback(async () => {
    setSystemFieldsLoading(true);
    try {
      const fields = await fetchEstoppelSystemFields(communityId, request.unit_id);
      setSystemFields(fields);
    } catch (err) {
      console.error('Failed to fetch system fields:', err);
      toast.error('Failed to load financial data.');
    } finally {
      setSystemFieldsLoading(false);
    }
  }, [communityId, request.unit_id]);

  useEffect(() => {
    if (open && !hasExistingFields) {
      loadSystemFields();
    }
  }, [open, hasExistingFields, loadSystemFields]);

  function updateBoardAnswer(key: string, value: string) {
    setBoardAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function renderFieldInput(field: EstoppelField, value: string, onChange: (v: string) => void) {
    switch (field.type) {
      case 'yes_no':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={value === 'Yes'}
              onCheckedChange={(checked) => onChange(checked ? 'Yes' : 'No')}
            />
            <span className="text-body text-text-primary-light dark:text-text-primary-dark">
              {value || 'No'}
            </span>
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-xs"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="max-w-xs"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('estoppel_requests')
      .update({
        board_fields: boardAnswers,
        system_fields: systemFields,
        status: 'in_review',
        completed_by_name: signatureName || null,
        completed_by_title: signatureTitle || null,
      })
      .eq('id', request.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to save draft.');
    } else {
      toast.success('Draft saved.');
      onOpenChange(false);
    }
  }

  async function handleApproveAndSend() {
    if (!signatureName.trim()) {
      toast.error('Please enter your name for the electronic signature.');
      return;
    }
    if (!signatureTitle.trim()) {
      toast.error('Please enter your title.');
      return;
    }
    if (!eSignConsent) {
      toast.error('Please accept the electronic signature consent.');
      return;
    }

    // Check required board fields
    for (const field of boardFieldDefs) {
      if (field.required && !boardAnswers[field.key]?.trim()) {
        toast.error(`Please fill in: ${field.label}`);
        return;
      }
    }

    setSending(true);
    try {
      const response = await fetch('/api/estoppel/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          communityId,
          boardFields: boardAnswers,
          signatureName: signatureName.trim(),
          signatureTitle: signatureTitle.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete estoppel request');
      }

      toast.success('Estoppel certificate sent successfully!');
      onOpenChange(false);
    } catch (err) {
      console.error('Complete estoppel error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to send estoppel certificate.');
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    const supabase = createClient();
    const { error } = await supabase
      .from('estoppel_requests')
      .update({ status: 'cancelled' })
      .eq('id', request.id);

    if (error) {
      toast.error('Failed to cancel request.');
    } else {
      toast.success('Request cancelled.');
      onOpenChange(false);
    }
  }

  const requesterFields = request.requester_fields as Record<string, string>;
  const boardFieldKeys = new Set(boardFieldDefs.map((f) => f.key));

  // Merge signature fields into board answers for template preview
  const boardWithSignature = {
    ...boardAnswers,
    completed_by_name: signatureName,
    completed_by_title: signatureTitle,
    completion_date: new Date().toLocaleDateString(),
  };

  const filledHtml = estoppelSettings?.template
    ? fillEstoppelTemplateHtml(
        estoppelSettings.template,
        requesterFields,
        systemFields,
        boardWithSignature,
        boardFieldKeys,
      )
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-page-title">
            Review Estoppel Request
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Requester Info (read-only) */}
            <div>
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
                Requester Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-body">
                {Object.entries(requesterFields).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-text-muted-light dark:text-text-muted-dark capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>{' '}
                    <span className="text-text-primary-light dark:text-text-primary-dark">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System-filled Info (loaded on-demand from ledger) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
                  Financial Status
                </h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
                  From Ledger
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={loadSystemFields}
                  disabled={systemFieldsLoading}
                >
                  {systemFieldsLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
              {systemFieldsLoading ? (
                <div className="flex items-center gap-2 py-4 text-body text-text-muted-light dark:text-text-muted-dark">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading financial data from ledger...
                </div>
              ) : Object.keys(systemFields).length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-body">
                  {Object.entries(systemFields).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-text-muted-light dark:text-text-muted-dark capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>{' '}
                      <span className="text-text-primary-light dark:text-text-primary-dark">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-text-muted-light dark:text-text-muted-dark italic">
                  Unit not found in database. Please fill in financial details manually via board fields below.
                </p>
              )}
            </div>

            {/* Board Fields (editable) */}
            <div>
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
                Board Review Fields
                <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-[10px]">
                  Your Input
                </Badge>
              </h3>
              <div className="space-y-3">
                {boardFieldDefs.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                    {renderFieldInput(
                      field,
                      boardAnswers[field.key] ?? '',
                      (v) => updateBoardAnswer(field.key, v),
                    )}
                  </div>
                ))}
                {boardFieldDefs.length === 0 && (
                  <p className="text-body text-text-muted-light dark:text-text-muted-dark italic">
                    No board fields configured in the template.
                  </p>
                )}
              </div>
            </div>

            {/* E-Signature */}
            <div className="border-t border-stroke-light dark:border-stroke-dark pt-4">
              <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-3">
                Electronic Signature
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={signatureTitle}
                      onChange={(e) => setSignatureTitle(e.target.value)}
                      placeholder="e.g., President, Board Member"
                    />
                  </div>
                </div>

                {signatureName && (
                  <div className="bg-surface-light-2 dark:bg-surface-dark-2 rounded-inner-card p-3 text-center">
                    <p className="text-[11px] text-text-muted-light dark:text-text-muted-dark mb-1">
                      Signature Preview
                    </p>
                    <p className="text-lg italic text-text-primary-light dark:text-text-primary-dark" style={{ fontFamily: 'Georgia, serif' }}>
                      {signatureName}
                    </p>
                    <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {signatureTitle}
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eSignConsent}
                    onChange={(e) => setESignConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                    I consent to electronically sign this estoppel certificate. I understand that my
                    electronic signature has the same legal effect as a handwritten signature under
                    the ESIGN Act and UETA.
                  </span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {estoppelSettings?.template && (
              <div className="border-t border-stroke-light dark:border-stroke-dark pt-4">
                <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-2">
                  Certificate Preview
                </h3>
                <div className="bg-white dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-inner-card p-4">
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-xs"
                    dangerouslySetInnerHTML={{ __html: filledHtml.replace(/\n/g, '<br/>') }}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {request.status !== 'completed' && request.status !== 'cancelled' && (
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-red-500">
                <X className="h-4 w-4 mr-1" />
                Cancel Request
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {request.status !== 'completed' && request.status !== 'cancelled' && (
              <>
                <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save Draft
                </Button>
                <Button onClick={handleApproveAndSend} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Approve & Send
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
