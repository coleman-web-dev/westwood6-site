'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import {
  Printer, Loader2, Move, Upload, Trash2, RotateCcw, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCheckPrintSettings,
  updateCheckPrintSettings,
} from '@/lib/actions/check-actions';
import {
  CHECK_WIDTH_IN,
  SECTION_HEIGHT_IN,
  DEFAULT_FIELD_POSITIONS,
  FIELD_LABELS,
  numberToWords,
  formatDate,
  buildPrintHtml,
} from './check-print-preview';
import type {
  CheckPrintSettings,
  CheckPosition,
  CheckWithDetails,
  CheckFieldId,
  CheckFieldLayout,
} from '@/lib/types/check';

// ─── Constants ──────────────────────────────────────────────────────

const GRID_SNAP = 0.05; // inches
const CHECK_SECTION_HEIGHT = SECTION_HEIGHT_IN; // ~3.667"

const ALL_FIELD_IDS: CheckFieldId[] = [
  'payerName', 'payerAddress1', 'payerAddress2',
  'checkNumber', 'date',
  'payTo', 'amountBox', 'amountWords',
  'memo', 'signatureLine',
];

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

// ─── Helper: snap to grid ────────────────────────────────────────────

function snap(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Field content renderer ──────────────────────────────────────────

function getFieldContent(
  fieldId: CheckFieldId,
  check: CheckWithDetails,
  formattedAmount: string,
  amountInWords: string,
  settings: CheckPrintSettings,
): { label?: string; value: string } {
  switch (fieldId) {
    case 'payerName':
      return { value: settings.payer_name || 'Payer Name' };
    case 'payerAddress1':
      return { value: settings.payer_address_line1 || '123 Main Street' };
    case 'payerAddress2':
      return { value: settings.payer_address_line2 || 'City, State ZIP' };
    case 'checkNumber':
      return { value: String(check.check_number) };
    case 'date':
      return { label: 'DATE', value: formatDate(check.date) };
    case 'payTo':
      return { label: 'PAY TO THE ORDER OF', value: check.payee_name };
    case 'amountBox':
      return { value: formattedAmount };
    case 'amountWords':
      return { value: `${amountInWords} DOLLARS` };
    case 'memo':
      return { label: 'MEMO', value: check.memo || '' };
    case 'signatureLine':
      return { value: 'AUTHORIZED SIGNATURE' };
    default:
      return { value: '' };
  }
}

// ─── Field style helpers ─────────────────────────────────────────────

function getFieldFontSize(fieldId: CheckFieldId): string {
  switch (fieldId) {
    case 'payerName': return '11px';
    case 'payerAddress1':
    case 'payerAddress2': return '9px';
    case 'checkNumber': return '12px';
    case 'date':
    case 'payTo': return '10px';
    case 'amountBox': return '11px';
    case 'amountWords':
    case 'memo': return '9px';
    case 'signatureLine': return '7px';
    default: return '10px';
  }
}

function getFieldFontWeight(fieldId: CheckFieldId): number {
  switch (fieldId) {
    case 'payerName':
    case 'checkNumber':
    case 'amountBox': return 700;
    case 'payTo': return 500;
    default: return 400;
  }
}

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
  const [fieldPositions, setFieldPositions] = useState<Record<CheckFieldId, CheckFieldLayout>>(
    { ...DEFAULT_FIELD_POSITIONS },
  );
  const [selectedField, setSelectedField] = useState<CheckFieldId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    fieldId: CheckFieldId;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // ── Load settings ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const data = await getCheckPrintSettings(communityId);
      setSettings(data);

      // Initialize field positions
      if (data.field_positions) {
        setFieldPositions(data.field_positions);
      } else {
        // Migrate from legacy global offsets
        const ox = data.offset_x || 0;
        const oy = data.offset_y || 0;
        const migrated = { ...DEFAULT_FIELD_POSITIONS };
        if (ox !== 0 || oy !== 0) {
          for (const key of ALL_FIELD_IDS) {
            migrated[key] = {
              ...migrated[key],
              top: roundTo2(migrated[key].top + oy),
              left: roundTo2(migrated[key].left + ox),
            };
          }
        }
        setFieldPositions(migrated);
      }

      // Load background image
      if (data.check_stock_image) {
        const supabase = createClient();
        const { data: urlData } = await supabase.storage
          .from('hoa-documents')
          .createSignedUrl(data.check_stock_image, 3600);
        setBgImageUrl(urlData?.signedUrl || null);
      }

      setLoading(false);
    }
    load();
  }, [communityId]);

  // ── Pixels-per-inch scale factor ───────────────────────────────────

  const getScale = useCallback((): number => {
    if (!canvasRef.current) return 100;
    return canvasRef.current.clientWidth / CHECK_WIDTH_IN;
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, fieldId: CheckFieldId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedField(fieldId);

    const pos = fieldPositions[fieldId];
    dragRef.current = {
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: pos.left,
      startTop: pos.top,
    };

    function handleMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const scale = getScale();
      const dx = (ev.clientX - dragRef.current.startX) / scale;
      const dy = (ev.clientY - dragRef.current.startY) / scale;

      const newLeft = snap(dragRef.current.startLeft + dx);
      const newTop = snap(dragRef.current.startTop + dy);

      // Clamp within check section
      const clampedLeft = Math.max(0, Math.min(CHECK_WIDTH_IN - 0.5, newLeft));
      const clampedTop = Math.max(0, Math.min(CHECK_SECTION_HEIGHT - 0.3, newTop));

      setFieldPositions((prev) => ({
        ...prev,
        [dragRef.current!.fieldId]: {
          ...prev[dragRef.current!.fieldId],
          left: roundTo2(clampedLeft),
          top: roundTo2(clampedTop),
        },
      }));
    }

    function handleMouseUp() {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [fieldPositions, getScale]);

  // Touch drag support
  const handleTouchStart = useCallback((e: React.TouchEvent, fieldId: CheckFieldId) => {
    e.stopPropagation();
    setSelectedField(fieldId);

    const touch = e.touches[0];
    const pos = fieldPositions[fieldId];
    dragRef.current = {
      fieldId,
      startX: touch.clientX,
      startY: touch.clientY,
      startLeft: pos.left,
      startTop: pos.top,
    };

    function handleTouchMove(ev: TouchEvent) {
      if (!dragRef.current) return;
      ev.preventDefault();
      const t = ev.touches[0];
      const scale = getScale();
      const dx = (t.clientX - dragRef.current.startX) / scale;
      const dy = (t.clientY - dragRef.current.startY) / scale;

      const newLeft = snap(dragRef.current.startLeft + dx);
      const newTop = snap(dragRef.current.startTop + dy);

      const clampedLeft = Math.max(0, Math.min(CHECK_WIDTH_IN - 0.5, newLeft));
      const clampedTop = Math.max(0, Math.min(CHECK_SECTION_HEIGHT - 0.3, newTop));

      setFieldPositions((prev) => ({
        ...prev,
        [dragRef.current!.fieldId]: {
          ...prev[dragRef.current!.fieldId],
          left: roundTo2(clampedLeft),
          top: roundTo2(clampedTop),
        },
      }));
    }

    function handleTouchEnd() {
      dragRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }, [fieldPositions, getScale]);

  // ── Save ───────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    const updatedSettings: CheckPrintSettings = {
      ...settings,
      field_positions: fieldPositions,
    };
    const result = await updateCheckPrintSettings(communityId, updatedSettings);
    setSaving(false);

    if (result.success) {
      setSettings(updatedSettings);
      toast.success('Print settings saved.');
    } else {
      toast.error(result.error || 'Failed to save print settings.');
    }
  }

  // ── Print ──────────────────────────────────────────────────────────

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
      printSettings: { ...settings, field_positions: fieldPositions },
      sectionTopIn,
      offsetX: 0,
      offsetY: 0,
      signatures: [],
      testMode: false,
      fieldPositions,
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

  // ── Background image upload ────────────────────────────────────────

  async function handleBgUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setUploadingBg(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${communityId}/check-stock/blank-check.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('hoa-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload image.');
      setUploadingBg(false);
      return;
    }

    // Save path to settings
    const updatedSettings: CheckPrintSettings = {
      ...settings,
      check_stock_image: filePath,
      field_positions: fieldPositions,
    };
    await updateCheckPrintSettings(communityId, updatedSettings);
    setSettings(updatedSettings);

    // Get signed URL for display
    const { data: urlData } = await supabase.storage
      .from('hoa-documents')
      .createSignedUrl(filePath, 3600);
    setBgImageUrl(urlData?.signedUrl || null);
    setUploadingBg(false);
    toast.success('Check stock image uploaded.');
  }

  async function handleRemoveBg() {
    const supabase = createClient();
    if (settings.check_stock_image) {
      await supabase.storage.from('hoa-documents').remove([settings.check_stock_image]);
    }
    const updatedSettings: CheckPrintSettings = {
      ...settings,
      check_stock_image: undefined,
      field_positions: fieldPositions,
    };
    await updateCheckPrintSettings(communityId, updatedSettings);
    setSettings(updatedSettings);
    setBgImageUrl(null);
    toast.success('Background image removed.');
  }

  // ── Reset layout ──────────────────────────────────────────────────

  function handleResetLayout() {
    setFieldPositions({ ...DEFAULT_FIELD_POSITIONS });
    toast.success('Layout reset to defaults.');
  }

  // ── Field position update (manual input) ───────────────────────────

  function updateFieldPos(fieldId: CheckFieldId, key: 'left' | 'top', value: number) {
    setFieldPositions((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [key]: roundTo2(snap(value)),
      },
    }));
  }

  function toggleFieldLine(fieldId: CheckFieldId) {
    setFieldPositions((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        showLine: !prev[fieldId].showLine,
      },
    }));
  }

  // ── Derived values ─────────────────────────────────────────────────

  const check = PREVIEW_CHECK;
  const formattedAmount = (check.amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const amountInWords = numberToWords(check.amount);

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
            <span className="text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
              Drag fields to position them on your check
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetLayout}
              className="text-meta"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Test
            </Button>
          </div>
        </div>

        {/* ─── Drag Canvas (check section only) ───────────────────── */}
        <div
          ref={canvasRef}
          className="relative bg-white border border-gray-300 rounded-inner-card overflow-hidden mx-auto select-none"
          style={{
            width: '100%',
            aspectRatio: `${CHECK_WIDTH_IN} / ${CHECK_SECTION_HEIGHT}`,
            cursor: 'default',
          }}
          onClick={() => setSelectedField(null)}
        >
          {/* Background image */}
          {bgImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bgImageUrl}
              alt="Check stock background"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              style={{ opacity: 0.35 }}
            />
          )}

          {/* Grid dots */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.15 }}
          >
            <defs>
              <pattern
                id="grid-dots"
                width={`${(GRID_SNAP / CHECK_WIDTH_IN) * 100}%`}
                height={`${(GRID_SNAP / CHECK_SECTION_HEIGHT) * 100}%`}
                patternUnits="objectBoundingBox"
              >
                <circle cx="50%" cy="50%" r="0.5" fill="#666" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-dots)" />
          </svg>

          {/* Draggable fields */}
          {ALL_FIELD_IDS.map((fieldId) => {
            const pos = fieldPositions[fieldId];
            const content = getFieldContent(fieldId, check, formattedAmount, amountInWords, settings);
            const isSelected = selectedField === fieldId;
            const leftPct = (pos.left / CHECK_WIDTH_IN) * 100;
            const topPct = (pos.top / CHECK_SECTION_HEIGHT) * 100;

            return (
              <div
                key={fieldId}
                className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-1 z-20'
                    : 'hover:ring-1 hover:ring-blue-300 z-10'
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: getFieldFontSize(fieldId),
                  fontWeight: getFieldFontWeight(fieldId),
                  color: '#000',
                  whiteSpace: 'nowrap',
                  padding: fieldId === 'amountBox' ? '1px 4px' : '1px 2px',
                  border: fieldId === 'amountBox' ? '1px solid #333' : 'none',
                  borderBottom: (pos.showLine && fieldId !== 'amountBox' && fieldId !== 'signatureLine')
                    ? '1px solid #999' : 'none',
                  borderTop: (pos.showLine && fieldId === 'signatureLine')
                    ? '1px solid #999' : 'none',
                  borderRadius: '2px',
                  background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}
                onMouseDown={(e) => handleMouseDown(e, fieldId)}
                onTouchStart={(e) => handleTouchStart(e, fieldId)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedField(fieldId);
                }}
              >
                {content.label && (
                  <span style={{ color: '#666', fontSize: '7px', marginRight: '4px' }}>
                    {content.label}
                  </span>
                )}
                {content.value}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Field Properties (selected field) ──────────────────────── */}
      {selectedField && (
        <div className="rounded-panel border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-card-padding">
          <div className="flex items-center justify-between mb-3">
            <span className="text-section-title text-text-primary-light dark:text-text-primary-dark">
              {FIELD_LABELS[selectedField]}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setSelectedField(null)} className="text-meta">
              Done
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-meta shrink-0">Show Line</Label>
              <Switch
                checked={fieldPositions[selectedField].showLine}
                onCheckedChange={() => toggleFieldLine(selectedField)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-meta shrink-0">X</Label>
              <Input
                type="number"
                step={GRID_SNAP}
                min={0}
                max={CHECK_WIDTH_IN}
                value={fieldPositions[selectedField].left}
                onChange={(e) => updateFieldPos(selectedField, 'left', parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-meta text-center"
              />
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">&quot;</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-meta shrink-0">Y</Label>
              <Input
                type="number"
                step={GRID_SNAP}
                min={0}
                max={CHECK_SECTION_HEIGHT}
                value={fieldPositions[selectedField].top}
                onChange={(e) => updateFieldPos(selectedField, 'top', parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-meta text-center"
              />
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">&quot;</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Controls ─────────────────────────────────────────────────── */}
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

        {/* Background Image */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Check Stock Image
          </h3>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Upload a scan of your blank check as a positioning reference.
          </p>

          {bgImageUrl ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bgImageUrl}
                  alt="Check stock"
                  className="w-full h-auto object-contain max-h-20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingBg}
                >
                  {uploadingBg ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveBg}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-stroke-light dark:border-stroke-dark rounded-lg p-4 cursor-pointer hover:border-primary-400 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleBgUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingBg ? (
                <Loader2 className="h-5 w-5 animate-spin text-text-muted-light dark:text-text-muted-dark" />
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-text-muted-light dark:text-text-muted-dark mb-1.5" />
                  <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark text-center">
                    Drop image or click to upload
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Save Print Settings
        </Button>
      </div>

      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleBgUpload(file);
          e.target.value = '';
        }}
      />
      <iframe
        ref={printFrameRef}
        style={{ display: 'none' }}
        title="Check Print Frame"
      />
    </div>
  );
}
