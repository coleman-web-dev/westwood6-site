import { createHmac } from 'crypto';

const SECRET = process.env.UNSUBSCRIBE_SECRET || 'default-unsubscribe-secret';

export function generateUnsubscribeToken(memberId: string, category: string): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update(`${memberId}:${category}`);
  return hmac.digest('base64url');
}

export function verifyUnsubscribeToken(token: string, memberId: string, category: string): boolean {
  const expected = generateUnsubscribeToken(memberId, category);
  return token === expected;
}

export function buildUnsubscribeUrl(memberId: string, category: string, communitySlug: string): string {
  const token = generateUnsubscribeToken(memberId, category);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';
  return `${baseUrl}/api/email/unsubscribe?member_id=${memberId}&category=${category}&token=${token}`;
}
