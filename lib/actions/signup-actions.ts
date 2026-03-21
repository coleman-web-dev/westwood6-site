'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { queueEmail } from '@/lib/email/queue';

/**
 * Require the caller to be an authenticated board member in the given community.
 * Returns the caller's user id and member record, or throws.
 */
async function requireBoardAuth(communityId: string) {
  const { createClient } = await import('@/lib/supabase/server');
  const userClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    throw new Error('Authentication required.');
  }

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from('members')
    .select('id, system_role, first_name, last_name')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (
    !caller ||
    !['board', 'manager', 'super_admin'].includes(caller.system_role)
  ) {
    throw new Error('Board access required.');
  }

  return { user, caller, supabase };
}

/**
 * Approve a signup request: create a member record, link to the unit if
 * provided, and send a welcome email.
 */
export async function approveSignupRequest(
  requestId: string,
  unitId: string | null,
  memberRole: 'owner' | 'member' | 'tenant' = 'member',
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Fetch the request
  const { data: request, error: reqErr } = await admin
    .from('signup_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !request) {
    return { success: false, error: 'Signup request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request has already been ${request.status}.` };
  }

  // Auth check
  let user, caller;
  try {
    ({ user, caller } = await requireBoardAuth(request.community_id));
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  // Get community info
  const { data: community } = await admin
    .from('communities')
    .select('name, slug')
    .eq('id', request.community_id)
    .single();

  // Create member record
  const { error: memberErr } = await admin.from('members').insert({
    community_id: request.community_id,
    user_id: request.user_id,
    unit_id: unitId,
    email: request.email,
    first_name: request.first_name,
    last_name: request.last_name,
    phone: request.phone,
    member_role: memberRole,
    system_role: 'resident',
    is_approved: true,
  });

  if (memberErr) {
    console.error('Failed to create member:', memberErr);
    return { success: false, error: 'Failed to create member account.' };
  }

  // Update signup request status
  await admin
    .from('signup_requests')
    .update({
      status: 'approved',
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  // Queue welcome email
  if (community) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
    await queueEmail({
      communityId: request.community_id,
      recipientEmail: request.email,
      recipientName: `${request.first_name} ${request.last_name}`,
      category: 'system',
      priority: 'immediate',
      subject: `Welcome to ${community.name}`,
      templateId: 'signup-approved',
      templateData: {
        firstName: request.first_name,
        communityName: community.name,
        loginUrl: `${appUrl}/login`,
      },
    });
  }

  // Audit log
  await logAuditEvent({
    communityId: request.community_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'signup_request_approved',
    targetType: 'member',
    targetId: requestId,
    metadata: {
      applicant_name: `${request.first_name} ${request.last_name}`,
      applicant_email: request.email,
      unit_id: unitId,
      member_role: memberRole,
    },
  });

  return { success: true };
}

/**
 * Deny a signup request and optionally clean up the auth account.
 */
export async function denySignupRequest(
  requestId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Fetch the request
  const { data: request, error: reqErr } = await admin
    .from('signup_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqErr || !request) {
    return { success: false, error: 'Signup request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: `Request has already been ${request.status}.` };
  }

  // Auth check
  let user, caller;
  try {
    ({ user, caller } = await requireBoardAuth(request.community_id));
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  // Update signup request status
  await admin
    .from('signup_requests')
    .update({
      status: 'denied',
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  // Delete the orphaned auth account (they never became a member)
  if (request.user_id) {
    await admin.auth.admin.deleteUser(request.user_id);
  }

  // Audit log
  await logAuditEvent({
    communityId: request.community_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'signup_request_denied',
    targetType: 'member',
    targetId: requestId,
    metadata: {
      applicant_name: `${request.first_name} ${request.last_name}`,
      applicant_email: request.email,
      reason: reason || null,
    },
  });

  return { success: true };
}
