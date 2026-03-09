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

  // Public API routes
  if (pathname.startsWith('/api/demo-request') || pathname.startsWith('/api/newsletter')) {
    return NextResponse.next();
  }

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

  // Dev bypass: skip auth in development when cookie is set
  // Double-check VERCEL_ENV to prevent accidental activation in production
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.VERCEL_ENV !== 'production' &&
    request.cookies.get('dev-bypass')?.value === '1'
  ) {
    return NextResponse.next();
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
