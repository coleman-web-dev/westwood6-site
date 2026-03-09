'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Printer, Loader2, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCheckPrintSettings,
  updateCheckPrintSettings,
} from '@/lib/actions/check-actions';
import {
  CHECK_WIDTH_IN,
  SECTION_HEIGHT_IN,
  CheckContent,
  StubContent,
  numberToWords,
  buildPrintHtml,
} from './check-print-preview';
import type { CheckPrintSettings, CheckPosition, CheckWithDetails } from '@/lib/types/check';

// ─── Dummy check for the live preview ────────────────────────────────

const PREVIEW_CHECK: CheckWithDetails = {
  id: 'preview',
  community_id: '',
  check_number: 1001,
  check_sequence_id: '',
  date: new Date().toISOString().split('T')[0],
  amount: 125000, // $1,250.00
  payee_vendor_id: null,
  payee_name: 'Sample Vendor Co.',
  memo: 'Monthly maintenance services',
  expense_account_id: '',
  bank_account_id: '',
  status: 'approved',
  created_by: null,
  printed_at: null,
  voided_at: null,
  voided_by: null,
  void_reason: null,
  journal_entry_id: null,
  bank_transaction_id: null,
  check_image_path: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  expense_account: { code: '6000', name: 'Maintenance Expense' },
  bank_account: { code: '1000', name: 'Operating Account' },
};

// ─── Component ──────────────────────────────────────────────────────

interface CheckPrintEditorProps {
  communityId: string;
}

export function CheckPrintEditor({ communityId }: CheckPrintEditorProps) {
  const [settings, setSettings] = useState<CheckPrintSettings>({
    check_position: 'top',
    offset_x: 0,
    offset_y: 0,
    payer_name: '',
    payer_address_line1: '',
    payer_address_line2: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    getCheckPrintSettings(communityId).then((data) => {
      setSettings(data);
      setLoading(false);
    });
  }, [communityId]);

  async function handleSave() {
    setSaving(true);
    const result = await updateCheckPrintSettings(communityId, settings);
    setSaving(false);

    if (result.success) {
      toast.success('Print settings saved.');
    } else {
      toast.error(result.error || 'Failed to save print settings.');
    }
  }

  function handlePrint() {
    const check = PREVIEW_CHECK;
    const formattedAmount = (check.amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    const amountInWords = numberToWords(check.amount);

    const sectionTopIn =
      settings.check_position === 'top' ? 0
      : settings.check_position === 'middle' ? SECTION_HEIGHT_IN
      : SECTION_HEIGHT_IN * 2;

    const printHtml = buildPrintHtml({
      check,
      formattedAmount,
      amountInWords,
      printSettings: settings,
      sectionTopIn,
      offsetX: settings.offset_x || 0,
      offsetY: settings.offset_y || 0,
      signatures: [],
      testMode: false,
    });

    const iframe = printFrameRef.current;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 500);
      }
    }
  }

  // Derived values for preview
  const check = PREVIEW_CHECK;
  const formattedAmount = (check.amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const amountInWords = numberToWords(check.amount);
  const offsetX = settings.offset_x || 0;
  const offsetY = settings.offset_y || 0;

  const sectionTopPercent =
    settings.check_position === 'top' ? 0
    : settings.check_position === 'middle' ? 33.33
    : 66.67;

  const stubPositions = settings.check_position === 'top'
    ? [1, 2]
    : settings.check_position === 'middle'
      ? [0, 2]
      : [0, 1];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Live Preview (top) ──────────────────────────────────────── */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <span className="text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Live Preview
            </span>
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Position: {settings.check_position}
              {(offsetX !== 0 || offsetY !== 0) && (
                <> | Offset: {offsetX > 0 ? '+' : ''}{offsetX}&quot; H, {offsetY > 0 ? '+' : ''}{offsetY}&quot; V</>
              )}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Test Page
          </Button>
        </div>

        {/* Scaled 8.5x11 page */}
        <div
          className="bg-white border border-gray-300 rounded-inner-card overflow-hidden mx-auto"
          style={{
            width: '100%',
            aspectRatio: `${CHECK_WIDTH_IN} / 11`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#000',
              fontSize: '10px',
            }}
          >
            {/* Section dividers */}
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '1px dashed #ccc' }} />
            <div style={{ position: 'absolute', top: '66.67%', left: 0, right: 0, borderTop: '1px dashed #ccc' }} />

            {/* Section labels */}
            {[0, 1, 2].map((section) => {
              const isCheckSection = (settings.check_position === 'top' && section === 0)
                || (settings.check_position === 'middle' && section === 1)
                || (settings.check_position === 'bottom' && section === 2);
              return (
                <div
                  key={section}
                  style={{
                    position: 'absolute',
                    top: `${(section * 33.33) + 0.5}%`,
                    right: '2%',
                    fontSize: '8px',
                    color: isCheckSection ? '#16a34a' : '#9ca3af',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {isCheckSection ? 'CHECK' : `STUB ${stubPositions.indexOf(section) + 1}`}
                </div>
              );
            })}

            {/* Check content */}
            <CheckContent
              check={check}
              formattedAmount={formattedAmount}
              amountInWords={amountInWords}
              printSettings={settings}
              signatures={[]}
              sectionTopPercent={sectionTopPercent}
              offsetXPercent={(offsetX / CHECK_WIDTH_IN) * 100}
              offsetYPercent={(offsetY / 11) * 100}
            />

            {/* Stub content */}
            {stubPositions.map((section, idx) => (
              <StubContent
                key={section}
                check={check}
                formattedAmount={formattedAmount}
                sectionTopPercent={section * 33.33}
                stubNumber={idx + 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Editor Controls (below) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Check Position */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Check Position
          </h3>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Which third of the page has the check?
          </p>
          <div className="flex items-center gap-2">
            {(['top', 'middle', 'bottom'] as CheckPosition[]).map((pos) => (
              <Button
                key={pos}
                size="sm"
                variant={settings.check_position === pos ? 'default' : 'outline'}
                onClick={() => setSettings((prev) => ({ ...prev, check_position: pos }))}
                className="capitalize flex-1"
              >
                {pos}
              </Button>
            ))}
          </div>
        </div>

        {/* Payer Information */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Payer Information
          </h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-meta">Name</Label>
              <Input
                value={settings.payer_name}
                onChange={(e) => setSettings((prev) => ({ ...prev, payer_name: e.target.value }))}
                placeholder="Community HOA Name"
                className="h-8 text-body"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-meta">Address Line 1</Label>
              <Input
                value={settings.payer_address_line1}
                onChange={(e) => setSettings((prev) => ({ ...prev, payer_address_line1: e.target.value }))}
                placeholder="123 Main Street"
                className="h-8 text-body"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-meta">Address Line 2</Label>
              <Input
                value={settings.payer_address_line2}
                onChange={(e) => setSettings((prev) => ({ ...prev, payer_address_line2: e.target.value }))}
                placeholder="City, State ZIP"
                className="h-8 text-body"
              />
            </div>
          </div>
        </div>

        {/* Fine-tune Offsets */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Fine-tune Alignment
          </h3>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Adjust if text doesn&apos;t align with your check stock fields.
          </p>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-meta">Horizontal offset</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    offset_x: Math.round((prev.offset_x - 0.05) * 100) / 100,
                  }))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.offset_x}
                  onChange={(e) => setSettings((prev) => ({
                    ...prev,
                    offset_x: parseFloat(e.target.value) || 0,
                  }))}
                  className="h-8 text-body text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    offset_x: Math.round((prev.offset_x + 0.05) * 100) / 100,
                  }))}
                >
                  +
                </Button>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">&quot;</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-meta">Vertical offset</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    offset_y: Math.round((prev.offset_y - 0.05) * 100) / 100,
                  }))}
                >
                  -
                </Button>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.offset_y}
                  onChange={(e) => setSettings((prev) => ({
                    ...prev,
                    offset_y: parseFloat(e.target.value) || 0,
                  }))}
                  className="h-8 text-body text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSettings((prev) => ({
                    ...prev,
                    offset_y: Math.round((prev.offset_y + 0.05) * 100) / 100,
                  }))}
                >
                  +
                </Button>
                <span className="text-meta text-text-muted-light dark:text-text-muted-dark shrink-0">&quot;</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Save Print Settings
        </Button>
      </div>

      {/* Hidden iframe for printing */}
      <iframe
        ref={printFrameRef}
        style={{ display: 'none' }}
        title="Check Print Frame"
      />
    </div>
  );
}
