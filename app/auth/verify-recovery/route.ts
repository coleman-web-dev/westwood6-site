import { NextResponse } from 'next/server';

/**
 * Custom recovery verification endpoint.
 *
 * Instead of verifying the token server-side (which has cookie issues with
 * redirects), we pass the token to the /reset-password page where the client
 * verifies it via verifyOtp, establishing the session in the browser.
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

  // Pass token to reset-password page for client-side verification
  return NextResponse.redirect(
    `${origin}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
  );
}
