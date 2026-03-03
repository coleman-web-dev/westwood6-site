'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Check if a member with this email exists (for first-timer detection on login page)
export async function checkMemberExists(email: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('is_approved', true);
  return (count ?? 0) > 0;
}

// Send a password setup/reset link to the given email
export async function sendPasswordSetupLink(
  email: string,
): Promise<{ success: boolean; error?: string }> {
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
