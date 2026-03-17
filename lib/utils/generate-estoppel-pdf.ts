/**
 * Generate a PDF for a completed estoppel certificate using jsPDF.
 * Takes the template text with all three field phases filled in,
 * plus signature info, and produces a professional branded PDF.
 */

import { jsPDF } from 'jspdf';
import { fillEstoppelTemplate } from './estoppel-template';

interface EstoppelPdfParams {
  communityName: string;
  communityAddress: string;
  template: string;
  requesterFields: Record<string, string>;
  systemFields: Record<string, string>;
  boardFields: Record<string, string>;
  signatureName: string;
  signatureTitle: string;
  completionDate: string;
}

/**
 * Generate a professional PDF for a completed estoppel certificate.
 * Returns the PDF as a Blob.
 */
export function generateEstoppelPdf(params: EstoppelPdfParams): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 60;
  const marginRight = 60;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 50;

  // Fill the template with all values
  const filledText = fillEstoppelTemplate(
    params.template,
    params.requesterFields,
    params.systemFields,
    {
      ...params.boardFields,
      completed_by_name: params.signatureName,
      completed_by_title: params.signatureTitle,
      completion_date: params.completionDate,
    },
  );

  // --- Header ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(params.communityName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 18;

  if (params.communityAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(params.communityAddress, pageWidth / 2, y, { align: 'center' });
    y += 14;
  }

  // Header divider
  doc.setDrawColor(50);
  doc.setLineWidth(1.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 24;

  // --- Title ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('ESTOPPEL CERTIFICATE', pageWidth / 2, y, { align: 'center' });
  y += 28;

  // --- Body text ---
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30);

  const paragraphs = filledText.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    const lines = doc.splitTextToSize(trimmed, contentWidth);
    const blockHeight = lines.length * 15;

    if (y + blockHeight > pageHeight - 100) {
      doc.addPage();
      y = 50;
    }

    doc.text(lines, marginLeft, y);
    y += blockHeight + 8;
  }

  // --- Signature block ---
  if (y + 140 > pageHeight - 60) {
    doc.addPage();
    y = 50;
  }

  y += 16;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 24;

  // Signature
  doc.setFont('times', 'italic');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(params.signatureName, marginLeft, y);
  y += 4;
  doc.setDrawColor(50);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, marginLeft + 250, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Electronic Signature', marginLeft, y);
  y += 20;

  // Title
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(params.signatureTitle, marginLeft, y);
  y += 4;
  doc.setDrawColor(50);
  doc.line(marginLeft, y, marginLeft + 250, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Title', marginLeft, y);
  y += 20;

  // Date
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(params.completionDate, marginLeft, y);
  y += 4;
  doc.setDrawColor(50);
  doc.line(marginLeft, y, marginLeft + 250, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Date', marginLeft, y);
  y += 28;

  // --- E-sign legal notice ---
  if (y + 60 > pageHeight - 40) {
    doc.addPage();
    y = 50;
  }

  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  const noticeText =
    'This estoppel certificate was electronically signed via DuesIQ. The signer consented to use ' +
    'electronic signatures under the Electronic Signatures in Global and National Commerce ' +
    'Act (ESIGN) and the Uniform Electronic Transactions Act (UETA). The signer typed their ' +
    'full legal name as their electronic signature, certifying the accuracy of the information ' +
    'contained in this certificate.';
  const noticeLines = doc.splitTextToSize(noticeText, contentWidth - 16);
  const noticeHeight = noticeLines.length * 12 + 16;

  doc.roundedRect(marginLeft, y, contentWidth, noticeHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(noticeLines, marginLeft + 8, y + 12);

  return doc.output('blob');
}

/**
 * Generate a sanitized filename for the estoppel PDF.
 */
export function estoppelPdfFilename(params: {
  propertyAddress?: string;
  communityName: string;
}): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase();
  const property = params.propertyAddress ? safe(params.propertyAddress) : 'certificate';
  return `estoppel-${property}-${safe(params.communityName)}.pdf`;
}
