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
      .single();

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
