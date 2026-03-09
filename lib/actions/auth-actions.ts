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
