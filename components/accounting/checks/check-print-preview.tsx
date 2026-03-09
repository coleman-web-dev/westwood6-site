'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCheckPrintSettings } from '@/lib/actions/check-actions';
import { Button } from '@/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Printer, Info } from 'lucide-react';
import type { CheckWithDetails, CheckSignature, CheckPrintSettings, CheckFieldId, CheckFieldLayout } from '@/lib/types/check';

// ─── Constants ──────────────────────────────────────────────────────
// Standard US check stock: 8.5" x 11" letter, divided into 3 sections
// Each section is approximately 3.667" tall (11 / 3)
export const SECTION_HEIGHT_IN = 3.667;
export const CHECK_WIDTH_IN = 8.5;

// Default field positions within the check area (inches from top-left of check section)
// All positions use left-based coordinates for consistency with drag-and-drop editor
export const DEFAULT_FIELD_POSITIONS: Record<CheckFieldId, CheckFieldLayout> = {
  payerName:     { top: 0.25, left: 0.40, showLine: false, fontSize: 11, visible: true },
  payerAddress1: { top: 0.50, left: 0.40, showLine: false, fontSize: 9, visible: true },
  payerAddress2: { top: 0.70, left: 0.40, showLine: false, fontSize: 9, visible: true },
  checkNumber:   { top: 0.25, left: 6.80, showLine: false, fontSize: 12, visible: true },
  date:          { top: 0.55, left: 6.20, showLine: true, fontSize: 10, visible: true },
  payTo:         { top: 1.10, left: 0.40, showLine: true, fontSize: 11, visible: true },
  amountBox:     { top: 1.05, left: 6.50, showLine: false, fontSize: 11, visible: true },
  amountWords:   { top: 1.50, left: 0.40, showLine: true, fontSize: 9, visible: true },
  memo:          { top: 2.60, left: 0.40, showLine: true, fontSize: 9, visible: true },
  signatureLine: { top: 2.50, left: 5.50, showLine: true, fontSize: 7, visible: true },
};

/** Human-readable labels for each check field */
export const FIELD_LABELS: Record<CheckFieldId, string> = {
  payerName: 'Payer Name',
  payerAddress1: 'Address Line 1',
  payerAddress2: 'Address Line 2',
  checkNumber: 'Check Number',
  date: 'Date',
  payTo: 'Pay To',
  amountBox: 'Amount',
  amountWords: 'Amount in Words',
  memo: 'Memo',
  signatureLine: 'Signature',
};

// Legacy field positions for backward compatibility (used when field_positions is not set)
const LEGACY_FIELD_POSITIONS = {
  payerName: { top: 0.25, left: 0.4 },
  payerAddress1: { top: 0.5, left: 0.4 },
  payerAddress2: { top: 0.7, left: 0.4 },
  checkNumber: { top: 0.25, right: 0.4 },
  date: { top: 0.45, right: 0.4 },
  payTo: { top: 1.1, left: 0.4 },
  amountBox: { top: 1.05, right: 0.4 },
  amountWords: { top: 1.5, left: 0.4 },
  memo: { top: 2.6, left: 0.4 },
  signatureLine: { top: 2.5, right: 0.4 },
};

// ─── Helpers ────────────────────────────────────────────────────────

export function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tensList = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero';

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tensList[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  }

  const dollars = Math.floor(amount / 100);
  const cents = amount % 100;

  return `${convert(dollars)} and ${cents.toString().padStart(2, '0')}/100`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────────────

interface CheckPrintPreviewProps {
  check: CheckWithDetails;
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, renders a test alignment grid instead of check data */
  testMode?: boolean;
}

export function CheckPrintPreview({
  check,
  communityId,
  open,
  onOpenChange,
  testMode = false,
}: CheckPrintPreviewProps) {
  const [signatures, setSignatures] = useState<(CheckSignature & { signedUrl?: string })[]>([]);
  const [printSettings, setPrintSettings] = useState<CheckPrintSettings | null>(null);

  useEffect(() => {
    if (!open) return;
    getCheckPrintSettings(communityId).then(setPrintSettings);
  }, [open, communityId]);

  useEffect(() => {
    if (!open || testMode) return;

    async function fetchSignatures() {
      if (!check.approvals?.length) return;

      const supabase = createClient();
      const sigIds = check.approvals
        .filter((a) => a.status === 'approved' && a.signature_id)
        .map((a) => a.signature_id!);

      if (sigIds.length === 0) return;

      const { data: sigs } = await supabase
        .from('check_signatures')
        .select('*')
        .in('id', sigIds);

      if (!sigs) return;

      const withUrls = await Promise.all(
        sigs.map(async (sig) => {
          const { data } = await supabase.storage
            .from('hoa-documents')
            .createSignedUrl(sig.file_path, 300);
          return { ...sig, signedUrl: data?.signedUrl };
        }),
      );

      setSignatures(withUrls as (CheckSignature & { signedUrl?: string })[]);
    }

    fetchSignatures();
  }, [open, check.approvals, testMode]);

  if (!printSettings) return null;

  const formattedAmount = (check.amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const amountInWords = numberToWords(check.amount);

  // Calculate the top offset for the check section based on position
  const sectionTopIn =
    printSettings.check_position === 'top' ? 0
    : printSettings.check_position === 'middle' ? SECTION_HEIGHT_IN
    : SECTION_HEIGHT_IN * 2;

  // Apply user offsets
  const offsetX = printSettings.offset_x || 0;
  const offsetY = printSettings.offset_y || 0;

  function pos(field: { top?: number; left?: number; right?: number }) {
    const style: React.CSSProperties = {
      position: 'absolute',
    };
    if (field.top !== undefined) {
      style.top = `${sectionTopIn + field.top + offsetY}in`;
    }
    if (field.left !== undefined) {
      style.left = `${field.left + offsetX}in`;
    }
    if (field.right !== undefined) {
      style.right = `${field.right - offsetX}in`;
    }
    return style;
  }

  function handlePrint() {
    // Build a standalone HTML document for printing
    const printHtml = buildPrintHtml({
      check,
      formattedAmount,
      amountInWords,
      printSettings: printSettings!,
      sectionTopIn,
      offsetX,
      offsetY,
      signatures,
      testMode,
      fieldPositions: printSettings!.field_positions,
    });

    // Open in a new window so user can see the output and adjust print settings
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      // Wait for content/images to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 600);
    }
  }

  // Stub sections (the two non-check thirds of the page)
  const stubPositions = printSettings.check_position === 'top'
    ? [1, 2]
    : printSettings.check_position === 'middle'
      ? [0, 2]
      : [0, 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testMode ? 'Print Alignment Test' : 'Print Preview'}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-meta text-text-muted-light dark:text-text-muted-dark">
            <Info className="h-3.5 w-3.5" />
            <span>
              Check position: <strong className="text-text-secondary-light dark:text-text-secondary-dark">
                {printSettings.check_position}
              </strong>
              {(offsetX !== 0 || offsetY !== 0) && (
                <> | Offset: {offsetX > 0 ? '+' : ''}{offsetX}&quot; H, {offsetY > 0 ? '+' : ''}{offsetY}&quot; V</>
              )}
            </span>
          </div>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            {testMode ? 'Print Test Page' : 'Print'}
          </Button>
        </div>

        {/* On-screen preview (scaled to fit dialog) */}
        <div
          className="bg-white border border-gray-300 rounded-lg overflow-hidden mx-auto"
          style={{
            width: '100%',
            aspectRatio: `${CHECK_WIDTH_IN} / 11`,
            position: 'relative',
          }}
        >
          {/* Scale the 8.5x11 inch page into the preview container */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#000',
              fontSize: '10px',
            }}
          >
            {/* Section dividers (dashed lines at 1/3 and 2/3) */}
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '1px dashed #ccc' }} />
            <div style={{ position: 'absolute', top: '66.67%', left: 0, right: 0, borderTop: '1px dashed #ccc' }} />

            {/* Section labels */}
            {[0, 1, 2].map((section) => {
              const isCheckSection = (printSettings.check_position === 'top' && section === 0)
                || (printSettings.check_position === 'middle' && section === 1)
                || (printSettings.check_position === 'bottom' && section === 2);
              const isStub = !isCheckSection;
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

            {/* Check content in the correct section */}
            {testMode ? (
              <TestAlignmentGrid
                sectionTopPercent={
                  printSettings.check_position === 'top' ? 0
                  : printSettings.check_position === 'middle' ? 33.33
                  : 66.67
                }
              />
            ) : (
              <CheckContent
                check={check}
                formattedAmount={formattedAmount}
                amountInWords={amountInWords}
                printSettings={printSettings}
                signatures={signatures}
                sectionTopPercent={
                  printSettings.check_position === 'top' ? 0
                  : printSettings.check_position === 'middle' ? 33.33
                  : 66.67
                }
                offsetXPercent={(offsetX / CHECK_WIDTH_IN) * 100}
                offsetYPercent={(offsetY / 11) * 100}
                fieldPositions={printSettings.field_positions}
              />
            )}

            {/* Stub content */}
            {!testMode && stubPositions.map((section, idx) => (
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

      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components for preview ─────────────────────────────────────

export function CheckContent({
  check,
  formattedAmount,
  amountInWords,
  printSettings,
  signatures,
  sectionTopPercent,
  offsetXPercent,
  offsetYPercent,
  fieldPositions,
}: {
  check: CheckWithDetails;
  formattedAmount: string;
  amountInWords: string;
  printSettings: CheckPrintSettings;
  signatures: (CheckSignature & { signedUrl?: string })[];
  sectionTopPercent: number;
  offsetXPercent: number;
  offsetYPercent: number;
  fieldPositions?: Record<CheckFieldId, CheckFieldLayout>;
}) {
  // If per-field positions are provided, use them (new system)
  if (fieldPositions) {
    const fp = fieldPositions;
    const PAGE_HEIGHT = 11;

    // Convert inches to percentage of the full 8.5x11 page
    function topPct(fieldTop: number) {
      return sectionTopPercent + (fieldTop / PAGE_HEIGHT) * 100;
    }
    function leftPct(fieldLeft: number) {
      return (fieldLeft / CHECK_WIDTH_IN) * 100;
    }
    function fs(fieldId: CheckFieldId): string {
      return `${fp[fieldId].fontSize ?? DEFAULT_FIELD_POSITIONS[fieldId].fontSize ?? 10}pt`;
    }
    function lblFs(fieldId: CheckFieldId): string {
      const size = fp[fieldId].fontSize ?? DEFAULT_FIELD_POSITIONS[fieldId].fontSize ?? 10;
      return `${Math.max(Math.round(size * 0.7), 6)}pt`;
    }
    function isVis(fieldId: CheckFieldId): boolean {
      return fp[fieldId].visible !== false;
    }

    return (
      <>
        {/* Payer name & address */}
        {isVis('payerName') && printSettings.payer_name && (
          <div style={{ position: 'absolute', top: `${topPct(fp.payerName.top)}%`, left: `${leftPct(fp.payerName.left)}%`, fontSize: fs('payerName'), fontWeight: 'bold' }}>
            {printSettings.payer_name}
          </div>
        )}
        {isVis('payerAddress1') && printSettings.payer_address_line1 && (
          <div style={{ position: 'absolute', top: `${topPct(fp.payerAddress1.top)}%`, left: `${leftPct(fp.payerAddress1.left)}%`, fontSize: fs('payerAddress1') }}>
            {printSettings.payer_address_line1}
          </div>
        )}
        {isVis('payerAddress2') && printSettings.payer_address_line2 && (
          <div style={{ position: 'absolute', top: `${topPct(fp.payerAddress2.top)}%`, left: `${leftPct(fp.payerAddress2.left)}%`, fontSize: fs('payerAddress2') }}>
            {printSettings.payer_address_line2}
          </div>
        )}

        {/* Check number */}
        {isVis('checkNumber') && (
          <div style={{ position: 'absolute', top: `${topPct(fp.checkNumber.top)}%`, left: `${leftPct(fp.checkNumber.left)}%`, fontSize: fs('checkNumber'), fontWeight: 'bold' }}>
            {check.check_number}
          </div>
        )}

        {/* Date */}
        {isVis('date') && (
          <div style={{ position: 'absolute', top: `${topPct(fp.date.top)}%`, left: `${leftPct(fp.date.left)}%`, fontSize: fs('date') }}>
            <span style={{ color: '#666', fontSize: lblFs('date'), marginRight: '4px' }}>DATE</span>
            {fp.date.showLine ? (
              <span style={{ borderBottom: '1px solid #999', paddingBottom: '1px' }}>{formatDate(check.date)}</span>
            ) : (
              formatDate(check.date)
            )}
          </div>
        )}

        {/* Pay to the order of */}
        {isVis('payTo') && (
          <div style={{ position: 'absolute', top: `${topPct(fp.payTo.top)}%`, left: `${leftPct(fp.payTo.left)}%`, fontSize: fs('payTo'), maxWidth: '65%' }}>
            <span style={{ color: '#666', fontSize: lblFs('payTo'), marginRight: '6px' }}>PAY TO THE ORDER OF</span>
            {fp.payTo.showLine ? (
              <span style={{ fontWeight: 500, borderBottom: '1px solid #999', paddingBottom: '1px' }}>{check.payee_name}</span>
            ) : (
              <span style={{ fontWeight: 500 }}>{check.payee_name}</span>
            )}
          </div>
        )}

        {/* Amount box */}
        {isVis('amountBox') && (
          <div style={{
            position: 'absolute', top: `${topPct(fp.amountBox.top)}%`, left: `${leftPct(fp.amountBox.left)}%`,
            border: '1px solid #333', padding: '2px 6px', fontSize: fs('amountBox'), fontWeight: 'bold',
          }}>
            {formattedAmount}
          </div>
        )}

        {/* Amount in words */}
        {isVis('amountWords') && (
          <div style={{
            position: 'absolute', top: `${topPct(fp.amountWords.top)}%`, left: `${leftPct(fp.amountWords.left)}%`,
            maxWidth: '70%',
            fontSize: fs('amountWords'),
            borderBottom: fp.amountWords.showLine ? '1px solid #999' : 'none',
            paddingBottom: fp.amountWords.showLine ? '1px' : 0,
          }}>
            {amountInWords}
            <span style={{ color: '#666', fontSize: lblFs('amountWords'), marginLeft: '4px' }}>DOLLARS</span>
          </div>
        )}

        {/* Memo */}
        {isVis('memo') && (
          <div style={{
            position: 'absolute', top: `${topPct(fp.memo.top)}%`, left: `${leftPct(fp.memo.left)}%`,
            fontSize: fs('memo'),
          }}>
            <span style={{ color: '#666', fontSize: lblFs('memo'), marginRight: '4px' }}>MEMO</span>
            {fp.memo.showLine ? (
              <span style={{ borderBottom: '1px solid #999', paddingBottom: '1px' }}>{check.memo || ''}</span>
            ) : (
              <span>{check.memo || ''}</span>
            )}
          </div>
        )}

        {/* Signature */}
        {isVis('signatureLine') && (
          <div style={{
            position: 'absolute', top: `${topPct(fp.signatureLine.top)}%`, left: `${leftPct(fp.signatureLine.left)}%`,
            textAlign: 'center',
          }}>
            {signatures.length > 0 && signatures[0]?.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatures[0].signedUrl}
                alt="Signature"
                style={{ height: '30px', objectFit: 'contain', marginBottom: '2px' }}
              />
            )}
            <div style={{
              borderTop: fp.signatureLine.showLine ? '1px solid #999' : 'none',
              paddingTop: '1px', fontSize: fs('signatureLine'), color: '#666', minWidth: '120px',
            }}>
              AUTHORIZED SIGNATURE
            </div>
          </div>
        )}
      </>
    );
  }

  // Legacy path: use global offsets (backward compat)
  const yOff = offsetYPercent;
  const xOff = offsetXPercent;

  return (
    <>
      {/* Payer name & address (top-left of check) */}
      {printSettings.payer_name && (
        <div style={{ position: 'absolute', top: `${sectionTopPercent + 2 + yOff}%`, left: `${5 + xOff}%`, fontSize: '11px', fontWeight: 'bold' }}>
          {printSettings.payer_name}
        </div>
      )}
      {printSettings.payer_address_line1 && (
        <div style={{ position: 'absolute', top: `${sectionTopPercent + 4.5 + yOff}%`, left: `${5 + xOff}%`, fontSize: '9px' }}>
          {printSettings.payer_address_line1}
        </div>
      )}
      {printSettings.payer_address_line2 && (
        <div style={{ position: 'absolute', top: `${sectionTopPercent + 6.5 + yOff}%`, left: `${5 + xOff}%`, fontSize: '9px' }}>
          {printSettings.payer_address_line2}
        </div>
      )}

      {/* Check number (top-right) */}
      <div style={{ position: 'absolute', top: `${sectionTopPercent + 2 + yOff}%`, right: `${5 - xOff}%`, fontSize: '12px', fontWeight: 'bold' }}>
        {check.check_number}
      </div>

      {/* Date */}
      <div style={{ position: 'absolute', top: `${sectionTopPercent + 7.5 + yOff}%`, right: `${5 - xOff}%`, fontSize: '10px' }}>
        <span style={{ color: '#666', fontSize: '8px', marginRight: '4px' }}>DATE</span>
        {formatDate(check.date)}
      </div>

      {/* Pay to the order of */}
      <div style={{ position: 'absolute', top: `${sectionTopPercent + 11 + yOff}%`, left: `${5 + xOff}%`, right: `${20 - xOff}%`, fontSize: '10px' }}>
        <span style={{ color: '#666', fontSize: '7px', marginRight: '6px' }}>PAY TO THE ORDER OF</span>
        <span style={{ fontWeight: 500, borderBottom: '1px solid #999', paddingBottom: '1px' }}>
          {check.payee_name}
        </span>
      </div>

      {/* Amount box */}
      <div style={{
        position: 'absolute', top: `${sectionTopPercent + 10.5 + yOff}%`, right: `${5 - xOff}%`,
        border: '1px solid #333', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold',
      }}>
        {formattedAmount}
      </div>

      {/* Amount in words */}
      <div style={{
        position: 'absolute', top: `${sectionTopPercent + 15 + yOff}%`, left: `${5 + xOff}%`, right: `${10 - xOff}%`,
        fontSize: '9px', borderBottom: '1px solid #999', paddingBottom: '1px',
      }}>
        {amountInWords}
        <span style={{ color: '#666', fontSize: '7px', marginLeft: '4px' }}>DOLLARS</span>
      </div>

      {/* Memo */}
      <div style={{
        position: 'absolute', top: `${sectionTopPercent + 26 + yOff}%`, left: `${5 + xOff}%`, width: '40%',
        fontSize: '9px',
      }}>
        <span style={{ color: '#666', fontSize: '7px', marginRight: '4px' }}>MEMO</span>
        <span style={{ borderBottom: '1px solid #999', paddingBottom: '1px' }}>
          {check.memo || ''}
        </span>
      </div>

      {/* Signature */}
      <div style={{
        position: 'absolute', top: `${sectionTopPercent + 24 + yOff}%`, right: `${5 - xOff}%`,
        textAlign: 'center',
      }}>
        {signatures.length > 0 && signatures[0]?.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatures[0].signedUrl}
            alt="Signature"
            style={{ height: '30px', objectFit: 'contain', marginBottom: '2px' }}
          />
        )}
        <div style={{ borderTop: '1px solid #999', paddingTop: '1px', fontSize: '7px', color: '#666', minWidth: '120px' }}>
          AUTHORIZED SIGNATURE
        </div>
      </div>
    </>
  );
}

export function StubContent({
  check,
  formattedAmount,
  sectionTopPercent,
  stubNumber,
}: {
  check: CheckWithDetails;
  formattedAmount: string;
  sectionTopPercent: number;
  stubNumber: number;
}) {
  return (
    <div style={{
      position: 'absolute',
      top: `${sectionTopPercent + 3}%`,
      left: '5%',
      right: '5%',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '8px',
    }}>
      <div style={{ display: 'flex', gap: '12%', marginBottom: '4px' }}>
        <div>
          <div style={{ color: '#999', fontSize: '7px' }}>Check #</div>
          <div style={{ fontWeight: 600 }}>{check.check_number}</div>
        </div>
        <div>
          <div style={{ color: '#999', fontSize: '7px' }}>Date</div>
          <div>{formatDate(check.date)}</div>
        </div>
        <div>
          <div style={{ color: '#999', fontSize: '7px' }}>Payee</div>
          <div>{check.payee_name}</div>
        </div>
        <div>
          <div style={{ color: '#999', fontSize: '7px' }}>Amount</div>
          <div style={{ fontWeight: 600 }}>{formattedAmount}</div>
        </div>
      </div>
      {check.memo && (
        <div style={{ marginTop: '2px' }}>
          <span style={{ color: '#999', fontSize: '7px' }}>Memo: </span>
          <span>{check.memo}</span>
        </div>
      )}
      {check.expense_account && (
        <div style={{ marginTop: '2px' }}>
          <span style={{ color: '#999', fontSize: '7px' }}>Category: </span>
          <span>{check.expense_account.code} - {check.expense_account.name}</span>
        </div>
      )}
    </div>
  );
}

function TestAlignmentGrid({ sectionTopPercent }: { sectionTopPercent: number }) {
  return (
    <div style={{
      position: 'absolute',
      top: `${sectionTopPercent}%`,
      left: 0,
      right: 0,
      height: '33.33%',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Grid lines every ~0.5 inch */}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={`h-${i}`} style={{
          position: 'absolute',
          top: `${((i + 1) / 7) * 100}%`,
          left: 0,
          right: 0,
          borderTop: '1px dashed #e5e7eb',
        }}>
          <span style={{ position: 'absolute', top: '-8px', left: '2px', fontSize: '6px', color: '#9ca3af' }}>
            {((i + 1) * 0.5).toFixed(1)}&quot;
          </span>
        </div>
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <div key={`v-${i}`} style={{
          position: 'absolute',
          left: `${((i + 1) / 17) * 100}%`,
          top: 0,
          bottom: 0,
          borderLeft: '1px dashed #e5e7eb',
        }}>
          <span style={{ position: 'absolute', top: '2px', left: '2px', fontSize: '6px', color: '#9ca3af' }}>
            {((i + 1) * 0.5).toFixed(1)}&quot;
          </span>
        </div>
      ))}

      {/* Field position markers */}
      <div style={{ position: 'absolute', top: '6%', left: '5%', fontSize: '9px', color: '#dc2626', fontWeight: 600 }}>
        PAYER NAME
      </div>
      <div style={{ position: 'absolute', top: '6%', right: '5%', fontSize: '9px', color: '#dc2626', fontWeight: 600 }}>
        CHECK #
      </div>
      <div style={{ position: 'absolute', top: '22%', right: '5%', fontSize: '9px', color: '#dc2626' }}>
        DATE
      </div>
      <div style={{ position: 'absolute', top: '33%', left: '5%', fontSize: '9px', color: '#dc2626' }}>
        PAY TO THE ORDER OF ________________________
      </div>
      <div style={{ position: 'absolute', top: '33%', right: '5%', fontSize: '9px', color: '#dc2626', border: '1px solid #dc2626', padding: '1px 4px' }}>
        $AMOUNT
      </div>
      <div style={{ position: 'absolute', top: '45%', left: '5%', fontSize: '9px', color: '#dc2626' }}>
        AMOUNT IN WORDS ________________________________ DOLLARS
      </div>
      <div style={{ position: 'absolute', top: '78%', left: '5%', fontSize: '9px', color: '#dc2626' }}>
        MEMO ________________
      </div>
      <div style={{ position: 'absolute', top: '75%', right: '5%', fontSize: '9px', color: '#dc2626', borderBottom: '1px solid #dc2626', minWidth: '100px', textAlign: 'center', paddingBottom: '2px' }}>
        SIGNATURE
      </div>

      {/* Center label */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '11px',
        color: '#6b7280',
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        ALIGNMENT TEST PAGE<br />
        <span style={{ fontSize: '9px', fontWeight: 400 }}>
          Print this page and compare field positions<br />
          with your check stock. Adjust offsets as needed.
        </span>
      </div>
    </div>
  );
}

// ─── Print HTML Builder ─────────────────────────────────────────────

export function buildPrintHtml(params: {
  check: CheckWithDetails;
  formattedAmount: string;
  amountInWords: string;
  printSettings: CheckPrintSettings;
  sectionTopIn: number;
  offsetX: number;
  offsetY: number;
  signatures: (CheckSignature & { signedUrl?: string })[];
  testMode: boolean;
  fieldPositions?: Record<CheckFieldId, CheckFieldLayout>;
}): string {
  const { check, formattedAmount, amountInWords, printSettings, sectionTopIn, offsetX, offsetY, signatures, testMode, fieldPositions } = params;

  const date = formatDate(check.date);
  const pageMargin = printSettings.print_margin ?? 0.4; // inches, matches Chrome default

  // Determine stub sections
  const stubSections = printSettings.check_position === 'top'
    ? [1, 2] : printSettings.check_position === 'middle'
    ? [0, 2] : [0, 1];

  const stubHtml = stubSections.map((section) => {
    const stubTopIn = section * SECTION_HEIGHT_IN + 0.3 - pageMargin;
    return `
      <div style="position:absolute; top:${stubTopIn}in; left:${0.5 - pageMargin}in; right:${0.5 - pageMargin}in; font-family:Arial,sans-serif; font-size:9pt;">
        <div style="display:flex; gap:0.8in; margin-bottom:4px;">
          <div><div style="color:#999;font-size:7pt;">Check #</div><div style="font-weight:600;">${check.check_number}</div></div>
          <div><div style="color:#999;font-size:7pt;">Date</div><div>${date}</div></div>
          <div><div style="color:#999;font-size:7pt;">Payee</div><div>${check.payee_name}</div></div>
          <div><div style="color:#999;font-size:7pt;">Amount</div><div style="font-weight:600;">${formattedAmount}</div></div>
        </div>
        ${check.memo ? `<div style="margin-top:3px;"><span style="color:#999;font-size:7pt;">Memo: </span>${check.memo}</div>` : ''}
        ${check.expense_account ? `<div style="margin-top:3px;"><span style="color:#999;font-size:7pt;">Category: </span>${check.expense_account.code} - ${check.expense_account.name}</div>` : ''}
      </div>
    `;
  }).join('');

  const signatureImg = signatures.length > 0 && signatures[0]?.signedUrl
    ? `<img src="${signatures[0].signedUrl}" style="height:0.4in; object-fit:contain; margin-bottom:2px;" />`
    : '<div style="height:0.4in;"></div>';

  let checkHtml: string;

  if (testMode) {
    // Legacy test mode with hardcoded offsets
    function topInLegacy(fieldTop: number) { return `${sectionTopIn + fieldTop + offsetY - pageMargin}in`; }
    function leftInLegacy(fieldLeft: number) { return `${fieldLeft + offsetX - pageMargin}in`; }
    function rightInLegacy(fieldRight: number) { return `${fieldRight - offsetX - pageMargin}in`; }

    checkHtml = `
      <div style="position:absolute; top:${topInLegacy(0.25)}; left:${leftInLegacy(0.4)}; font-size:11pt; color:#dc2626; font-weight:600;">PAYER NAME</div>
      <div style="position:absolute; top:${topInLegacy(0.25)}; right:${rightInLegacy(0.4)}; font-size:11pt; color:#dc2626; font-weight:600;">CHECK #</div>
      <div style="position:absolute; top:${topInLegacy(0.45)}; right:${rightInLegacy(0.4)}; font-size:10pt; color:#dc2626;">DATE ______________</div>
      <div style="position:absolute; top:${topInLegacy(1.1)}; left:${leftInLegacy(0.4)}; font-size:10pt; color:#dc2626;">PAY TO THE ORDER OF ___________________________________________</div>
      <div style="position:absolute; top:${topInLegacy(1.05)}; right:${rightInLegacy(0.4)}; font-size:10pt; color:#dc2626; border:1px solid #dc2626; padding:2px 6px;">$AMOUNT</div>
      <div style="position:absolute; top:${topInLegacy(1.5)}; left:${leftInLegacy(0.4)}; right:${rightInLegacy(1.0)}; font-size:10pt; color:#dc2626;">AMOUNT IN WORDS _________________________________________________ DOLLARS</div>
      <div style="position:absolute; top:${topInLegacy(2.6)}; left:${leftInLegacy(0.4)}; font-size:10pt; color:#dc2626;">MEMO ________________________</div>
      <div style="position:absolute; top:${topInLegacy(2.5)}; right:${rightInLegacy(0.4)}; text-align:center; border-bottom:1px solid #dc2626; min-width:2in; padding-bottom:2px; font-size:9pt; color:#dc2626;">SIGNATURE</div>
      <div style="position:absolute; top:${topInLegacy(1.3)}; left:50%; transform:translateX(-50%); text-align:center; font-size:12pt; color:#6b7280; font-family:Arial,sans-serif;">ALIGNMENT TEST<br/><span style="font-size:9pt;">Compare positions with your check stock</span></div>
    `;
  } else if (fieldPositions) {
    // New per-field positioning system with dynamic font sizes and visibility
    const fp = fieldPositions;
    function fpTop(fieldTop: number) { return `${sectionTopIn + fieldTop + offsetY - pageMargin}in`; }
    function fpLeft(fieldLeft: number) { return `${fieldLeft + offsetX - pageMargin}in`; }
    function ffs(fieldId: CheckFieldId) { return fp[fieldId].fontSize ?? DEFAULT_FIELD_POSITIONS[fieldId].fontSize ?? 10; }
    function flbl(fieldId: CheckFieldId) { return Math.max(Math.round(ffs(fieldId) * 0.7), 6); }
    function isVis(fieldId: CheckFieldId) { return fp[fieldId].visible !== false; }

    const parts: string[] = [];

    if (isVis('payerName') && printSettings.payer_name) {
      parts.push(`<div style="position:absolute; top:${fpTop(fp.payerName.top)}; left:${fpLeft(fp.payerName.left)}; font-size:${ffs('payerName')}pt; font-weight:bold;">${printSettings.payer_name}</div>`);
    }
    if (isVis('payerAddress1') && printSettings.payer_address_line1) {
      parts.push(`<div style="position:absolute; top:${fpTop(fp.payerAddress1.top)}; left:${fpLeft(fp.payerAddress1.left)}; font-size:${ffs('payerAddress1')}pt;">${printSettings.payer_address_line1}</div>`);
    }
    if (isVis('payerAddress2') && printSettings.payer_address_line2) {
      parts.push(`<div style="position:absolute; top:${fpTop(fp.payerAddress2.top)}; left:${fpLeft(fp.payerAddress2.left)}; font-size:${ffs('payerAddress2')}pt;">${printSettings.payer_address_line2}</div>`);
    }
    if (isVis('checkNumber')) {
      parts.push(`<div style="position:absolute; top:${fpTop(fp.checkNumber.top)}; left:${fpLeft(fp.checkNumber.left)}; font-size:${ffs('checkNumber')}pt; font-weight:bold;">${check.check_number}</div>`);
    }
    if (isVis('date')) {
      const dateLine = fp.date.showLine ? 'border-bottom:1px solid #999;padding-bottom:1px;' : '';
      parts.push(`<div style="position:absolute; top:${fpTop(fp.date.top)}; left:${fpLeft(fp.date.left)}; font-size:${ffs('date')}pt;"><span style="color:#666;font-size:${flbl('date')}pt;margin-right:4px;">DATE</span> <span style="${dateLine}">${date}</span></div>`);
    }
    if (isVis('payTo')) {
      const payToLine = fp.payTo.showLine ? 'border-bottom:1px solid #999;padding-bottom:1px;' : '';
      parts.push(`<div style="position:absolute; top:${fpTop(fp.payTo.top)}; left:${fpLeft(fp.payTo.left)}; font-size:${ffs('payTo')}pt;"><span style="color:#666;font-size:${flbl('payTo')}pt;margin-right:4px;">PAY TO THE ORDER OF</span> <span style="font-weight:500;${payToLine}">${check.payee_name}</span></div>`);
    }
    if (isVis('amountBox')) {
      parts.push(`<div style="position:absolute; top:${fpTop(fp.amountBox.top)}; left:${fpLeft(fp.amountBox.left)}; border:1.5px solid #333; padding:2px 8px; font-size:${ffs('amountBox')}pt; font-weight:bold;">${formattedAmount}</div>`);
    }
    if (isVis('amountWords')) {
      const amountWordsLine = fp.amountWords.showLine ? 'border-bottom:1px solid #999;padding-bottom:2px;' : '';
      parts.push(`<div style="position:absolute; top:${fpTop(fp.amountWords.top)}; left:${fpLeft(fp.amountWords.left)}; font-size:${ffs('amountWords')}pt; ${amountWordsLine}">${amountInWords} <span style="color:#666;font-size:${flbl('amountWords')}pt;margin-left:4px;">DOLLARS</span></div>`);
    }
    if (isVis('memo')) {
      const memoLine = fp.memo.showLine ? 'border-bottom:1px solid #999;padding-bottom:1px;' : '';
      parts.push(`<div style="position:absolute; top:${fpTop(fp.memo.top)}; left:${fpLeft(fp.memo.left)}; font-size:${ffs('memo')}pt;"><span style="color:#666;font-size:${flbl('memo')}pt;margin-right:4px;">MEMO</span> <span style="${memoLine}">${check.memo || ''}</span></div>`);
    }
    if (isVis('signatureLine')) {
      const sigLine = fp.signatureLine.showLine ? 'border-top:1px solid #999;' : '';
      parts.push(`<div style="position:absolute; top:${fpTop(fp.signatureLine.top)}; left:${fpLeft(fp.signatureLine.left)}; text-align:center;">
        ${signatureImg}
        <div style="${sigLine} padding-top:2px; font-size:${ffs('signatureLine')}pt; color:#666; min-width:2in;">AUTHORIZED SIGNATURE</div>
      </div>`);
    }

    checkHtml = parts.join('\n');
  } else {
    // Legacy: global offsets
    function topIn(fieldTop: number) { return `${sectionTopIn + fieldTop + offsetY - pageMargin}in`; }
    function leftIn(fieldLeft: number) { return `${fieldLeft + offsetX - pageMargin}in`; }
    function rightIn(fieldRight: number) { return `${fieldRight - offsetX - pageMargin}in`; }

    checkHtml = `
      ${printSettings.payer_name ? `<div style="position:absolute; top:${topIn(0.25)}; left:${leftIn(0.4)}; font-size:11pt; font-weight:bold;">${printSettings.payer_name}</div>` : ''}
      ${printSettings.payer_address_line1 ? `<div style="position:absolute; top:${topIn(0.5)}; left:${leftIn(0.4)}; font-size:9pt;">${printSettings.payer_address_line1}</div>` : ''}
      ${printSettings.payer_address_line2 ? `<div style="position:absolute; top:${topIn(0.7)}; left:${leftIn(0.4)}; font-size:9pt;">${printSettings.payer_address_line2}</div>` : ''}
      <div style="position:absolute; top:${topIn(0.25)}; right:${rightIn(0.4)}; font-size:12pt; font-weight:bold;">${check.check_number}</div>
      <div style="position:absolute; top:${topIn(0.55)}; right:${rightIn(0.4)}; font-size:10pt;"><span style="color:#666;font-size:8pt;margin-right:4px;">DATE</span> ${date}</div>
      <div style="position:absolute; top:${topIn(1.1)}; left:${leftIn(0.4)}; right:${rightIn(2.0)}; font-size:9pt;"><span style="color:#666;font-size:7pt;margin-right:4px;">PAY TO THE ORDER OF</span> <span style="font-weight:500;font-size:11pt;">${check.payee_name}</span></div>
      <div style="position:absolute; top:${topIn(1.05)}; right:${rightIn(0.4)}; border:1.5px solid #333; padding:2px 8px; font-size:11pt; font-weight:bold;">${formattedAmount}</div>
      <div style="position:absolute; top:${topIn(1.5)}; left:${leftIn(0.4)}; right:${rightIn(1.0)}; font-size:9pt; border-bottom:1px solid #999; padding-bottom:2px;">${amountInWords} <span style="color:#666;font-size:7pt;margin-left:4px;">DOLLARS</span></div>
      <div style="position:absolute; top:${topIn(2.6)}; left:${leftIn(0.4)}; width:3.5in; font-size:9pt;"><span style="color:#666;font-size:7pt;margin-right:4px;">MEMO</span> <span style="border-bottom:1px solid #999;padding-bottom:1px;">${check.memo || ''}</span></div>
      <div style="position:absolute; top:${topIn(2.4)}; right:${rightIn(0.4)}; text-align:center;">
        ${signatureImg}
        <div style="border-top:1px solid #999; padding-top:2px; font-size:7pt; color:#666; min-width:2in;">AUTHORIZED SIGNATURE</div>
      </div>
    `;
  }

  // Section divider lines (offset by page margin since body starts inside margin)
  const dividerLines = `
    <div style="position:absolute; top:${SECTION_HEIGHT_IN - pageMargin}in; left:0; right:0; border-top:1px dashed #ccc;"></div>
    <div style="position:absolute; top:${SECTION_HEIGHT_IN * 2 - pageMargin}in; left:0; right:0; border-top:1px dashed #ccc;"></div>
  `;

  const pm = pageMargin;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Check Print</title>
  <style>
    @page {
      size: letter;
      margin: ${pm}in;
    }
    html, body {
      margin: 0;
      padding: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${8.5 - pm * 2}in;
      height: ${11 - pm * 2}in;
      position: relative;
      font-family: Georgia, "Times New Roman", serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
      }
      @page {
        size: letter;
        margin: ${pm}in;
      }
    }
  </style>
</head>
<body>
  ${dividerLines}
  ${checkHtml}
  ${!testMode ? stubHtml : ''}
</body>
</html>`;
}
