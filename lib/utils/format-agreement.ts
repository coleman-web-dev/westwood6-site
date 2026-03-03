/**
 * Format agreement HTML into structured paragraphs for a legal document look.
 *
 * Takes HTML (with <u> tags from fillAgreementTemplateHtml) and:
 * - Splits on double-newlines to create paragraph blocks
 * - Wraps each block in a <p> tag
 * - Preserves single newlines as <br> within paragraphs
 * - Does NOT change the agreement content, only adds visual structure
 */
export function formatAgreementHtml(html: string): string {
  // Split on two or more consecutive newlines (paragraph breaks)
  const paragraphs = html.split(/\n{2,}/);

  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      // Convert remaining single newlines to <br> within a paragraph
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      return `<p style="margin-bottom: 1em; line-height: 1.7;">${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Format plain text (already filled, no HTML) into structured paragraphs.
 * Used as a fallback when we only have filled_text without the original template.
 */
export function formatAgreementPlainText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return formatAgreementHtml(escaped);
}
