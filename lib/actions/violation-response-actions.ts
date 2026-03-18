'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Post a response to a violation thread.
 * Both board members and residents (for their own unit's violations) can respond.
 * Creates in-app notifications for the other party.
 */
export async function postViolationResponse(
  communityId: string,
  violationId: string,
  body: string,
  attachmentUrls: string[],
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

  // Verify caller belongs to this community and get their member record
  const { data: callerMember } = await supabase
    .from('members')
    .select('id, unit_id, system_role, first_name, last_name, email')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  // Fetch the violation to verify access
  const { data: violation } = await supabase
    .from('violations')
    .select('id, unit_id, title, category')
    .eq('id', violationId)
    .eq('community_id', communityId)
    .single();

  if (!violation) {
    return { error: 'Violation not found' };
  }

  const isBoard = ['board', 'manager', 'super_admin'].includes(callerMember.system_role);

  // Residents can only respond to violations on their own unit
  if (!isBoard && violation.unit_id !== callerMember.unit_id) {
    return { error: 'You do not have access to this violation' };
  }

  // Insert the response
  const { error: insertError } = await supabase
    .from('violation_responses')
    .insert({
      violation_id: violationId,
      community_id: communityId,
      posted_by: callerMember.id,
      body: body.trim(),
      attachment_urls: attachmentUrls,
    });

  if (insertError) {
    return { error: 'Failed to post response' };
  }

  // Fire-and-forget: create notifications for the other party
  const posterName =
    [callerMember.first_name, callerMember.last_name].filter(Boolean).join(' ') ||
    callerMember.email || 'A member';

  if (isBoard) {
    // Board posted: notify household members of the violation's unit
    notifyHouseholdOfResponse(
      supabase,
      communityId,
      violation.unit_id,
      violationId,
      violation.title,
      posterName,
    ).catch(() => {});
  } else {
    // Resident posted: notify board members
    notifyBoardOfResponse(
      supabase,
      communityId,
      violationId,
      violation.title,
      posterName,
    ).catch(() => {});
  }

  return { success: true };
}

/**
 * Delete a violation response. Allowed for the author or board members.
 */
export async function deleteViolationResponse(
  communityId: string,
  responseId: string,
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
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  // Fetch the response
  const { data: response } = await supabase
    .from('violation_responses')
    .select('id, posted_by')
    .eq('id', responseId)
    .eq('community_id', communityId)
    .single();

  if (!response) {
    return { error: 'Response not found' };
  }

  const isBoard = ['board', 'manager', 'super_admin'].includes(callerMember.system_role);
  const isAuthor = response.posted_by === callerMember.id;

  if (!isBoard && !isAuthor) {
    return { error: 'You do not have permission to delete this response' };
  }

  const { error: deleteError } = await supabase
    .from('violation_responses')
    .delete()
    .eq('id', responseId);

  if (deleteError) {
    return { error: 'Failed to delete response' };
  }

  return { success: true };
}

// ─── Internal notification helpers ──────────────────────────

async function notifyHouseholdOfResponse(
  supabase: ReturnType<typeof createAdminClient>,
  communityId: string,
  unitId: string,
  violationId: string,
  violationTitle: string,
  posterName: string,
) {
  const { data: householdMembers } = await supabase
    .from('members')
    .select('id')
    .eq('unit_id', unitId)
    .eq('is_approved', true);

  if (!householdMembers || householdMembers.length === 0) return;

  const notifications = householdMembers.map((m) => ({
    community_id: communityId,
    member_id: m.id,
    type: 'violation_response' as const,
    title: 'New Response on Violation',
    body: `${posterName} responded to: ${violationTitle}`,
    reference_id: violationId,
    reference_type: 'violation',
  }));

  await supabase.from('notifications').insert(notifications);
}

async function notifyBoardOfResponse(
  supabase: ReturnType<typeof createAdminClient>,
  communityId: string,
  violationId: string,
  violationTitle: string,
  posterName: string,
) {
  const { data: boardMembers } = await supabase
    .from('members')
    .select('id')
    .eq('community_id', communityId)
    .in('system_role', ['board', 'manager', 'super_admin'])
    .eq('is_approved', true);

  if (!boardMembers || boardMembers.length === 0) return;

  const notifications = boardMembers.map((m) => ({
    community_id: communityId,
    member_id: m.id,
    type: 'violation_response' as const,
    title: 'Resident Responded to Violation',
    body: `${posterName} responded to: ${violationTitle}`,
    reference_id: violationId,
    reference_type: 'violation',
  }));

  await supabase.from('notifications').insert(notifications);
}
