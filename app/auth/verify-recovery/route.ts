import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Custom recovery verification endpoint.
 *
 * Instead of relying on Supabase's /auth/v1/verify redirect (which uses the
 * Site URL configured in the Supabase dashboard and may point to localhost),
 * we send the user directly to this endpoint with the OTP token. We verify
 * the token server-side via verifyOtp, establish a session, and redirect
 * to /reset-password where they can set a new password.
 *
 * URL: /auth/verify-recovery?token=xxx&email=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const origin = new URL(request.url).origin;

  if (!token || !email) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();

  // Verify the recovery OTP and establish a session
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  });

  if (error) {
    console.error('Recovery verification failed:', error);
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  // Session is now established, redirect to set-password page
  return NextResponse.redirect(`${origin}/reset-password`);
}
