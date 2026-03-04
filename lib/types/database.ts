// ─── Enums (matching migration.sql) ─────────────────

export type MemberRole = 'owner' | 'member' | 'tenant' | 'minor';
export type SystemRole = 'resident' | 'board' | 'manager' | 'super_admin';
export type UnitStatus = 'active' | 'inactive';
export type RequestStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'waived' | 'voided';
export type ReservationStatus = 'pending' | 'approved' | 'denied' | 'cancelled';
export type BookingType = 'full_day' | 'time_slot' | 'both';
export type EventVisibility = 'public' | 'private';
export type DocCategory = 'rules' | 'financial' | 'meeting_minutes' | 'forms' | 'other';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type SignupRequestStatus = 'pending' | 'approved' | 'denied';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

// ─── Violation Enums ──────────────────────────────────
export type ViolationCategory = 'architectural' | 'noise' | 'parking' | 'maintenance' | 'pets' | 'trash' | 'other';
export type ViolationStatus = 'reported' | 'under_review' | 'notice_sent' | 'in_compliance' | 'escalated' | 'resolved' | 'dismissed';
export type ViolationSeverity = 'warning' | 'minor' | 'major' | 'critical';
export type NoticeType = 'courtesy' | 'first_notice' | 'second_notice' | 'final_notice' | 'hearing_notice';
export type DeliveryMethod = 'email' | 'mail' | 'both';

// ─── ARC Enums ────────────────────────────────────────
export type ArcProjectType = 'fence' | 'landscaping' | 'paint' | 'addition' | 'deck' | 'roof' | 'solar' | 'other';
export type ArcStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'approved_with_conditions' | 'denied';

// ─── Budget Enums ─────────────────────────────────────
export type BudgetCategory = 'dues' | 'assessments' | 'amenity_fees' | 'interest' | 'maintenance' | 'landscaping' | 'insurance' | 'utilities' | 'management' | 'legal' | 'reserves' | 'other';

// ─── Vendor Enums ─────────────────────────────────────
export type VendorCategory = 'landscaping' | 'plumbing' | 'electrical' | 'hvac' | 'painting' | 'roofing' | 'cleaning' | 'security' | 'general' | 'other';
export type VendorStatus = 'active' | 'inactive';

import type { LandingPageConfig, CommunityVendorsConfig } from './landing';

// ─── Community theme config ─────────────────────────

export interface LateFeeSettings {
  enabled: boolean;
  grace_period_days: number;
  fee_type: 'flat' | 'percent';
  fee_amount: number;
  max_fee?: number;
}

export interface PaymentSettings {
  allow_flexible_frequency: boolean;
  default_frequency: PaymentFrequency;
  late_fee_settings?: LateFeeSettings;
  auto_generate_invoices?: boolean;
  auto_mark_overdue?: boolean;
  auto_notify_new_invoices?: boolean;
  reminder_days_before?: number;
  reminder_days_after?: number;
}

export interface BulletinSettings {
  posting: 'board_only' | 'all_households';
  commenting: 'board_only' | 'all_households';
}

export interface EmailSettings {
  reply_to?: string;
  from_name?: string;
  primary_color?: string;
}

export interface OnboardingState {
  completed_steps: ('info' | 'units' | 'members' | 'assessments' | 'invites')[];
  completed_at: string | null;
}

export interface CommunityTheme {
  dashboard_cards?: Partial<Record<MemberRole, string[]>>;
  payment_settings?: PaymentSettings;
  voting_enabled?: boolean;
  bulletin_settings?: BulletinSettings;
  email_settings?: EmailSettings;
  onboarding?: OnboardingState;
  arc_enabled?: boolean;
  landing_page?: LandingPageConfig;
  vendors_config?: CommunityVendorsConfig;
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
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
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
  board_title: string | null;
  show_in_directory: boolean;
  is_approved: boolean;
  stripe_customer_id?: string | null;
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
  is_public: boolean;
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
  is_public: boolean;
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
  vendor_id: string | null;
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
  stripe_invoice_id?: string | null;
  notes: string | null;
  bounced_from_invoice_id: string | null;
  assessment_id: string | null;
  amount_paid: number;
  late_fee_amount: number;
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

export type AgreementFieldType = 'text' | 'number' | 'yes_no' | 'select' | 'date';

export interface AgreementField {
  id: string;
  key: string;
  label: string;
  type: AgreementFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Amenity {
  id: string;
  community_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  public_description: string | null;
  capacity: number | null;
  fee: number;
  deposit: number;
  rules_text: string | null;
  operating_hours: Record<string, { open: string; close: string }> | null;
  auto_approve: boolean;
  requires_payment: boolean;
  reservable: boolean;
  booking_type: BookingType;
  slot_duration_minutes: number | null;
  min_booking_minutes: number | null;
  max_booking_minutes: number | null;
  blocked_days: string[];
  active: boolean;
  agreement_enabled: boolean;
  agreement_template: string | null;
  agreement_fields: AgreementField[];
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
  deposit_return_method: 'check' | 'wallet' | null;
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

export type WalletTransactionType = 'overpayment' | 'manual_credit' | 'manual_debit' | 'payment_applied' | 'refund' | 'bounced_reversal' | 'deposit_return' | 'stripe_payment';

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

export type AssessmentType = 'regular' | 'special';

export interface Assessment {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  annual_amount: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  is_active: boolean;
  type: AssessmentType;
  installments: number | null;
  installment_start_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SignedAgreement {
  id: string;
  reservation_id: string;
  amenity_id: string;
  community_id: string;
  unit_id: string;
  signer_member_id: string;
  signer_name: string;
  filled_text: string;
  field_answers: Record<string, string>;
  signed_at: string;
  created_at: string;
}

export type NotificationType =
  | 'agreement_signed'
  | 'reservation_created'
  | 'reservation_approved'
  | 'reservation_denied'
  | 'general'
  | 'ballot_created'
  | 'ballot_opened'
  | 'ballot_reminder'
  | 'ballot_closed'
  | 'ballot_results'
  | 'proxy_requested'
  | 'proxy_granted';

export interface Notification {
  id: string;
  community_id: string;
  member_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  read: boolean;
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

// ─── Voting Enums ──────────────────────────────────────

export type BallotStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'certified' | 'cancelled';
export type BallotType = 'board_election' | 'budget_approval' | 'amendment' | 'special_assessment' | 'recall' | 'general';
export type BallotTallyMethod = 'plurality' | 'yes_no' | 'yes_no_abstain' | 'multi_select';
export type ProxyStatus = 'pending' | 'active' | 'revoked' | 'expired';

// ─── Voting Row Types ──────────────────────────────────

export interface Ballot {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  ballot_type: BallotType;
  tally_method: BallotTallyMethod;
  is_secret_ballot: boolean;
  quorum_threshold: number;
  approval_threshold: number | null;
  max_selections: number;
  notice_sent_at: string | null;
  opens_at: string;
  closes_at: string;
  status: BallotStatus;
  certified_at: string | null;
  certified_by: string | null;
  results_published: boolean;
  results_published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BallotOption {
  id: string;
  ballot_id: string;
  label: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export interface BallotEligibility {
  id: string;
  ballot_id: string;
  unit_id: string;
  member_id: string;
  has_voted: boolean;
  voted_at: string | null;
  voted_by_proxy: boolean;
  proxy_member_id: string | null;
  created_at: string;
}

export interface BallotVote {
  id: string;
  ballot_id: string;
  unit_id: string;
  option_id: string;
  cast_by_member_id: string;
  created_at: string;
}

export interface BallotResultCache {
  id: string;
  ballot_id: string;
  option_id: string;
  vote_count: number;
  vote_percentage: number;
  is_winner: boolean;
  created_at: string;
}

export interface ProxyAuthorization {
  id: string;
  community_id: string;
  grantor_unit_id: string;
  grantor_member_id: string;
  grantee_member_id: string;
  ballot_id: string | null;
  status: ProxyStatus;
  authorized_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface QuorumStatus {
  total_eligible: number;
  total_voted: number;
  participation_rate: number;
  quorum_threshold: number;
  quorum_met: boolean;
}

// ─── Bulletin Board ────────────────────────────────

export interface BulletinPost {
  id: string;
  community_id: string;
  title: string;
  body: string;
  posted_by: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'member_role'>;
  comment_count?: number;
}

export interface BulletinComment {
  id: string;
  post_id: string;
  community_id: string;
  body: string;
  posted_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Pick<Member, 'id' | 'first_name' | 'last_name' | 'member_role'>;
}

// ─── Email System ─────────────────────────────────

export type EmailCategory = 'payment_confirmation' | 'payment_reminder' | 'announcement' | 'maintenance_update' | 'voting_notice' | 'reservation_update' | 'weekly_digest' | 'system' | 'violation_notice';
export type EmailStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'bounced';
export type EmailPriority = 'immediate' | 'normal' | 'scheduled';

export interface EmailPreference {
  id: string;
  member_id: string;
  community_id: string;
  category: EmailCategory;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailQueueItem {
  id: string;
  community_id: string;
  recipient_member_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  category: EmailCategory;
  priority: EmailPriority;
  subject: string;
  template_id: string;
  template_data: Record<string, unknown>;
  status: EmailStatus;
  resend_message_id: string | null;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  sent_at: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  community_id: string;
  queue_id: string | null;
  recipient_email: string;
  category: EmailCategory;
  subject: string;
  resend_message_id: string | null;
  status: EmailStatus;
  error_message: string | null;
  created_at: string;
}

// ─── Violations ─────────────────────────────────────

export interface Violation {
  id: string;
  community_id: string;
  unit_id: string;
  reported_by: string | null;
  category: ViolationCategory;
  title: string;
  description: string | null;
  photo_urls: string[];
  status: ViolationStatus;
  severity: ViolationSeverity;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViolationNotice {
  id: string;
  violation_id: string;
  notice_type: NoticeType;
  sent_at: string;
  sent_by: string | null;
  delivery_method: DeliveryMethod;
  notes: string | null;
  created_at: string;
}

// ─── ARC Requests ───────────────────────────────────

export interface ArcRequest {
  id: string;
  community_id: string;
  unit_id: string;
  submitted_by: string;
  title: string;
  description: string | null;
  project_type: ArcProjectType;
  estimated_cost: number | null;
  photo_urls: string[];
  status: ArcStatus;
  conditions: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Budgets ────────────────────────────────────────

export interface Budget {
  id: string;
  community_id: string;
  fiscal_year: number;
  total_income: number;
  total_expense: number;
  reserve_contribution: number;
  created_by: string | null;
  created_at: string;
}

export interface BudgetLineItem {
  id: string;
  budget_id: string;
  category: BudgetCategory;
  name: string;
  budgeted_amount: number;
  actual_amount: number;
  is_income: boolean;
  notes: string | null;
  created_at: string;
}

// ─── Accounting (re-exported from accounting.ts) ────
export type {
  AccountType,
  AccountFund,
  JournalSource,
  JournalStatus,
  Account,
  JournalEntry,
  JournalLine,
  FiscalPeriod,
} from './accounting';

// ─── Vendors ────────────────────────────────────────

export interface Vendor {
  id: string;
  community_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  category: VendorCategory;
  license_number: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  status: VendorStatus;
  created_at: string;
}
