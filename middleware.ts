import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/privacy',
  '/terms',
  '/cookies',
  '/security',
  '/status',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static public routes + auth callback
  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/auth/')) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Community landing pages: single-segment paths like /westwood6 are public
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // All other routes (dashboard sub-pages) require auth
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|static/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
