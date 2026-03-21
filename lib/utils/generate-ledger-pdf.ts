/**
 * Generate a PDF for a unit's payment ledger using jsPDF.
 * Used as an attachment when returning completed estoppel certificates.
 */

import { jsPDF } from 'jspdf';
import type { LedgerEntry } from '@/lib/types/database';

interface LedgerPdfParams {
  communityName: string;
  ownerName: string;
  unitLabel: string;
  entries: LedgerEntry[];
  generatedDate: string;
}

const TYPE_LABELS: Record<string, string> = {
  charge: 'Charge',
  payment: 'Payment',
  manual_credit: 'Credit',
  manual_debit: 'Debit',
  overpayment: 'Overpayment',
  payment_applied: 'Applied',
  refund: 'Refund',
  deposit_return: 'Deposit Return',
  bounced_reversal: 'Bounced',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}

export function generateLedgerPdf(params: LedgerPdfParams): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 45;

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text(params.communityName, marginLeft, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  const subtitle = params.ownerName
    ? `${params.ownerName} \u00B7 ${params.unitLabel}`
    : params.unitLabel;
  doc.text(subtitle, marginLeft, y);
  y += 20;

  // Divider
  doc.setDrawColor(50);
  doc.setLineWidth(1);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 16;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('ACCOUNT LEDGER', marginLeft, y);
  y += 20;

  // ── Summary row ──
  if (params.entries.length > 0) {
    const totalCharges = params.entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const totalCredits = params.entries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
    const balance = params.entries[params.entries.length - 1]?.running_balance ?? 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);

    const col1X = marginLeft;
    const col2X = marginLeft + 160;
    const col3X = marginLeft + 320;

    doc.text('TOTAL CHARGES', col1X, y);
    doc.text('TOTAL PAYMENTS', col2X, y);
    doc.text('CURRENT BALANCE', col3X, y);
    y += 13;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(180, 30, 30);
    doc.text(`$${formatAmount(totalCharges)}`, col1X, y);
    doc.setTextColor(20, 130, 50);
    doc.text(`-$${formatAmount(Math.abs(totalCredits))}`, col2X, y);
    doc.setTextColor(0);
    doc.text(`$${(balance / 100).toFixed(2)}`, col3X, y);
    y += 22;
  }

  // ── Table header ──
  const colDate = marginLeft;
  const colType = marginLeft + 80;
  const colDesc = marginLeft + 145;
  const colAmt = pageWidth - marginRight - 75;
  const colBal = pageWidth - marginRight;
  const rowHeight = 16;

  function drawTableHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('DATE', colDate, y);
    doc.text('TYPE', colType, y);
    doc.text('DESCRIPTION', colDesc, y);
    doc.text('AMOUNT', colAmt, y, { align: 'right' });
    doc.text('BALANCE', colBal, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(50);
    doc.setLineWidth(1);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 12;
  }

  drawTableHeader();

  // ── Table rows ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  for (const entry of params.entries) {
    if (y + rowHeight > pageHeight - 50) {
      doc.addPage();
      y = 45;
      drawTableHeader();
    }

    doc.setTextColor(30);
    doc.text(formatDate(entry.entry_date), colDate, y);
    doc.text(TYPE_LABELS[entry.entry_type] ?? entry.entry_type, colType, y);

    // Truncate description to fit
    const maxDescWidth = colAmt - colDesc - 20;
    const desc = doc.splitTextToSize(entry.description, maxDescWidth)[0] || '';
    doc.text(desc, colDesc, y);

    // Amount with color
    const isCredit = entry.amount < 0;
    const sign = isCredit ? '-' : '+';
    if (isCredit) {
      doc.setTextColor(20, 130, 50);
    } else {
      doc.setTextColor(180, 30, 30);
    }
    doc.text(`${sign}$${formatAmount(entry.amount)}`, colAmt, y, { align: 'right' });

    doc.setTextColor(30);
    doc.text(`$${(entry.running_balance / 100).toFixed(2)}`, colBal, y, { align: 'right' });

    y += rowHeight;

    // Light row separator
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y - 4, pageWidth - marginRight, y - 4);
  }

  // ── Footer ──
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${params.generatedDate} by DuesIQ`, marginLeft, y);

  return doc.output('blob');
}

/**
 * Generate a sanitized filename for the ledger PDF.
 */
export function ledgerPdfFilename(params: {
  unitLabel: string;
  communityName: string;
}): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase();
  return `ledger-${safe(params.unitLabel)}-${safe(params.communityName)}.pdf`;
}
