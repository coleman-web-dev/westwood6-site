import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET environment variable is not set');
  }
  return secret;
}

export function generateUnsubscribeToken(memberId: string, category: string): string {
  const hmac = createHmac('sha256', getSecret());
  hmac.update(`${memberId}:${category}`);
  return hmac.digest('base64url');
}

export function verifyUnsubscribeToken(token: string, memberId: string, category: string): boolean {
  const expected = generateUnsubscribeToken(memberId, category);
  // Use timing-safe comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(tokenBuf, expectedBuf);
}

export function buildUnsubscribeUrl(memberId: string, category: string, communitySlug: string): string {
  const token = generateUnsubscribeToken(memberId, category);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
  return `${baseUrl}/api/email/unsubscribe?member_id=${memberId}&category=${category}&token=${token}`;
}
