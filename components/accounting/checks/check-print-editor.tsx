'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Switch } from '@/components/shared/ui/switch';
import {
  Printer, Loader2, Move, Upload, Trash2, RotateCcw, Image as ImageIcon,
  Eye, EyeOff, Minus, Plus, Info,
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
const PPI = 96; // CSS pixels per inch (standard)
const NATIVE_WIDTH = CHECK_WIDTH_IN * PPI; // 816px (8.5" at 96 DPI)
const NATIVE_HEIGHT = Math.round(CHECK_SECTION_HEIGHT * PPI); // ~352px

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

// ─── Helpers ────────────────────────────────────────────────────────

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
  const [bgIsPdf, setBgIsPdf] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [containerWidth, setContainerWidth] = useState(NATIVE_WIDTH);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    fieldId: CheckFieldId;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Canvas scale: ratio between container display size and native canvas size
  const canvasScale = containerWidth / NATIVE_WIDTH;

  // ── ResizeObserver for container width ───────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Load settings ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const data = await getCheckPrintSettings(communityId);
      setSettings(data);

      // Initialize field positions with defaults merged in
      if (data.field_positions) {
        const merged = {} as Record<CheckFieldId, CheckFieldLayout>;
        for (const key of ALL_FIELD_IDS) {
          merged[key] = {
            ...DEFAULT_FIELD_POSITIONS[key],
            ...(data.field_positions[key] || {}),
          };
        }
        setFieldPositions(merged);
      } else {
        // Migrate from legacy global offsets
        const ox = data.offset_x || 0;
        const oy = data.offset_y || 0;
        const migrated = {} as Record<CheckFieldId, CheckFieldLayout>;
        for (const key of ALL_FIELD_IDS) {
          migrated[key] = {
            ...DEFAULT_FIELD_POSITIONS[key],
            top: roundTo2(DEFAULT_FIELD_POSITIONS[key].top + oy),
            left: roundTo2(DEFAULT_FIELD_POSITIONS[key].left + ox),
          };
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
        setBgIsPdf(data.check_stock_image.toLowerCase().endsWith('.pdf'));
      }

      setLoading(false);
    }
    load();
  }, [communityId]);

  // ── Pixels-per-inch scale factor for mouse tracking ─────────────────

  const getScale = useCallback((): number => {
    return containerWidth / CHECK_WIDTH_IN;
  }, [containerWidth]);

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
      offsetX: settings.offset_x || 0,
      offsetY: settings.offset_y || 0,
      signatures: [],
      testMode: false,
      fieldPositions,
    });

    // Open in a new window so user can see the output and adjust print settings
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 600);
    }
  }

  // ── Background image upload ────────────────────────────────────────

  async function handleBgUpload(file: File) {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      toast.error('Please upload a PNG, JPG, or PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB.');
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
    setBgIsPdf(ext.toLowerCase() === 'pdf');
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
    setBgIsPdf(false);
    toast.success('Background image removed.');
  }

  // ── Reset layout ──────────────────────────────────────────────────

  function handleResetLayout() {
    setFieldPositions({ ...DEFAULT_FIELD_POSITIONS });
    toast.success('Layout reset to defaults.');
  }

  // ── Field property updates ─────────────────────────────────────────

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

  function updateFieldFontSize(fieldId: CheckFieldId, delta: number) {
    setFieldPositions((prev) => {
      const currentSize = prev[fieldId].fontSize ?? DEFAULT_FIELD_POSITIONS[fieldId].fontSize ?? 10;
      return {
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          fontSize: Math.min(24, Math.max(6, currentSize + delta)),
        },
      };
    });
  }

  function toggleFieldVisible(fieldId: CheckFieldId) {
    setFieldPositions((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        visible: prev[fieldId].visible === false ? true : false,
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

        {/* Print instructions hint */}
        <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span className="text-meta text-amber-800 dark:text-amber-300">
            When printing, set Margins to &quot;None&quot; and Scale to &quot;100%&quot; in the print dialog for accurate alignment.
          </span>
        </div>

        {/* ─── Drag Canvas (check section only, transform-scaled) ── */}
        <div
          ref={containerRef}
          className="relative bg-white border border-gray-300 rounded-inner-card overflow-hidden mx-auto select-none"
          style={{
            width: '100%',
            aspectRatio: `${CHECK_WIDTH_IN} / ${CHECK_SECTION_HEIGHT}`,
            cursor: 'default',
          }}
          onClick={() => setSelectedField(null)}
        >
          {/* Inner canvas at native resolution, CSS-scaled to fit */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${NATIVE_WIDTH}px`,
              height: `${NATIVE_HEIGHT}px`,
              transform: `scale(${canvasScale})`,
              transformOrigin: 'top left',
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#000',
            }}
          >
            {/* Background image (images only; PDFs show a placeholder) */}
            {bgImageUrl && !bgIsPdf && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bgImageUrl}
                alt="Check stock background"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                style={{ opacity: 0.35 }}
              />
            )}
            {bgImageUrl && bgIsPdf && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: 0.2 }}
              >
                <div className="text-center" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <div style={{ fontSize: '14pt', color: '#666' }}>
                    PDF Background Loaded
                  </div>
                  <div style={{ fontSize: '9pt', color: '#999', marginTop: '4px' }}>
                    Use Print Test to verify alignment
                  </div>
                </div>
              </div>
            )}

            {/* Grid dots */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: 0.15 }}
              width={NATIVE_WIDTH}
              height={NATIVE_HEIGHT}
            >
              <defs>
                <pattern
                  id="grid-dots"
                  width={GRID_SNAP * PPI}
                  height={GRID_SNAP * PPI}
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx={GRID_SNAP * PPI / 2} cy={GRID_SNAP * PPI / 2} r="0.5" fill="#666" />
                </pattern>
              </defs>
              <rect width={NATIVE_WIDTH} height={NATIVE_HEIGHT} fill="url(#grid-dots)" />
            </svg>

            {/* Draggable fields */}
            {ALL_FIELD_IDS.map((fieldId) => {
              const pos = fieldPositions[fieldId];
              const content = getFieldContent(fieldId, check, formattedAmount, amountInWords, settings);
              const isSelected = selectedField === fieldId;
              const isHidden = pos.visible === false;
              const fontSize = pos.fontSize ?? DEFAULT_FIELD_POSITIONS[fieldId].fontSize ?? 10;
              const labelFontSize = Math.max(Math.round(fontSize * 0.7), 6);

              return (
                <div
                  key={fieldId}
                  className={`absolute transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-1 z-20'
                      : 'hover:ring-1 hover:ring-blue-300 z-10'
                  }`}
                  style={{
                    left: `${pos.left * PPI}px`,
                    top: `${pos.top * PPI}px`,
                    fontSize: `${fontSize}pt`,
                    fontWeight: getFieldFontWeight(fieldId),
                    whiteSpace: 'nowrap',
                    padding: fieldId === 'amountBox' ? '1px 4px' : '1px 2px',
                    border: fieldId === 'amountBox' ? '1px solid #333' : 'none',
                    borderBottom: (pos.showLine && fieldId !== 'amountBox' && fieldId !== 'signatureLine')
                      ? '1px solid #999' : 'none',
                    borderTop: (pos.showLine && fieldId === 'signatureLine')
                      ? '1px solid #999' : 'none',
                    borderRadius: '2px',
                    background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                    opacity: isHidden ? 0.25 : 1,
                    cursor: 'grab',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, fieldId)}
                  onTouchStart={(e) => handleTouchStart(e, fieldId)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField(fieldId);
                  }}
                >
                  {content.label && (
                    <span style={{ color: '#666', fontSize: `${labelFontSize}pt`, marginRight: '4px' }}>
                      {content.label}
                    </span>
                  )}
                  {content.value}
                </div>
              );
            })}
          </div>
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
            {/* Visibility toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className={`h-7 w-7 p-0 ${fieldPositions[selectedField].visible === false ? 'text-red-500' : 'text-green-600'}`}
                onClick={() => toggleFieldVisible(selectedField)}
                title={fieldPositions[selectedField].visible === false ? 'Show field' : 'Hide field'}
              >
                {fieldPositions[selectedField].visible === false ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Label className="text-meta shrink-0">
                {fieldPositions[selectedField].visible === false ? 'Hidden' : 'Visible'}
              </Label>
            </div>

            {/* Show Line toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-meta shrink-0">Show Line</Label>
              <Switch
                checked={fieldPositions[selectedField].showLine}
                onCheckedChange={() => toggleFieldLine(selectedField)}
              />
            </div>

            {/* Font Size +/- */}
            <div className="flex items-center gap-1.5">
              <Label className="text-meta shrink-0">Size</Label>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => updateFieldFontSize(selectedField, -1)}
                disabled={(fieldPositions[selectedField].fontSize ?? DEFAULT_FIELD_POSITIONS[selectedField].fontSize ?? 10) <= 6}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-meta w-8 text-center font-mono">
                {fieldPositions[selectedField].fontSize ?? DEFAULT_FIELD_POSITIONS[selectedField].fontSize ?? 10}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => updateFieldFontSize(selectedField, 1)}
                disabled={(fieldPositions[selectedField].fontSize ?? DEFAULT_FIELD_POSITIONS[selectedField].fontSize ?? 10) >= 24}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">pt</span>
            </div>

            {/* X coordinate */}
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

            {/* Y coordinate */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Printer Offset */}
        <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
          <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark">
            Printer Offset
          </h3>
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Compensate for your printer&apos;s margins. Use small adjustments (+/- 0.05&quot;) to fine-tune.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-meta w-20 shrink-0">Horizontal</Label>
              <Input
                type="number"
                step={0.05}
                min={-1}
                max={1}
                value={settings.offset_x || 0}
                onChange={(e) => setSettings((prev) => ({ ...prev, offset_x: parseFloat(e.target.value) || 0 }))}
                className="h-7 w-20 text-meta text-center"
              />
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">&quot;</span>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-meta w-20 shrink-0">Vertical</Label>
              <Input
                type="number"
                step={0.05}
                min={-1}
                max={1}
                value={settings.offset_y || 0}
                onChange={(e) => setSettings((prev) => ({ ...prev, offset_y: parseFloat(e.target.value) || 0 }))}
                className="h-7 w-20 text-meta text-center"
              />
              <span className="text-meta text-text-muted-light dark:text-text-muted-dark">&quot;</span>
            </div>
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
            Upload a scan of your blank check as a positioning reference. PNG or JPG recommended for best preview.
          </p>

          {bgImageUrl ? (
            <div className="space-y-2">
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                {bgIsPdf ? (
                  <div className="flex items-center gap-2 p-3">
                    <div className="shrink-0 w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-600 text-meta font-bold">
                      PDF
                    </div>
                    <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark truncate">
                      blank-check.pdf
                    </span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bgImageUrl}
                    alt="Check stock"
                    className="w-full h-auto object-contain max-h-20"
                  />
                )}
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
                    Drop file or click to upload
                  </p>
                  <p className="text-meta text-text-muted-light dark:text-text-muted-dark text-center">
                    PNG, JPG, or PDF
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
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleBgUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
