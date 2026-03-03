/**
 * Print a signed agreement as a clean, professional document.
 * Opens a new browser window with print-optimized HTML.
 * The user can save as PDF from the browser's print dialog.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printAgreement(params: {
  communityName: string;
  communityAddress: string;
  amenityName: string;
  filledText: string;
  signerName: string;
  signedAt: string;
}) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to download the agreement as PDF.');
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Rental Agreement - ${escapeHtml(params.amenityName)}</title>
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
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid #333;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header p {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }
    h2 {
      font-size: 15px;
      text-align: center;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .agreement-text {
      white-space: pre-line;
      font-size: 13px;
      line-height: 1.65;
    }
    .signature-block {
      margin-top: 48px;
      border-top: 1px solid #ccc;
      padding-top: 24px;
    }
    .sig-row {
      margin-bottom: 20px;
    }
    .sig-line {
      border-bottom: 1px solid #333;
      display: inline-block;
      min-width: 280px;
      padding-bottom: 2px;
      font-style: italic;
      font-size: 14px;
    }
    .sig-label {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }
    .e-sign-notice {
      margin-top: 24px;
      padding: 12px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-size: 11px;
      color: #666;
      line-height: 1.5;
    }
    @media print {
      body { margin: 0; padding: 16px; }
      .e-sign-notice { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(params.communityName)}</h1>
    ${params.communityAddress ? `<p>${escapeHtml(params.communityAddress)}</p>` : ''}
  </div>
  <h2>${escapeHtml(params.amenityName)} Rental Agreement</h2>
  <div class="agreement-text">${escapeHtml(params.filledText)}</div>
  <div class="signature-block">
    <div class="sig-row">
      <div class="sig-line">${escapeHtml(params.signerName)}</div>
      <div class="sig-label">Electronic Signature</div>
    </div>
    <div class="sig-row">
      <div class="sig-line">${escapeHtml(params.signedAt)}</div>
      <div class="sig-label">Date Signed</div>
    </div>
  </div>
  <div class="e-sign-notice">
    This agreement was electronically signed via DuesIQ. The signer typed their
    full legal name as their electronic signature, which constitutes acceptance
    of the terms above under applicable electronic signature laws.
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
