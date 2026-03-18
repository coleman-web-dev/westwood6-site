'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueViolationNotice, queueViolationReportNotification } from '@/lib/email/queue';
import type { Community } from '@/lib/types/database';

/**
 * Queue a violation notice email to the head of household for the given unit.
 * Called from client components after creating a violation or recording a notice.
 */
export async function sendViolationNoticeEmail(
  communityId: string,
  communitySlug: string,
  unitId: string,
  violationTitle: string,
  category: string,
  severity: string,
  noticeType: string,
  description?: string,
) {
  // Verify caller is authenticated
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  // Verify caller belongs to this community
  const supabase = createAdminClient();
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member) {
    return { error: 'Not a member of this community' };
  }

  await queueViolationNotice(
    communityId,
    communitySlug,
    unitId,
    violationTitle,
    category,
    severity,
    noticeType,
    description,
  );

  return { success: true };
}

/**
 * Create in-app notifications for all household members of a unit
 * when a violation is created against that unit.
 */
export async function notifyHouseholdOfViolation(
  communityId: string,
  unitId: string,
  violationId: string,
  violationTitle: string,
  category: string,
) {
  // Verify caller is authenticated
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const supabase = createAdminClient();

  // Verify caller belongs to this community
  const { data: callerMember } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  // Get all members in the target unit
  const { data: householdMembers } = await supabase
    .from('members')
    .select('id')
    .eq('unit_id', unitId)
    .eq('is_approved', true);

  if (!householdMembers || householdMembers.length === 0) {
    return { success: true };
  }

  const categoryLabel =
    category.charAt(0).toUpperCase() + category.slice(1);

  const notifications = householdMembers.map((m) => ({
    community_id: communityId,
    member_id: m.id,
    type: 'violation_created' as const,
    title: 'Violation Reported',
    body: `${violationTitle} - ${categoryLabel}`,
    reference_id: violationId,
    reference_type: 'violation',
  }));

  await supabase.from('notifications').insert(notifications);

  return { success: true };
}

/**
 * Notify configured board members when a resident reports a violation.
 * Reads the community's violation_settings.report_notification_mode to determine recipients.
 * Creates in-app notifications and queues emails for each recipient.
 */
export async function notifyBoardOfViolationReport(
  communityId: string,
  communitySlug: string,
  violationId: string,
  violationTitle: string,
  category: string,
  severity: string,
  reporterName: string,
  description?: string,
  reportedLocation?: string,
  reportedUnitNumber?: string,
) {
  // Verify caller is authenticated
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const supabase = createAdminClient();

  // Verify caller belongs to this community
  const { data: callerMember } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  // Fetch community to get notification settings
  const { data: community } = await supabase
    .from('communities')
    .select('name, tenant_permissions')
    .eq('id', communityId)
    .single();

  if (!community) return { error: 'Community not found' };

  const settings = (community as unknown as Community).tenant_permissions?.violation_settings;
  const mode = settings?.report_notification_mode ?? 'all_board';

  if (mode === 'none') return { success: true };

  // Determine recipients
  let recipients: Array<{ id: string; email: string; first_name: string | null; last_name: string | null; display_name: string | null }>;

  if (mode === 'all_board') {
    const { data } = await supabase
      .from('members')
      .select('id, email, first_name, last_name, display_name')
      .eq('community_id', communityId)
      .in('system_role', ['board', 'manager', 'super_admin'])
      .eq('is_approved', true)
      .not('email', 'is', null);

    recipients = data || [];
  } else {
    // specific_members
    const memberIds = settings?.report_notification_member_ids ?? [];
    if (memberIds.length === 0) return { success: true };

    const { data } = await supabase
      .from('members')
      .select('id, email, first_name, last_name, display_name')
      .eq('community_id', communityId)
      .in('id', memberIds)
      .eq('is_approved', true)
      .not('email', 'is', null);

    recipients = data || [];
  }

  if (recipients.length === 0) return { success: true };

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  // Create in-app notifications
  const notifications = recipients.map((m) => ({
    community_id: communityId,
    member_id: m.id,
    type: 'violation_created' as const,
    title: 'New Violation Report',
    body: `${reporterName} reported: ${violationTitle} - ${categoryLabel}`,
    reference_id: violationId,
    reference_type: 'violation',
  }));

  await supabase.from('notifications').insert(notifications);

  // Queue emails for each recipient
  for (const recipient of recipients) {
    const recipientName = recipient.display_name ||
      [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') ||
      recipient.email;

    queueViolationReportNotification(
      communityId,
      communitySlug,
      recipient.id,
      recipient.email,
      recipientName,
      reporterName,
      violationTitle,
      category,
      severity,
      description,
      reportedLocation,
      reportedUnitNumber,
    ).catch(() => {
      // Fire-and-forget; in-app notification already sent
    });
  }

  return { success: true };
}
