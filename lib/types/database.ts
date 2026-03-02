// ─── Enums (matching migration.sql) ─────────────────

export type MemberRole = 'owner' | 'member' | 'tenant' | 'minor';
export type SystemRole = 'resident' | 'board' | 'manager' | 'super_admin';
export type UnitStatus = 'active' | 'inactive';
export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'waived' | 'voided';
export type ReservationStatus = 'pending' | 'approved' | 'denied' | 'cancelled';
export type BookingType = 'full_day' | 'time_slot';
export type EventVisibility = 'public' | 'private';
export type DocCategory = 'rules' | 'financial' | 'meeting_minutes' | 'forms' | 'other';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type SignupRequestStatus = 'pending' | 'approved' | 'denied';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

// ─── Community theme config ─────────────────────────

export interface PaymentSettings {
  allow_flexible_frequency: boolean;
  default_frequency: PaymentFrequency;
}

export interface CommunityTheme {
  dashboard_cards?: Partial<Record<MemberRole, string[]>>;
  payment_settings?: PaymentSettings;
  [key: string]: unknown;
}

// ─── Row types ──────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  theme: CommunityTheme;
  tenant_permissions: {
    can_reserve_amenities: boolean;
    can_attend_events: boolean;
    can_submit_requests: boolean;
    can_view_directory: boolean;
  };
  created_at: string;
}

export interface Unit {
  id: string;
  community_id: string;
  unit_number: string;
  address: string | null;
  status: UnitStatus;
  payment_frequency: PaymentFrequency | null;
  created_at: string;
}

export interface Member {
  id: string;
  unit_id: string | null;
  community_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  member_role: MemberRole;
  system_role: SystemRole;
  parent_member_id: string | null;
  show_in_directory: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface SignupRequest {
  id: string;
  community_id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  unit_number: string | null;
  status: SignupRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  community_id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  posted_by: string;
  created_at: string;
}

export interface Document {
  id: string;
  community_id: string;
  title: string;
  category: DocCategory;
  file_path: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  community_id: string;
  unit_id: string;
  submitted_by: string;
  title: string;
  description: string;
  status: RequestStatus;
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  community_id: string;
  unit_id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  paid_at: string | null;
  paid_by: string | null;
  stripe_payment_id: string | null;
  notes: string | null;
  bounced_from_invoice_id: string | null;
  assessment_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  unit_id: string;
  amount: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  paid_by: string;
  created_at: string;
}

export interface Amenity {
  id: string;
  community_id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  fee: number;
  deposit: number;
  rules_text: string | null;
  operating_hours: Record<string, { open: string; close: string }> | null;
  auto_approve: boolean;
  requires_payment: boolean;
  booking_type: BookingType;
  slot_duration_minutes: number | null;
  blocked_days: string[];
  active: boolean;
  created_at: string;
}

export interface BlockedDateRange {
  start_datetime: string;
  end_datetime: string;
  block_type: 'reservation' | 'event';
  event_title: string | null;
  event_description: string | null;
}

export interface Reservation {
  id: string;
  amenity_id: string;
  community_id: string;
  unit_id: string;
  reserved_by: string;
  start_datetime: string;
  end_datetime: string;
  status: ReservationStatus;
  purpose: string | null;
  guest_count: number | null;
  fee_amount: number;
  deposit_amount: number;
  stripe_payment_id: string | null;
  deposit_refunded: boolean;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  location: string | null;
  amenity_id: string | null;
  start_datetime: string;
  end_datetime: string;
  visibility: EventVisibility;
  blocks_amenity: boolean;
  created_by: string;
  created_at: string;
}

export type WalletTransactionType = 'overpayment' | 'manual_credit' | 'manual_debit' | 'payment_applied' | 'refund' | 'bounced_reversal';

export interface UnitWallet {
  id: string;
  unit_id: string;
  community_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  unit_id: string;
  community_id: string;
  member_id: string | null;
  amount: number;
  type: WalletTransactionType;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LedgerEntry {
  entry_date: string;
  entry_type: string;
  description: string;
  amount: number;
  running_balance: number;
  reference_id: string | null;
  member_name: string | null;
}

export interface Assessment {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  annual_amount: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  dashboard_layout: Record<string, unknown>;
  dismissed_tooltips: string[];
  created_at: string;
  updated_at: string;
}
