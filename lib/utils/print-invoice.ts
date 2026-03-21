/**
 * Print invoices as clean, professional documents.
 * Opens a new browser window with print-optimized HTML.
 * The user can save as PDF from the browser's print dialog.
 * Supports bulk printing with page breaks between invoices.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

interface PrintableInvoice {
  title: string;
  description: string | null;
  amount: number; // cents
  amountPaid: number; // cents
  lateFeeAmount: number; // cents
  status: string;
  dueDate: string;
  paidAt: string | null;
  unitNumber: string;
  unitAddress: string | null;
  ownerName: string;
  assessmentTitle: string | null;
  notes: string | null;
}

function getStatusBadge(status: string): string {
  const styles: Record<string, string> = {
    paid: 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;',
    overdue:
      'background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;',
    pending:
      'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;',
    partial:
      'background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa;',
    waived:
      'background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; font-style: italic;',
    voided:
      'background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; text-decoration: line-through;',
  };

  const style =
    styles[status.toLowerCase()] ||
    'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';

  return `<span style="display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif; ${style}">${escapeHtml(status)}</span>`;
}

function buildInvoiceBlock(
  invoice: PrintableInvoice,
  communityName: string,
  communityAddress: string | null,
  isLast: boolean,
): string {
  const baseAmount = invoice.amount - invoice.lateFeeAmount;
  const balanceDue = invoice.amount - invoice.amountPaid;
  const displayTitle = invoice.description
    ? `${escapeHtml(invoice.title)} (${escapeHtml(invoice.description)})`
    : escapeHtml(invoice.title);

  let detailsRows = `
    <tr>
      <td style="padding: 8px 0; font-size: 13px;">${displayTitle}</td>
      <td style="padding: 8px 0; font-size: 13px; text-align: right;">${formatMoney(baseAmount)}</td>
    </tr>`;

  if (invoice.lateFeeAmount > 0) {
    detailsRows += `
    <tr>
      <td style="padding: 8px 0; font-size: 13px;">Late Fee</td>
      <td style="padding: 8px 0; font-size: 13px; text-align: right;">${formatMoney(invoice.lateFeeAmount)}</td>
    </tr>`;
  }

  detailsRows += `
    <tr>
      <td colspan="2" style="padding: 0;"><hr style="border: none; border-top: 1px solid #d1d5db; margin: 4px 0;" /></td>
    </tr>
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #555;">Subtotal</td>
      <td style="padding: 6px 0; font-size: 13px; text-align: right; color: #555;">${formatMoney(invoice.amount)}</td>
    </tr>`;

  if (invoice.amountPaid > 0) {
    detailsRows += `
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #166534;">Amount Paid</td>
      <td style="padding: 6px 0; font-size: 13px; text-align: right; color: #166534;">-${formatMoney(invoice.amountPaid)}</td>
    </tr>`;
  }

  detailsRows += `
    <tr>
      <td style="padding: 10px 0 6px; font-size: 14px; font-weight: 700;">Balance Due</td>
      <td style="padding: 10px 0 6px; font-size: 14px; font-weight: 700; text-align: right;">${formatMoney(Math.max(0, balanceDue))}</td>
    </tr>`;

  const notesSection = invoice.notes
    ? `
    <div style="margin-top: 24px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 12px; line-height: 1.6;">
      <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #555;">Notes</strong>
      <div style="margin-top: 6px; color: #374151;">${escapeHtml(invoice.notes)}</div>
    </div>`
    : '';

  const paidDate =
    invoice.paidAt && invoice.status.toLowerCase() === 'paid'
      ? `<div style="margin-top: 8px; font-size: 12px; color: #166534;">Paid on ${escapeHtml(invoice.paidAt)}</div>`
      : '';

  const pageBreak = isLast ? '' : 'page-break-after: always;';

  return `
  <div style="margin-bottom: 48px; ${pageBreak}">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #333;">
      <h1 style="font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin: 0;">
        ${escapeHtml(communityName)}
      </h1>
      ${communityAddress ? `<p style="font-size: 12px; color: #555; margin-top: 4px;">${escapeHtml(communityAddress)}</p>` : ''}
    </div>

    <!-- Invoice title + status -->
    <div style="text-align: center; margin-bottom: 28px;">
      <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 10px 0; letter-spacing: 1px;">INVOICE</h2>
      ${getStatusBadge(invoice.status)}
    </div>

    <!-- Bill To -->
    <div style="margin-bottom: 24px; padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #555; margin-bottom: 6px; font-weight: 600;">Bill To</div>
      <div style="font-size: 14px; font-weight: 600;">${escapeHtml(invoice.ownerName)}</div>
      <div style="font-size: 13px; color: #374151; margin-top: 2px;">Unit ${escapeHtml(invoice.unitNumber)}</div>
      ${invoice.unitAddress ? `<div style="font-size: 13px; color: #555;">${escapeHtml(invoice.unitAddress)}</div>` : ''}
    </div>

    ${invoice.assessmentTitle ? `<div style="font-size: 12px; color: #555; margin-bottom: 16px;">Assessment: ${escapeHtml(invoice.assessmentTitle)}</div>` : ''}

    <!-- Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #333;">
          <th style="padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; color: #555;">Description</th>
          <th style="padding: 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; text-align: right; color: #555;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${detailsRows}
      </tbody>
    </table>

    <!-- Due Date -->
    <div style="margin-top: 20px; padding: 10px 14px; border-left: 3px solid #333; font-size: 13px;">
      <strong>Due Date:</strong> ${escapeHtml(invoice.dueDate)}
      ${paidDate}
    </div>

    ${notesSection}

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 11px; color: #999; text-align: center;">
      Generated by DuesIQ on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </div>
  </div>`;
}

export function printInvoices(params: {
  communityName: string;
  communityAddress: string | null;
  invoices: PrintableInvoice[];
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert(
      'Please allow popups for this site to print invoices.',
    );
    return;
  }

  const invoiceBlocks = params.invoices
    .map((invoice, i) =>
      buildInvoiceBlock(
        invoice,
        params.communityName,
        params.communityAddress,
        i === params.invoices.length - 1,
      ),
    )
    .join('');

  const titleText =
    params.invoices.length === 1
      ? `Invoice - ${escapeHtml(params.invoices[0].title)}`
      : `Invoices - ${escapeHtml(params.communityName)}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${titleText}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      max-width: 700px;
      margin: 40px auto;
      padding: 0 24px;
      color: #1a1a1a;
      line-height: 1.65;
      font-size: 13px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0.5in;
        max-width: none;
        background: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        margin: 0.5in;
        size: letter;
      }
    }
  </style>
</head>
<body>
  ${invoiceBlocks}
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
