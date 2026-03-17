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
export type DocVisibility = 'private' | 'community' | 'public';
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

// ─── Vendor Types ─────────────────────────────────────
export interface VendorCategoryRow {
  id: string;
  community_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_system: boolean;
  created_at: string;
}
export type VendorStatus = 'active' | 'inactive';
export type VendorDocumentType = 'contract' | 'insurance_cert' | 'license' | 'w9' | 'check_image' | 'other';

import type { LandingPageConfig, CommunityVendorsConfig } from './landing';

// ─── Community theme config ─────────────────────────

export interface LateFeeSettings {
  enabled: boolean;
  grace_period_days: number;
  fee_type: 'flat' | 'percent';
  fee_amount: number;
  max_fee?: number;
}

export interface ConvenienceFeeSettings {
  enabled: boolean;
  fee_percent: number; // e.g. 3.5 for 3.5%
  fee_fixed: number; // in cents, e.g. 30 for $0.30
  applies_to?: 'card' | 'ach' | 'all'; // which payment methods the fee applies to (default: 'all')
}

export interface PaymentSettings {
  allow_flexible_frequency: boolean;
  default_frequency: PaymentFrequency;
  late_fee_settings?: LateFeeSettings;
  convenience_fee_settings?: ConvenienceFeeSettings;
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

export interface VotingConfig {
  default_quorum_percent: number;
  election_notice_days: number;
  meeting_notice_days: number;
  proxy_voting_allowed: boolean;
  proxy_voting_for_elections: boolean;
  proxy_validity_days: number;
  secret_ballot_for_elections: boolean;
  amendment_approval_threshold: number;
  special_assessment_threshold: number;
  electronic_voting_allowed: boolean;
}

export const VOTING_CONFIG_DEFAULTS: VotingConfig = {
  default_quorum_percent: 30,
  election_notice_days: 60,
  meeting_notice_days: 14,
  proxy_voting_allowed: true,
  proxy_voting_for_elections: false,
  proxy_validity_days: 90,
  secret_ballot_for_elections: true,
  amendment_approval_threshold: 67,
  special_assessment_threshold: 67,
  electronic_voting_allowed: true,
};

export type EmailSendingMode = 'default' | 'custom_domain' | 'subdomain';

export interface EmailSettings {
  reply_to?: string;
  from_name?: string;
  primary_color?: string;
  sending_mode?: EmailSendingMode;
  subdomain_address?: string;
  inbox_enabled?: boolean;
}

export interface VendorSettings {
  insurance_reminder_days: number[];
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
  vendor_settings?: VendorSettings;
  check_settings?: import('./check').CheckSettings;
  role_templates?: import('./permissions').RoleTemplate[];
  estoppel_settings?: EstoppelSettings;
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
    can_report_violations: boolean;
    violation_settings?: {
      auto_escalation_enabled: boolean;
      default_deadline_days: number;
      escalation_notice_type: NoticeType;
    };
  };
  created_at: string;
  archived_at: string | null;
}

export interface Unit {
  id: string;
  community_id: string;
  unit_number: string;
  address: string | null;
  status: UnitStatus;
  payment_frequency: PaymentFrequency | null;
  preferred_billing_day: number | null;
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
  role_template_id: string | null;
  show_in_directory: boolean;
  is_approved: boolean;
  stripe_customer_id?: string | null;
  mailing_address_line1: string | null;
  mailing_address_line2: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  use_unit_address: boolean;
  created_at: string;
}

export interface MemberNote {
  id: string;
  member_id: string;
  community_id: string;
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EmailDomainStatus = 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure';

export interface CommunityEmailDomain {
  id: string;
  community_id: string;
  resend_domain_id: string;
  domain_name: string;
  domain_type: 'custom' | 'subdomain';
  status: EmailDomainStatus;
  dns_records: DnsRecord[];
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DnsRecord {
  record: 'SPF' | 'DKIM' | 'DMARC';
  name: string;
  value: string;
  type: 'MX' | 'TXT' | 'CNAME';
  ttl: string;
  status: 'pending' | 'verified' | 'failed' | 'temporary_failure' | 'not_started';
  priority?: number;
}

export type MailboxType = 'sending_only' | 'full_inbox';

export interface EmailAddress {
  id: string;
  community_id: string;
  domain_id: string;
  address: string;
  display_name: string | null;
  address_type: 'community' | 'role';
  role_label: string | null;
  assigned_to: string | null;
  forward_to: string | null;
  is_default: boolean;
  mailbox_type: MailboxType;
  created_at: string;
  updated_at: string;
}

// ─── Email Inbox Types ──────────────────────────────────

export interface EmailThread {
  id: string;
  community_id: string;
  email_address_id: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  is_archived: boolean;
  created_at: string;
}

export interface EmailThreadWithState extends EmailThread {
  is_read: boolean;
  is_starred: boolean;
  is_assigned: boolean;
  last_read_at: string | null;
  // Joined from latest inbox message for list preview
  latest_from_address?: string;
  latest_from_name?: string | null;
  latest_snippet?: string | null;
  has_attachments?: boolean;
}

export interface EmailInboxMessage {
  id: string;
  community_id: string;
  email_address_id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  thread_id: string | null;
  in_reply_to: string | null;
  message_id: string | null;
  has_attachments: boolean;
  resend_inbound_id: string | null;
  received_at: string;
  created_at: string;
}

export interface EmailThreadMember {
  id: string;
  thread_id: string;
  member_id: string;
  is_read: boolean;
  is_starred: boolean;
  is_assigned: boolean;
  last_read_at: string | null;
}

export interface EmailAttachment {
  id: string;
  inbox_message_id: string | null;
  sent_message_id: string | null;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

export interface EmailInboxAccess {
  id: string;
  community_id: string;
  email_address_id: string;
  member_id: string;
  can_read: boolean;
  can_reply: boolean;
  can_compose: boolean;
  notify_forward: boolean;
  created_at: string;
}

export interface EmailSentMessage {
  id: string;
  community_id: string;
  email_address_id: string;
  sender_member_id: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  body_html: string | null;
  body_text: string | null;
  thread_id: string | null;
  in_reply_to: string | null;
  message_id: string | null;
  resend_message_id: string | null;
  sent_at: string;
  created_at: string;
}

// Union type for messages in a thread view (inbound + outbound interleaved)
export interface EmailThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_html: string | null;
  body_text: string | null;
  has_attachments: boolean;
  attachments?: EmailAttachment[];
  timestamp: string; // received_at for inbound, sent_at for outbound
  sender_member_id?: string | null; // only for outbound
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

export interface DocumentFolder {
  id: string;
  community_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface Document {
  id: string;
  community_id: string;
  title: string;
  category: DocCategory;
  folder_id: string | null;
  file_path: string | null;
  file_size: number | null;
  is_public: boolean;
  visibility: DocVisibility;
  uploaded_by: string;
  vendor_document_id: string | null;
  signed_agreement_id: string | null;
  created_at: string;
  updated_at: string;
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
  violation_id: string | null;
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
export type AgreementFieldPhase = 'reservation' | 'post_event';
export type EstoppelFieldPhase = 'requester' | 'system' | 'board';
export type EstoppelRequestStatus = 'pending' | 'in_review' | 'completed' | 'cancelled';
export type EstoppelRequestType = 'standard' | 'expedited';

export interface EstoppelField {
  id: string;
  key: string;
  label: string;
  type: AgreementFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  fill_phase: EstoppelFieldPhase;
}

export interface EstoppelSettings {
  enabled: boolean;
  standard_fee: number;
  expedited_fee: number;
  expedited_fee_enabled?: boolean; // whether expedited option is offered (default: true for backward compat)
  delinquent_surcharge: number;
  delinquent_surcharge_enabled?: boolean; // whether delinquent surcharge is applied (default: true for backward compat)
  show_on_landing_page: boolean;
  template: string | null;
  fields: EstoppelField[];
  gl_revenue_account_code?: string;
}

export interface EstoppelRequest {
  id: string;
  community_id: string;
  requester_fields: Record<string, string>;
  system_fields: Record<string, string>;
  board_fields: Record<string, string>;
  unit_id: string | null;
  request_type: EstoppelRequestType;
  fee_amount: number;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  paid_at: string | null;
  status: EstoppelRequestStatus;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_by_title: string | null;
  completed_at: string | null;
  signature_name: string | null;
  delivery_email: string;
  pdf_path: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementField {
  id: string;
  key: string;
  label: string;
  type: AgreementFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  fill_phase?: AgreementFieldPhase; // defaults to 'reservation' if absent
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
  unit_id: string | null;
  reserved_by: string | null;
  start_datetime: string;
  end_datetime: string;
  status: ReservationStatus;
  purpose: string | null;
  guest_count: number | null;
  fee_amount: number;
  deposit_amount: number;
  stripe_payment_id: string | null;
  deposit_refunded: boolean;
  deposit_return_method: 'check' | 'wallet' | 'card' | null;
  deposit_refund_amount: number | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  deposit_stripe_session_id: string | null;
  deposit_stripe_payment_intent: string | null;
  admin_notes: string | null;
  created_at: string;
  // Manual reservation fields
  is_manual: boolean;
  manual_contact_name: string | null;
  manual_contact_phone: string | null;
  manual_contact_email: string | null;
  created_by: string | null;
  fee_paid: boolean;
  fee_paid_at: string | null;
  payment_method: string | null;
  check_number: string | null;
  board_note: string | null;
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
  show_on_announcements: boolean;
  is_pinned: boolean;
  notify_on_create: boolean;
  notify_roles: MemberRole[];
  rsvp_enabled: boolean;
  rsvp_fee: number;
  rsvp_fee_type: 'per_person' | 'flat';
  rsvp_max_capacity: number | null;
  rsvp_allow_cancellation: boolean;
  rsvp_cancellation_notice_hours: number | null;
  created_by: string;
  created_at: string;
}

export type EventRsvpStatus = 'confirmed' | 'cancelled' | 'pending_payment';

export interface EventRsvp {
  id: string;
  event_id: string;
  community_id: string;
  member_id: string;
  unit_id: string | null;
  guest_count: number;
  total_fee: number;
  status: EventRsvpStatus;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
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
  unit_id: string | null;
  signer_member_id: string | null;
  signer_name: string;
  filled_text: string;
  field_answers: Record<string, string>;
  signed_at: string;
  created_at: string;
  // Post-event inspection tracking
  post_event_completed: boolean;
  post_event_field_answers: Record<string, string> | null;
  post_event_completed_by: string | null;
  post_event_completed_at: string | null;
  // Paper agreement fields
  paper_agreement_path: string | null;
  is_paper: boolean;
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
  | 'proxy_granted'
  | 'violation_created'
  | 'arc_request_submitted'
  | 'maintenance_request_submitted'
  | 'payment_failed'
  | 'invoice_created'
  | 'arc_request_approved'
  | 'arc_request_denied'
  | 'maintenance_request_updated'
  | 'maintenance_request_completed'
  | 'deposit_returned';

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

export type EmailCategory = 'payment_confirmation' | 'payment_reminder' | 'announcement' | 'maintenance_update' | 'voting_notice' | 'reservation_update' | 'weekly_digest' | 'system' | 'violation_notice' | 'insurance_reminder_email' | 'event';
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
  compliance_deadline: string | null;
  auto_escalated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViolationTemplate {
  id: string;
  community_id: string;
  name: string;
  title: string;
  description: string | null;
  category: ViolationCategory;
  severity: ViolationSeverity;
  default_fine_amount: number | null;
  default_deadline_days: number | null;
  is_active: boolean;
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
  category_id: string;
  vendor_categories?: VendorCategoryRow;
  license_number: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  status: VendorStatus;
  tax_id: string | null;
  w9_on_file: boolean;
  w9_document_path: string | null;
  default_expense_account_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  document_folder_id: string | null;
  created_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  community_id: string;
  document_type: VendorDocumentType;
  title: string;
  file_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}
