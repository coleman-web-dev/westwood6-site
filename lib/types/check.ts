import type { Account } from './accounting';
import type { Vendor } from './database';

// ─── Check Enums ────────────────────────────────────────────────────

export type CheckStatus = 'draft' | 'pending_approval' | 'approved' | 'printed' | 'voided' | 'cleared';

// ─── Row Types ──────────────────────────────────────────────────────

export interface Check {
  id: string;
  community_id: string;
  check_number: number;
  check_sequence_id: string;
  date: string;
  amount: number; // cents
  payee_vendor_id: string | null;
  payee_name: string;
  memo: string | null;
  expense_account_id: string;
  bank_account_id: string;
  status: CheckStatus;
  created_by: string | null;
  printed_at: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  journal_entry_id: string | null;
  bank_transaction_id: string | null;
  check_image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckApproval {
  id: string;
  check_id: string;
  signer_member_id: string;
  status: 'pending' | 'approved' | 'rejected';
  signature_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface CheckSignature {
  id: string;
  community_id: string;
  member_id: string;
  file_path: string;
  is_active: boolean;
  created_at: string;
}

export interface CheckNumberSequence {
  id: string;
  community_id: string;
  plaid_bank_account_id: string | null;
  bank_account_label: string;
  next_check_number: number;
  prefix: string | null;
  created_at: string;
}

// ─── Extended Types for UI ──────────────────────────────────────────

export interface CheckWithDetails extends Check {
  vendor?: Pick<Vendor, 'id' | 'name' | 'company'> | null;
  expense_account?: Pick<Account, 'code' | 'name'> | null;
  bank_account?: Pick<Account, 'code' | 'name'> | null;
  approvals?: CheckApprovalWithSigner[];
}

export interface CheckApprovalWithSigner extends CheckApproval {
  signer: { id: string; name: string; email: string | null };
}

export interface CheckSettings {
  signatures_required: number;
  designated_signers: string[]; // member IDs
  auto_approve_under: number | null; // amount in cents, checks below this skip approval
}

export type CheckPosition = 'top' | 'middle' | 'bottom';

/** Position of a single check field in inches from top-left of check section */
export interface CheckFieldLayout {
  top: number;        // inches from top of check section
  left: number;       // inches from left edge of page
  showLine: boolean;  // whether to render underline/border for this field
  fontSize?: number;  // font size in pt (defaults vary by field type)
  visible?: boolean;  // whether to include when printing (default true)
}

export type CheckFieldId =
  | 'payerName' | 'payerAddress1' | 'payerAddress2'
  | 'checkNumber' | 'date'
  | 'payTo' | 'amountBox' | 'amountWords'
  | 'memo' | 'signatureLine';

export interface CheckPrintSettings {
  /** Where the check is on the page: top, middle, or bottom third */
  check_position: CheckPosition;
  /** Horizontal offset in inches (legacy, ignored when field_positions exists) */
  offset_x: number;
  /** Vertical offset in inches (legacy, ignored when field_positions exists) */
  offset_y: number;
  /** Community/HOA name printed on the check */
  payer_name: string;
  /** Payer address line 1 */
  payer_address_line1: string;
  /** Payer address line 2 (city, state, zip) */
  payer_address_line2: string;
  /** Per-field position overrides. When present, offset_x/offset_y are ignored */
  field_positions?: Record<CheckFieldId, CheckFieldLayout>;
  /** Supabase storage path for uploaded blank check image (editor background) */
  check_stock_image?: string;
}

// ─── Form Types ─────────────────────────────────────────────────────

export interface WriteCheckFormData {
  payeeVendorId: string | null;
  payeeName: string;
  amount: number; // dollars (converted to cents on submit)
  date: string;
  memo: string;
  expenseAccountId: string;
  bankAccountId: string;
  checkSequenceId: string;
}
