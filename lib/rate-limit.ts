/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per IP address.
 * Note: On serverless (Vercel), each instance has its own state,
 * so this provides per-instance protection. For distributed rate
 * limiting, use a Redis-based solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited.
 * @param identifier - Unique identifier (typically IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns { success: true } if allowed, { success: false, retryAfterMs } if limited
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 15 * 60 * 1000,
): { success: true } | { success: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count >= limit) {
    return { success: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { success: true };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
