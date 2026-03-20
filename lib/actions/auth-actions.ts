'use server';

import { render } from '@react-email/render';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmailDirect } from '@/lib/email/resend';
import { PasswordResetEmail } from '@/lib/email/templates/password-reset';
import { logAuditEvent } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

// Send a password setup/reset link to the given email via Resend
// Rate limited to 3 requests per email per 15 minutes to prevent abuse
export async function sendPasswordSetupLink(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  // Rate limit by email to prevent password reset flooding
  const limiter = rateLimit(`password-setup:${email.toLowerCase()}`, 3);
  if (!limiter.success) {
    // Return success to not leak info, but don't actually send
    return { success: true };
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Generate a recovery link via admin API (does NOT send email itself)
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error) {
    console.error('Failed to generate recovery link:', error);
    // Return success to not leak whether the email exists
    return { success: true };
  }

  // Look up the member's community name for branding
  let communityName = 'DuesIQ';
  const { data: member } = await supabase
    .from('members')
    .select('community_id, communities(name)')
    .ilike('email', email.toLowerCase().trim())
    .single();
  if (member?.communities && typeof member.communities === 'object' && 'name' in member.communities) {
    communityName = (member.communities as { name: string }).name;
  }

  // Build a URL to our own verification endpoint instead of using Supabase's
  // action_link (which redirects via Supabase's Site URL setting and may
  // point to localhost). Our endpoint verifies the token server-side and
  // redirects to /reset-password.
  const tokenHash = data.properties.hashed_token;
  const resetUrl = `${appUrl}/auth/verify-recovery?token=${encodeURIComponent(tokenHash)}&email=${encodeURIComponent(email)}`;

  // Render and send via Resend (branded DuesIQ email)
  try {
    const html = await render(
      PasswordResetEmail({ communityName, resetUrl }),
    );

    await sendEmailDirect({
      to: email,
      subject: `Reset your ${communityName} password`,
      html,
    });
  } catch (emailError) {
    console.error('Failed to send password reset email via Resend:', emailError);
    // Return success to not leak info
    return { success: true };
  }

  return { success: true };
}

// Check if an email belongs to a first-time pre-provisioned member
// who has never signed in before. Returns false for unknown emails
// and for members who have already signed in (no email enumeration).
export async function checkIsFirstTimeUser(
  email: string,
): Promise<{ isFirstTime: boolean }> {
  const normalized = email.toLowerCase().trim();
  const limiter = rateLimit(`check-first-time:${normalized}`, 10);
  if (!limiter.success) return { isFirstTime: false };

  const supabase = createAdminClient();

  // Look up approved member by email (case-insensitive)
  const { data: member } = await supabase
    .from('members')
    .select('id, user_id')
    .ilike('email', normalized)
    .eq('is_approved', true)
    .single();

  if (!member) return { isFirstTime: false };

  // If no auth account linked yet, this is definitely first-time
  if (!member.user_id) return { isFirstTime: true };

  // Check if the auth user has ever signed in
  const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
  if (!authUser?.user) return { isFirstTime: false };

  // Only first-time if they have never signed in
  return { isFirstTime: !authUser.user.last_sign_in_at };
}

// Set password for a first-time pre-provisioned member directly
// (no email link required). Only works if the member has never signed in.
export async function setupFirstTimePassword(
  email: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const normalized = email.toLowerCase().trim();

  // Rate limit
  const limiter = rateLimit(`first-time-setup:${normalized}`, 5);
  if (!limiter.success) {
    return { success: false, error: 'Too many attempts. Please try again later.' };
  }

  // Server-side password validation
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  const supabase = createAdminClient();

  // Verify this is an approved member
  const { data: member } = await supabase
    .from('members')
    .select('id, user_id, community_id')
    .ilike('email', normalized)
    .eq('is_approved', true)
    .single();

  if (!member) {
    return { success: false, error: 'Unable to set up password. Please contact your community manager.' };
  }

  try {
    if (member.user_id) {
      // Auth account exists. Verify they have never signed in.
      const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
      if (!authUser?.user) {
        return { success: false, error: 'Unable to set up password. Please contact your community manager.' };
      }
      if (authUser.user.last_sign_in_at) {
        return { success: false, error: 'This account already has a password. Please use "Forgot password?" to reset it.' };
      }

      // Set the password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        member.user_id,
        { password: newPassword },
      );
      if (updateError) {
        console.error('Failed to set first-time password:', updateError);
        return { success: false, error: 'Failed to set up password. Please try again.' };
      }
    } else {
      // No auth account yet (pre-create never ran). Create one with the password.
      // The link_auth_user_to_member trigger will auto-link to the member row.
      const { error: createError } = await supabase.auth.admin.createUser({
        email: normalized,
        password: newPassword,
        email_confirm: true,
      });
      if (createError) {
        console.error('Failed to create auth account for first-time user:', createError);
        return { success: false, error: 'Failed to set up password. Please try again.' };
      }
    }

    // Audit log
    await logAuditEvent({
      communityId: member.community_id,
      actorEmail: normalized,
      action: 'first_time_password_setup',
      targetType: 'member',
      targetId: member.id,
    });

    return { success: true };
  } catch (err) {
    console.error('Unexpected error in setupFirstTimePassword:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

// Promote or demote a member's board status.
// Caller must be board/manager/super_admin in the same community.
// Cannot change super_admin's system_role or demote yourself.
export async function promoteToBoard(
  memberId: string,
  newSystemRole: 'board' | 'resident',
  boardTitle?: string | null,
  roleTemplateId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // We need the caller's identity. Use the server client with cookies.
  const { createClient } = await import('@/lib/supabase/server');
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  // Look up the target member
  const { data: target } = await supabase
    .from('members')
    .select('id, community_id, system_role, first_name, last_name, email, user_id')
    .eq('id', memberId)
    .single();

  if (!target) {
    return { success: false, error: 'Member not found.' };
  }

  // Verify caller is board+ in the same community
  const { data: caller } = await supabase
    .from('members')
    .select('id, system_role')
    .eq('user_id', user.id)
    .eq('community_id', target.community_id)
    .single();

  if (!caller || !['board', 'manager', 'super_admin'].includes(caller.system_role)) {
    return { success: false, error: 'You do not have permission to manage board roles.' };
  }

  // Cannot change super_admin
  if (target.system_role === 'super_admin') {
    return { success: false, error: 'Cannot change the role of a super admin.' };
  }

  // Cannot demote yourself
  if (newSystemRole === 'resident' && target.user_id === user.id) {
    return { success: false, error: 'You cannot demote yourself.' };
  }

  // Build update
  const updates: Record<string, unknown> = {
    system_role: newSystemRole,
  };

  if (newSystemRole === 'board') {
    updates.board_title = boardTitle?.trim() || null;
    updates.role_template_id = roleTemplateId || null;
  } else {
    // Demoting to resident: clear board fields
    updates.board_title = null;
    updates.role_template_id = null;
  }

  const { error: updateError } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId);

  if (updateError) {
    console.error('Failed to update board role:', updateError);
    return { success: false, error: 'Failed to update role.' };
  }

  // Audit log
  await logAuditEvent({
    communityId: target.community_id,
    actorId: user.id,
    actorEmail: user.email,
    action: newSystemRole === 'board' ? 'member_promoted_to_board' : 'member_demoted_from_board',
    targetType: 'member',
    targetId: memberId,
    metadata: {
      member_name: `${target.first_name} ${target.last_name}`,
      member_email: target.email,
      new_system_role: newSystemRole,
      board_title: boardTitle || null,
      role_template_id: roleTemplateId || null,
    },
  });

  return { success: true };
}

// Log a login attempt for audit purposes
export async function logLoginAttempt(
  email: string,
  success: boolean,
  userId?: string | null,
) {
  const supabase = createAdminClient();

  // Look up the member's community for the audit log
  let communityId: string | null = null;
  if (userId) {
    const { data: member } = await supabase
      .from('members')
      .select('community_id')
      .eq('user_id', userId)
      .single();
    communityId = member?.community_id || null;
  } else {
    const { data: member } = await supabase
      .from('members')
      .select('community_id')
      .eq('email', email)
      .single();
    communityId = member?.community_id || null;
  }

  await logAuditEvent({
    communityId,
    actorId: userId || undefined,
    actorEmail: email,
    action: success ? 'login_success' : 'login_failed',
    metadata: { success },
  });
}

// Log MFA enrollment/removal for audit purposes
export async function logMfaEvent(
  userId: string,
  email: string,
  communityId: string,
  type: 'enrolled' | 'removed',
) {
  await logAuditEvent({
    communityId,
    actorId: userId,
    actorEmail: email,
    action: type === 'enrolled' ? 'mfa_enrolled' : 'mfa_removed',
  });
}
