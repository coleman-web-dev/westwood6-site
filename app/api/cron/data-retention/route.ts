import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Vercel crons send GET requests
export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

/**
 * Monthly cron: cleans up expired data per the data retention policy.
 * - Sent email queue entries older than 90 days
 * - Read notifications older than 90 days
 * - Denied signup requests older than 90 days
 * - Audit logs older than 2 years
 */
async function handler(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const results: Record<string, number> = {};

  // Clean up sent email queue entries older than 90 days
  const { count: emailQueueCount } = await supabase
    .from('email_queue')
    .delete({ count: 'exact' })
    .eq('status', 'sent')
    .lt('created_at', ninetyDaysAgo.toISOString());
  results.email_queue_deleted = emailQueueCount ?? 0;

  // Clean up read notifications older than 90 days
  const { count: notifCount } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .eq('read', true)
    .lt('created_at', ninetyDaysAgo.toISOString());
  results.notifications_deleted = notifCount ?? 0;

  // Clean up denied signup requests older than 90 days
  const { count: signupCount } = await supabase
    .from('signup_requests')
    .delete({ count: 'exact' })
    .eq('status', 'denied')
    .lt('created_at', ninetyDaysAgo.toISOString());
  results.signup_requests_deleted = signupCount ?? 0;

  // Clean up audit logs older than 2 years
  const { count: auditCount } = await supabase
    .from('audit_logs')
    .delete({ count: 'exact' })
    .lt('created_at', twoYearsAgo.toISOString());
  results.audit_logs_deleted = auditCount ?? 0;

  return NextResponse.json({
    success: true,
    cleaned_at: now.toISOString(),
    results,
  });
}
