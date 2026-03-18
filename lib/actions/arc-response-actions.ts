'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Post a response to an ARC request thread.
 * Both board members and residents (for their own unit's requests) can respond.
 */
export async function postArcResponse(
  communityId: string,
  arcRequestId: string,
  body: string,
  attachmentUrls: string[],
) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const supabase = createAdminClient();

  const { data: callerMember } = await supabase
    .from('members')
    .select('id, unit_id, system_role, first_name, last_name, email')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  const { data: arcRequest } = await supabase
    .from('arc_requests')
    .select('id, unit_id, title')
    .eq('id', arcRequestId)
    .eq('community_id', communityId)
    .single();

  if (!arcRequest) {
    return { error: 'ARC request not found' };
  }

  const isBoard = ['board', 'manager', 'super_admin'].includes(callerMember.system_role);

  if (!isBoard && arcRequest.unit_id !== callerMember.unit_id) {
    return { error: 'You do not have access to this ARC request' };
  }

  const { error: insertError } = await supabase
    .from('arc_responses')
    .insert({
      arc_request_id: arcRequestId,
      community_id: communityId,
      posted_by: callerMember.id,
      body: body.trim(),
      attachment_urls: attachmentUrls,
    });

  if (insertError) {
    return { error: 'Failed to post response' };
  }

  // Notify the other party
  const posterName =
    [callerMember.first_name, callerMember.last_name].filter(Boolean).join(' ') ||
    callerMember.email || 'A member';

  if (isBoard) {
    notifyHouseholdOfArcResponse(
      supabase,
      communityId,
      arcRequest.unit_id,
      arcRequestId,
      arcRequest.title,
      posterName,
    ).catch(() => {});
  } else {
    notifyBoardOfArcResponse(
      supabase,
      communityId,
      arcRequestId,
      arcRequest.title,
      posterName,
    ).catch(() => {});
  }

  return { success: true };
}

/**
 * Delete an ARC response. Allowed for the author or board members.
 */
export async function deleteArcResponse(
  communityId: string,
  responseId: string,
) {
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return { error: 'Authentication required' };
  }

  const supabase = createAdminClient();

  const { data: callerMember } = await supabase
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!callerMember) {
    return { error: 'Not a member of this community' };
  }

  const { data: response } = await supabase
    .from('arc_responses')
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
    .from('arc_responses')
    .delete()
    .eq('id', responseId);

  if (deleteError) {
    return { error: 'Failed to delete response' };
  }

  return { success: true };
}

// ─── Internal notification helpers ──────────────────────────

async function notifyHouseholdOfArcResponse(
  supabase: ReturnType<typeof createAdminClient>,
  communityId: string,
  unitId: string,
  arcRequestId: string,
  requestTitle: string,
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
    type: 'arc_request_submitted' as const,
    title: 'New Response on ARC Request',
    body: `${posterName} responded to: ${requestTitle}`,
    reference_id: arcRequestId,
    reference_type: 'arc_request',
  }));

  await supabase.from('notifications').insert(notifications);
}

async function notifyBoardOfArcResponse(
  supabase: ReturnType<typeof createAdminClient>,
  communityId: string,
  arcRequestId: string,
  requestTitle: string,
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
    type: 'arc_request_submitted' as const,
    title: 'Resident Responded to ARC Request',
    body: `${posterName} responded to: ${requestTitle}`,
    reference_id: arcRequestId,
    reference_type: 'arc_request',
  }));

  await supabase.from('notifications').insert(notifications);
}
