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

// Custom domain → community slug mapping
// When a community has their own domain, requests are rewritten to /{slug}/* paths
const CUSTOM_DOMAINS: Record<string, string> = {
  'westwood6.com': 'westwood6',
  'www.westwood6.com': 'westwood6',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')?.split(':')[0] ?? '';
  const customSlug = CUSTOM_DOMAINS[hostname];

  // For custom domains, compute the effective pathname that the app will serve
  // e.g., westwood6.com/dashboard → effectively /westwood6/dashboard
  let effectivePathname = pathname;
  let needsRewrite = false;

  if (customSlug && !pathname.startsWith(`/${customSlug}`)) {
    // Global routes that should NOT be rewritten even on custom domains
    // Note: "/" is excluded here because on custom domains it should rewrite to /{slug}
    const isGlobalRoute =
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      (PUBLIC_ROUTES.has(pathname) && pathname !== '/');

    if (!isGlobalRoute) {
      effectivePathname = `/${customSlug}${pathname === '/' ? '' : pathname}`;
      needsRewrite = true;
    }
  }

  // Public API routes
  if (pathname.startsWith('/api/demo-request') || pathname.startsWith('/api/newsletter')) {
    return NextResponse.next();
  }

  // Static public routes + auth callback
  // On custom domains, "/" should NOT short-circuit here — it needs to reach the rewrite logic below
  if ((PUBLIC_ROUTES.has(pathname) && !(needsRewrite && pathname === '/')) || pathname.startsWith('/auth/')) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Community landing pages: single-segment paths like /westwood6 are public
  // For custom domains, the root "/" rewrites to "/{slug}" which is single-segment
  const effectiveSegments = effectivePathname.split('/').filter(Boolean);
  if (effectiveSegments.length === 1) {
    if (needsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Public community sub-pages (estoppel request form)
  if (effectiveSegments.length === 2 && effectiveSegments[1] === 'estoppel') {
    if (needsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
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
    if (needsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // All other routes (dashboard sub-pages) require auth
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // For custom domains, store the short path (e.g., /dashboard) as redirect
    // so after login the user stays on westwood6.com/dashboard
    url.searchParams.set('redirect', needsRewrite ? pathname : pathname);
    return NextResponse.redirect(url);
  }

  // Apply rewrite for authenticated custom domain requests
  if (needsRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = effectivePathname;
    return NextResponse.rewrite(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|static/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs|js|css|woff|woff2|ttf|eot)$).*)',
  ],
};
