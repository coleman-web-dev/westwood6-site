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

  // Allow public routes and static assets
  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith('/auth/')) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // All other routes (including /[slug]/*) require auth
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
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|static/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
