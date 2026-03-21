/**
 * Estoppel certificate template system: variables, fill functions, and phase partitioning.
 *
 * Estoppel fields have three phases:
 * - 'requester': filled by external requester on the public form
 * - 'system': auto-filled from the database (assessment, balance, violations, etc.)
 * - 'board': filled by board member during review (insurance, litigation, transfer fees)
 */

import type { EstoppelField } from '@/lib/types/database';

/** System variables auto-filled from the database */
export const ESTOPPEL_SYSTEM_VARIABLES = [
  { key: 'community_name', label: 'Community Name', example: 'Westwood Community Six Association' },
  { key: 'community_address', label: 'Community Address', example: '8207 NW 107th Ave, Tamarac, FL' },
  { key: 'assessment_amount', label: 'Assessment Amount', example: '$250.00' },
  { key: 'assessment_frequency', label: 'Assessment Frequency', example: 'Monthly' },
  { key: 'paid_through_date', label: 'Paid Through Date', example: '03/01/2026' },
  { key: 'current_balance', label: 'Current Balance Due', example: '$0.00' },
  { key: 'late_fees', label: 'Late Fees / Interest', example: '$0.00' },
  { key: 'has_special_assessments', label: 'Special Assessments?', example: 'No' },
  { key: 'special_assessment_details', label: 'Special Assessment Details', example: 'N/A' },
  { key: 'has_violations', label: 'Violations on Record?', example: 'No' },
  { key: 'violation_details', label: 'Violation Details', example: 'N/A' },
  { key: 'completion_date', label: 'Completion Date', example: '03/17/2026' },
] as const;

/** Requester variables filled by the external requester */
export const ESTOPPEL_REQUESTER_VARIABLES = [
  { key: 'requester_company', label: 'Title Company / Attorney', example: 'Smith & Associates' },
  { key: 'requester_contact', label: 'Contact Person', example: 'Jane Doe' },
  { key: 'requester_email', label: 'Requester Email', example: 'jane@smithlaw.com' },
  { key: 'requester_phone', label: 'Requester Phone', example: '(555) 123-4567' },
  { key: 'owner_names', label: 'Property Owner(s)', example: 'John & Mary Smith' },
  { key: 'property_address', label: 'Property Address', example: '1234 NW 107th Ave' },
  { key: 'lot_number', label: 'Lot / Unit Number', example: '42' },
  { key: 'under_contract', label: 'Under Contract?', example: 'Yes' },
  { key: 'closing_date', label: 'Closing Date', example: '04/15/2026' },
  { key: 'request_date', label: 'Date of Request', example: '03/17/2026' },
  { key: 'delivery_email', label: 'Delivery Email', example: 'jane@smithlaw.com' },
] as const;

/** Board variables filled per-request during review */
export const ESTOPPEL_BOARD_VARIABLES = [
  { key: 'insurance_carrier', label: 'Insurance Carrier / Agent', example: 'State Farm - Bob Johnson' },
  { key: 'insurance_contact', label: 'Insurance Phone / Email', example: '(555) 987-6543' },
  { key: 'litigation_pending', label: 'Litigation Pending?', example: 'No' },
  { key: 'litigation_description', label: 'Litigation Description', example: 'N/A' },
  { key: 'transfer_fee', label: 'Transfer Fee', example: '$100.00' },
  { key: 'capital_contribution', label: 'Capital Contribution', example: '$0.00' },
  { key: 'other_fees', label: 'Other Fees', example: '$0.00' },
  { key: 'other_fees_description', label: 'Other Fees Description', example: 'N/A' },
  { key: 'completed_by_name', label: 'Completed By', example: 'Board President' },
  { key: 'completed_by_title', label: 'Title', example: 'President' },
] as const;

/** All estoppel variables combined for the wizard UI */
export const ALL_ESTOPPEL_VARIABLES = [
  ...ESTOPPEL_SYSTEM_VARIABLES.map((v) => ({ ...v, phase: 'system' as const })),
  ...ESTOPPEL_REQUESTER_VARIABLES.map((v) => ({ ...v, phase: 'requester' as const })),
  ...ESTOPPEL_BOARD_VARIABLES.map((v) => ({ ...v, phase: 'board' as const })),
];

/**
 * Partition estoppel fields by fill_phase.
 */
export function partitionEstoppelFieldsByPhase(fields: EstoppelField[]): {
  requesterFields: EstoppelField[];
  systemFields: EstoppelField[];
  boardFields: EstoppelField[];
} {
  const requesterFields: EstoppelField[] = [];
  const systemFields: EstoppelField[] = [];
  const boardFields: EstoppelField[] = [];

  for (const field of fields) {
    switch (field.fill_phase) {
      case 'requester':
        requesterFields.push(field);
        break;
      case 'system':
        systemFields.push(field);
        break;
      case 'board':
        boardFields.push(field);
        break;
    }
  }

  return { requesterFields, systemFields, boardFields };
}

/**
 * Replace all {{key}} placeholders in the template with actual values.
 */
export function fillEstoppelTemplate(
  template: string,
  requesterFields: Record<string, string>,
  systemFields: Record<string, string>,
  boardFields: Record<string, string>,
): string {
  const allValues: Record<string, string> = {
    ...requesterFields,
    ...systemFields,
    ...boardFields,
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return allValues[key] ?? `{{${key}}}`;
  });
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Fill template and return HTML with underlined values.
 * Board-phase fields that aren't filled yet show as italic placeholders.
 */
export function fillEstoppelTemplateHtml(
  template: string,
  requesterFields: Record<string, string>,
  systemFields: Record<string, string>,
  boardFields: Record<string, string>,
  boardFieldKeys?: Set<string>,
): string {
  const allValues: Record<string, string> = {
    ...requesterFields,
    ...systemFields,
    ...boardFields,
  };
  const escaped = escapeHtml(template);
  return escaped.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const val = allValues[key];
    if (val) return `<u>${escapeHtml(val)}</u>`;
    if (boardFieldKeys?.has(key)) {
      return '<em style="color: var(--text-muted); font-style: italic;">[To be completed by board]</em>';
    }
    return `{{${key}}}`;
  });
}

/**
 * Build example-filled version of the template for admin preview.
 */
export function fillEstoppelTemplateWithExamples(template: string): string {
  const examples: Record<string, string> = {};
  for (const v of ALL_ESTOPPEL_VARIABLES) {
    examples[v.key] = v.example;
  }
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return examples[key] ?? `{{${key}}}`;
  });
}

/**
 * Build system context from database data for auto-filling.
 */
export function buildEstoppelSystemContext(params: {
  communityName: string;
  communityAddress: string;
  assessmentAmount: number | null;
  assessmentFrequency: string | null;
  paidThroughDate: string | null;
  currentBalance: number;
  lateFees: number;
  specialAssessments: Array<{ title: string; amount: number; details?: string }>;
  violations: Array<{ title: string; status: string; description?: string }>;
  futureSpecialAssessments?: Array<{ title: string; amount: number; dueDates?: string }>;
  completionDate: string;
}): Record<string, string> {
  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const hasSpecial = params.specialAssessments.length > 0;
  const specialDetails = hasSpecial
    ? params.specialAssessments
        .map((sa) => `${sa.title}: ${formatCents(sa.amount)}${sa.details ? ` - ${sa.details}` : ''}`)
        .join('; ')
    : 'N/A';

  const hasViolations = params.violations.length > 0;
  const violationDetails = hasViolations
    ? params.violations
        .map((v) => `${v.title} (${v.status})${v.description ? `: ${v.description}` : ''}`)
        .join('; ')
    : 'N/A';

  const futureSpecials = params.futureSpecialAssessments ?? [];
  const hasFutureSpecial = futureSpecials.length > 0;
  const futureSpecialAmount = hasFutureSpecial
    ? futureSpecials.map((sa) => `${sa.title}: ${formatCents(sa.amount)}`).join('; ')
    : '';
  const futureSpecialDueDates = hasFutureSpecial
    ? futureSpecials.map((sa) => sa.dueDates || 'TBD').join('; ')
    : '';

  return {
    community_name: params.communityName,
    community_address: params.communityAddress || '',
    assessment_amount: params.assessmentAmount != null ? formatCents(params.assessmentAmount) : 'N/A',
    assessment_frequency: params.assessmentFrequency || 'N/A',
    paid_through_date: params.paidThroughDate || 'N/A',
    current_balance: formatCents(params.currentBalance),
    late_fees: formatCents(params.lateFees),
    has_special_assessments: hasSpecial ? 'Yes' : 'No',
    special_assessment_details: specialDetails,
    has_violations: hasViolations ? 'Yes' : 'No',
    violation_details: violationDetails,
    future_special_amount: futureSpecialAmount,
    future_special_due_dates: futureSpecialDueDates,
    completion_date: params.completionDate,
  };
}
