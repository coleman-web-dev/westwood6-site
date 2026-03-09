/**
 * Agreement template system: variables and fill function.
 *
 * System variables are auto-filled from the reservation context.
 * Custom field answers come from the member's form responses.
 * Fields can be phased: 'reservation' (filled by member at booking)
 * or 'post_event' (filled by board after the event).
 */

import type { AgreementField } from '@/lib/types/database';

/** Marker text inserted for post-event placeholders during reservation signing */
export const POST_EVENT_PLACEHOLDER = '[To be completed after event]';

export const SYSTEM_VARIABLES = [
  { key: 'member_name', label: 'Member Name', example: 'John Smith' },
  { key: 'unit_number', label: 'Unit Number', example: '204' },
  { key: 'amenity_name', label: 'Amenity Name', example: 'Clubhouse' },
  { key: 'community_name', label: 'Community Name', example: 'Westwood Community Six' },
  { key: 'community_address', label: 'Community Address', example: '8207 NW 107th Avenue, Tamarac, FL' },
  { key: 'reservation_date', label: 'Reservation Date', example: 'March 15, 2026' },
  { key: 'start_time', label: 'Start Time', example: '2:00 PM' },
  { key: 'end_time', label: 'End Time', example: '6:00 PM' },
  { key: 'fee', label: 'Rental Fee', example: '$250.00' },
  { key: 'deposit', label: 'Security Deposit', example: '$500.00' },
  { key: 'guest_count', label: 'Guest Count', example: '50' },
  { key: 'purpose', label: 'Purpose', example: 'Birthday party' },
  { key: 'signing_date', label: 'Signing Date', example: 'March 10, 2026' },
] as const;

export type SystemVariableKey = (typeof SYSTEM_VARIABLES)[number]['key'];

/**
 * Build system context record from reservation data.
 */
export function buildSystemContext(params: {
  memberName: string;
  unitNumber: string;
  amenityName: string;
  communityName: string;
  communityAddress: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  fee: string;
  deposit: string;
  guestCount: string;
  purpose: string;
  signingDate: string;
}): Record<string, string> {
  return {
    member_name: params.memberName,
    unit_number: params.unitNumber,
    amenity_name: params.amenityName,
    community_name: params.communityName,
    community_address: params.communityAddress,
    reservation_date: params.reservationDate,
    start_time: params.startTime,
    end_time: params.endTime,
    fee: params.fee,
    deposit: params.deposit,
    guest_count: params.guestCount,
    purpose: params.purpose,
    signing_date: params.signingDate,
  };
}

/**
 * Replace all {{key}} placeholders in the template with actual values.
 * System context values are merged with custom field answers.
 * Unreplaced placeholders are left as-is (for visibility during review).
 */
export function fillAgreementTemplate(
  template: string,
  systemContext: Record<string, string>,
  fieldAnswers: Record<string, string>,
): string {
  const allValues: Record<string, string> = { ...systemContext, ...fieldAnswers };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return allValues[key] ?? `{{${key}}}`;
  });
}

/**
 * Escape HTML special characters to prevent injection.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace all {{key}} placeholders with <u>underlined</u> values.
 * Returns HTML safe for dangerouslySetInnerHTML.
 * The template text is HTML-escaped first, then placeholders are replaced.
 */
export function fillAgreementTemplateHtml(
  template: string,
  systemContext: Record<string, string>,
  fieldAnswers: Record<string, string>,
): string {
  const allValues: Record<string, string> = { ...systemContext, ...fieldAnswers };
  // Escape the raw template (the {{}} placeholders survive because they have no special chars)
  const escaped = escapeHtml(template);
  return escaped.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const val = allValues[key];
    if (val) return `<u>${escapeHtml(val)}</u>`;
    return `{{${key}}}`;
  });
}

/**
 * Build an example-filled version of the template (for admin preview).
 * Uses example values from SYSTEM_VARIABLES and placeholder text for custom fields.
 */
export function fillTemplateWithExamples(
  template: string,
  customFieldExamples: Record<string, string>,
): string {
  const systemExamples: Record<string, string> = {};
  for (const v of SYSTEM_VARIABLES) {
    systemExamples[v.key] = v.example;
  }
  return fillAgreementTemplate(template, systemExamples, customFieldExamples);
}

// ─── Phase-aware helpers ─────────────────────────────────────────────

/**
 * Split agreement fields into reservation-phase and post-event-phase groups.
 * Fields without a fill_phase default to 'reservation'.
 */
export function partitionFieldsByPhase(fields: AgreementField[]): {
  reservationFields: AgreementField[];
  postEventFields: AgreementField[];
} {
  const reservationFields: AgreementField[] = [];
  const postEventFields: AgreementField[] = [];

  for (const field of fields) {
    if (field.fill_phase === 'post_event') {
      postEventFields.push(field);
    } else {
      reservationFields.push(field);
    }
  }

  return { reservationFields, postEventFields };
}

/**
 * Fill template for the reservation phase.
 * System variables + reservation-phase field answers are filled normally.
 * Post-event field placeholders get a styled marker: "[To be completed after event]".
 */
export function fillAgreementForReservation(
  template: string,
  systemContext: Record<string, string>,
  fieldAnswers: Record<string, string>,
  postEventKeys: Set<string>,
): string {
  const allValues: Record<string, string> = { ...systemContext, ...fieldAnswers };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    if (postEventKeys.has(key)) {
      return POST_EVENT_PLACEHOLDER;
    }
    return allValues[key] ?? `{{${key}}}`;
  });
}

/**
 * Fill template HTML for the reservation phase.
 * Post-event placeholders show as italic styled markers instead of underlined values.
 */
export function fillAgreementForReservationHtml(
  template: string,
  systemContext: Record<string, string>,
  fieldAnswers: Record<string, string>,
  postEventKeys: Set<string>,
): string {
  const allValues: Record<string, string> = { ...systemContext, ...fieldAnswers };
  const escaped = escapeHtml(template);
  return escaped.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    if (postEventKeys.has(key)) {
      return `<em style="color: var(--text-muted); font-style: italic;">${POST_EVENT_PLACEHOLDER}</em>`;
    }
    const val = allValues[key];
    if (val) return `<u>${escapeHtml(val)}</u>`;
    return `{{${key}}}`;
  });
}

/**
 * Replace post-event placeholder markers in already-filled text with actual values.
 * Used when the board completes the post-event inspection.
 */
export function fillPostEventFields(
  filledText: string,
  postEventAnswers: Record<string, string>,
  postEventKeys: Set<string>,
  originalTemplate: string,
  systemContext: Record<string, string>,
  reservationAnswers: Record<string, string>,
): string {
  // Merge all answers: reservation + post-event
  const allValues: Record<string, string> = {
    ...systemContext,
    ...reservationAnswers,
    ...postEventAnswers,
  };
  // Re-fill from the original template with all values now available
  return originalTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    return allValues[key] ?? `{{${key}}}`;
  });
}
