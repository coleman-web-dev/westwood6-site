'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueViolationNotice } from '@/lib/email/queue';

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
