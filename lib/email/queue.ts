import { createAdminClient } from '@/lib/supabase/admin';
import { buildUnsubscribeUrl } from './unsubscribe';
import type { EmailCategory, EmailPriority } from '@/lib/types/database';

interface QueueEmailParams {
  communityId: string;
  recipientMemberId?: string;
  recipientEmail: string;
  recipientName?: string;
  category: EmailCategory;
  priority?: EmailPriority;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
  scheduledFor?: string;
}

/**
 * Queue a single email for sending.
 * Checks email preferences before queuing (skips if member opted out).
 */
export async function queueEmail(params: QueueEmailParams) {
  const supabase = createAdminClient();

  // Check preferences if member ID is provided
  if (params.recipientMemberId && params.category !== 'system') {
    const { data: pref } = await supabase
      .from('email_preferences')
      .select('enabled')
      .eq('member_id', params.recipientMemberId)
      .eq('category', params.category)
      .maybeSingle();

    if (pref && !pref.enabled) {
      return null; // Member opted out
    }
  }

  const { data, error } = await supabase
    .from('email_queue')
    .insert({
      community_id: params.communityId,
      recipient_member_id: params.recipientMemberId || null,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      category: params.category,
      priority: params.priority || 'normal',
      subject: params.subject,
      template_id: params.templateId,
      template_data: params.templateData,
      scheduled_for: params.scheduledFor || new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to queue email:', error);
    throw error;
  }

  return data;
}

/**
 * Queue emails for multiple recipients.
 */
export async function queueBulkEmails(items: QueueEmailParams[]) {
  const supabase = createAdminClient();

  // Get opted-out members in bulk
  const memberIds = items
    .filter((i) => i.recipientMemberId && i.category !== 'system')
    .map((i) => i.recipientMemberId as string);

  let optedOut = new Set<string>();
  if (memberIds.length > 0) {
    const categories = [...new Set(items.map((i) => i.category))];
    const { data: prefs } = await supabase
      .from('email_preferences')
      .select('member_id, category')
      .in('member_id', memberIds)
      .in('category', categories)
      .eq('enabled', false);

    if (prefs) {
      optedOut = new Set(prefs.map((p) => `${p.member_id}:${p.category}`));
    }
  }

  // Filter out opted-out members and build insert batch
  const rows = items
    .filter((item) => {
      if (item.recipientMemberId && item.category !== 'system') {
        return !optedOut.has(`${item.recipientMemberId}:${item.category}`);
      }
      return true;
    })
    .map((item) => ({
      community_id: item.communityId,
      recipient_member_id: item.recipientMemberId || null,
      recipient_email: item.recipientEmail,
      recipient_name: item.recipientName || null,
      category: item.category,
      priority: item.priority || 'normal',
      subject: item.subject,
      template_id: item.templateId,
      template_data: item.templateData,
      scheduled_for: item.scheduledFor || new Date().toISOString(),
    }));

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('email_queue')
    .insert(rows)
    .select('id');

  if (error) {
    console.error('Failed to queue bulk emails:', error);
    throw error;
  }

  return data;
}

/**
 * Queue announcement notification emails for all community members with email addresses.
 */
export async function queueAnnouncementNotification(
  communityId: string,
  communitySlug: string,
  title: string,
  body: string,
  priority: string
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  // Get community name
  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Get all approved members with email
  const { data: members } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('community_id', communityId)
    .eq('is_approved', true)
    .not('email', 'is', null);

  if (!members || members.length === 0) return;

  const items: QueueEmailParams[] = members.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'announcement' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `${community?.name || 'Your Community'}: ${title}`,
    templateId: 'announcement',
    templateData: {
      communityName: community?.name || 'Your Community',
      title,
      body,
      priority,
      dashboardUrl: `${baseUrl}/${communitySlug}/announcements`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'announcement', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}

/**
 * Queue welcome invite email for a single member.
 */
export async function queueWelcomeInvite(
  communityId: string,
  communitySlug: string,
  communityName: string,
  memberEmail: string,
  memberName: string,
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
  const signupUrl = `${baseUrl}/${communitySlug}?invite=true&email=${encodeURIComponent(memberEmail)}`;

  return queueEmail({
    communityId,
    recipientEmail: memberEmail,
    recipientName: memberName,
    category: 'system',
    priority: 'immediate',
    subject: `Welcome to ${communityName} on DuesIQ`,
    templateId: 'welcome-invite',
    templateData: {
      communityName,
      memberName,
      signupUrl,
    },
  });
}

/**
 * Queue payment confirmation emails for all members of a unit.
 */
export async function queuePaymentConfirmation(
  communityId: string,
  communitySlug: string,
  unitId: string,
  invoiceTitle: string,
  amount: number,
  paidAt: string,
  paymentDescription?: string,
) {
  const supabase = createAdminClient();

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Get wallet balance
  const { data: wallet } = await supabase
    .from('unit_wallets')
    .select('balance')
    .eq('unit_id', unitId)
    .single();

  // Get all members of this unit with email
  const { data: members } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('unit_id', unitId)
    .eq('is_approved', true)
    .not('email', 'is', null);

  if (!members || members.length === 0) return;

  const communityName = community?.name || 'Your Community';

  const items: QueueEmailParams[] = members.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'payment_confirmation' as EmailCategory,
    priority: 'immediate' as EmailPriority,
    subject: `Payment Received: ${invoiceTitle}`,
    templateId: 'payment-confirmation',
    templateData: {
      communityName,
      invoiceTitle,
      amount,
      paidAt,
      walletBalance: wallet?.balance || 0,
      paymentDescription: paymentDescription || `$${(amount / 100).toFixed(2)} paid`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'payment_confirmation', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}

/**
 * Queue a payment reminder email for the head-of-household of a unit.
 */
export async function queuePaymentReminder(
  communityId: string,
  communitySlug: string,
  invoiceId: string,
  invoiceTitle: string,
  invoiceAmount: number,
  invoiceDueDate: string,
  isOverdue: boolean,
  unitId: string,
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Find the head of household (owner, no parent, has email)
  const { data: owner } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('unit_id', unitId)
    .eq('member_role', 'owner')
    .is('parent_member_id', null)
    .not('email', 'is', null)
    .limit(1)
    .single();

  if (!owner || !owner.email) return null;

  const communityName = community?.name || 'Your Community';
  const formattedAmount = `$${(invoiceAmount / 100).toFixed(2)}`;
  const formattedDate = new Date(invoiceDueDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return queueEmail({
    communityId,
    recipientMemberId: owner.id,
    recipientEmail: owner.email,
    recipientName: `${owner.first_name} ${owner.last_name}`,
    category: 'payment_reminder' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: isOverdue
      ? `Overdue: ${invoiceTitle} - ${formattedAmount}`
      : `Reminder: ${invoiceTitle} due ${formattedDate}`,
    templateId: 'payment-reminder',
    templateData: {
      communityName,
      invoiceTitle,
      invoiceId,
      amount: invoiceAmount,
      dueDate: invoiceDueDate,
      isOverdue,
      paymentUrl: `${baseUrl}/${communitySlug}/payments`,
      unsubscribeUrl: buildUnsubscribeUrl(owner.id, 'payment_reminder', communitySlug),
    },
  });
}

/**
 * Queue vendor insurance expiry reminder emails for all board members of a community.
 */
export async function queueVendorInsuranceReminder(
  communityId: string,
  communitySlug: string,
  vendorId: string,
  vendorName: string,
  vendorCompany: string | null,
  insuranceExpiry: string,
  daysUntilExpiry: number,
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Get all board members with email
  const { data: boardMembers } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('community_id', communityId)
    .eq('is_approved', true)
    .in('system_role', ['board', 'manager', 'super_admin'])
    .not('email', 'is', null);

  if (!boardMembers || boardMembers.length === 0) return;

  const communityName = community?.name || 'Your Community';
  const isExpired = daysUntilExpiry <= 0;
  const urgencyLabel = isExpired ? 'Expired' : daysUntilExpiry <= 7 ? 'Expiring Soon' : 'Upcoming Expiry';

  const items: QueueEmailParams[] = boardMembers.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'insurance_reminder_email' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `Vendor Insurance ${urgencyLabel}: ${vendorName}`,
    templateId: 'vendor-insurance-reminder',
    templateData: {
      communityName,
      vendorName,
      vendorCompany,
      vendorId,
      insuranceExpiry,
      daysUntilExpiry,
      vendorDetailUrl: `${baseUrl}/${communitySlug}/vendors`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'insurance_reminder_email', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}

/**
 * Queue event notification emails for community members with selected roles.
 */
export async function queueEventNotification(
  communityId: string,
  communitySlug: string,
  title: string,
  description: string,
  location: string,
  startDatetime: string,
  endDatetime: string,
  notifyRoles: string[],
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Get approved members with matching roles and email
  const { data: members } = await supabase
    .from('members')
    .select('id, email, first_name, last_name, member_role')
    .eq('community_id', communityId)
    .eq('is_approved', true)
    .in('member_role', notifyRoles)
    .not('email', 'is', null);

  if (!members || members.length === 0) return;

  const communityName = community?.name || 'Your Community';

  // Format dates for email display
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const startDate = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const items: QueueEmailParams[] = members.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'event' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `${communityName}: ${title}`,
    templateId: 'event-notification',
    templateData: {
      communityName,
      title,
      description,
      location,
      startDate,
      startTime,
      endTime,
      dashboardUrl: `${baseUrl}/${communitySlug}/events`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'event', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}

/**
 * Queue reservation notification emails to all board members.
 */
export async function queueReservationBoardNotification(
  communityId: string,
  communitySlug: string,
  amenityName: string,
  memberName: string,
  unitNumber: string,
  startDatetime: string,
  endDatetime: string,
  purpose: string | null,
  guestCount: number | null,
  feeAmount: number,
  depositAmount: number,
  status: 'pending' | 'approved',
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Get board/manager/super_admin members
  const { data: boardMembers } = await supabase
    .from('members')
    .select('id, email, first_name, last_name, system_role')
    .eq('community_id', communityId)
    .eq('is_approved', true)
    .in('system_role', ['board', 'manager', 'super_admin'])
    .not('email', 'is', null);

  if (!boardMembers || boardMembers.length === 0) return;

  const communityName = community?.name || 'Your Community';

  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const isFullDay = end.getTime() - start.getTime() >= 23 * 60 * 60 * 1000;

  const date = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const fee = feeAmount > 0 ? `$${(feeAmount / 100).toFixed(2)}` : '$0.00';
  const deposit = depositAmount > 0 ? `$${(depositAmount / 100).toFixed(2)}` : '$0.00';

  const items: QueueEmailParams[] = boardMembers.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'reservation_update' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: status === 'pending'
      ? `${communityName}: New ${amenityName} reservation request`
      : `${communityName}: New ${amenityName} reservation`,
    templateId: 'reservation-board-notification',
    templateData: {
      communityName,
      amenityName,
      memberName,
      unitNumber,
      date,
      startTime: isFullDay ? 'Full day' : startTime,
      endTime: isFullDay ? '' : endTime,
      purpose: purpose || undefined,
      guestCount: guestCount?.toString() || undefined,
      fee,
      deposit,
      status,
      dashboardUrl: `${baseUrl}/${communitySlug}/amenities`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'reservation_update', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}

/**
 * Queue a violation notice email for the head-of-household of the affected unit.
 */
export async function queueViolationNotice(
  communityId: string,
  communitySlug: string,
  unitId: string,
  violationTitle: string,
  category: string,
  severity: string,
  noticeType: string,
  description?: string,
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  // Find head of household
  const { data: owner } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('unit_id', unitId)
    .eq('member_role', 'owner')
    .is('parent_member_id', null)
    .not('email', 'is', null)
    .limit(1)
    .single();

  if (!owner || !owner.email) return null;

  const communityName = community?.name || 'Your Community';
  const noticeLabel = noticeType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return queueEmail({
    communityId,
    recipientMemberId: owner.id,
    recipientEmail: owner.email,
    recipientName: `${owner.first_name} ${owner.last_name}`,
    category: 'violation_notice' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `${noticeLabel}: ${violationTitle}`,
    templateId: 'violation-notice',
    templateData: {
      communityName,
      violationTitle,
      category,
      severity,
      noticeType,
      description,
      dashboardUrl: `${baseUrl}/${communitySlug}/violations`,
      unsubscribeUrl: buildUnsubscribeUrl(owner.id, 'violation_notice', communitySlug),
    },
  });
}

/**
 * Queue a violation report notification email to a specific board member.
 * Called when a resident reports a violation and the community has notification routing configured.
 */
export async function queueViolationReportNotification(
  communityId: string,
  communitySlug: string,
  recipientMemberId: string,
  recipientEmail: string,
  recipientName: string,
  reporterName: string,
  violationTitle: string,
  category: string,
  severity: string,
  description?: string,
  reportedLocation?: string,
  reportedUnitNumber?: string,
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  const communityName = community?.name || 'Your Community';

  return queueEmail({
    communityId,
    recipientMemberId,
    recipientEmail,
    recipientName,
    category: 'violation_notice' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `Violation Report: ${violationTitle}`,
    templateId: 'violation-report-notification',
    templateData: {
      communityName,
      reporterName,
      violationTitle,
      category,
      severity,
      description,
      reportedLocation,
      reportedUnitNumber,
      dashboardUrl: `${baseUrl}/${communitySlug}/violations`,
      unsubscribeUrl: buildUnsubscribeUrl(recipientMemberId, 'violation_notice', communitySlug),
    },
  });
}

/**
 * Queue ballot notification emails for all community members.
 * Variants: 'opened' (voting started), 'closed' (voting ended), 'results_published'.
 */
export async function queueBallotNotification(
  communityId: string,
  communitySlug: string,
  ballotTitle: string,
  ballotType: string,
  variant: 'opened' | 'closed' | 'results_published',
  closesAt?: string,
) {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

  const { data: community } = await supabase
    .from('communities')
    .select('name')
    .eq('id', communityId)
    .single();

  const { data: members } = await supabase
    .from('members')
    .select('id, email, first_name, last_name')
    .eq('community_id', communityId)
    .eq('is_approved', true)
    .not('email', 'is', null);

  if (!members || members.length === 0) return;

  const communityName = community?.name || 'Your Community';

  const VARIANT_SUBJECTS: Record<string, string> = {
    opened: `Voting Open: ${ballotTitle}`,
    closed: `Voting Closed: ${ballotTitle}`,
    results_published: `Results Available: ${ballotTitle}`,
  };

  const formattedClosesAt = closesAt
    ? new Date(closesAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : undefined;

  const ballotTypeLabel = ballotType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const items: QueueEmailParams[] = members.map((m) => ({
    communityId,
    recipientMemberId: m.id,
    recipientEmail: m.email!,
    recipientName: `${m.first_name} ${m.last_name}`,
    category: 'voting_notice' as EmailCategory,
    priority: 'normal' as EmailPriority,
    subject: `${communityName}: ${VARIANT_SUBJECTS[variant]}`,
    templateId: 'ballot-notification',
    templateData: {
      communityName,
      ballotTitle,
      ballotType: ballotTypeLabel,
      variant,
      closesAt: formattedClosesAt,
      dashboardUrl: `${baseUrl}/${communitySlug}/voting`,
      unsubscribeUrl: buildUnsubscribeUrl(m.id, 'voting_notice', communitySlug),
    },
  }));

  return queueBulkEmails(items);
}
