'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

// Send a password setup/reset link to the given email
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

  // Try to generate a recovery link. If the user does not exist in auth,
  // this will error, but we return success anyway to avoid leaking info
  // about which emails have accounts.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`,
    },
  });

  if (error) {
    console.error('Failed to generate recovery link:', error);
    // Return success to not leak whether the email exists
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
