import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';
import type { EmailCategory } from '@/lib/types/database';

const VALID_CATEGORIES: EmailCategory[] = [
  'payment_confirmation',
  'payment_reminder',
  'announcement',
  'maintenance_update',
  'voting_notice',
  'reservation_update',
  'weekly_digest',
];

/**
 * GET /api/email/unsubscribe?member_id=...&category=...&token=...
 * One-click unsubscribe handler for email links.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('member_id');
  const category = searchParams.get('category') as EmailCategory | null;
  const token = searchParams.get('token');

  if (!memberId || !category || !token) {
    return htmlResponse(
      'Invalid Link',
      'This unsubscribe link is missing required information. Please use the link from your email.',
      400,
    );
  }

  // System emails cannot be unsubscribed
  if (category === 'system') {
    return htmlResponse(
      'Cannot Unsubscribe',
      'System emails (like password resets and account confirmations) cannot be unsubscribed from.',
      400,
    );
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return htmlResponse(
      'Invalid Category',
      `"${category}" is not a valid email category.`,
      400,
    );
  }

  // Verify HMAC token
  if (!verifyUnsubscribeToken(token, memberId, category)) {
    return htmlResponse(
      'Invalid Link',
      'This unsubscribe link has expired or is invalid. Please use the most recent link from your email.',
      403,
    );
  }

  const supabase = createAdminClient();

  // Update or insert preference
  const { error } = await supabase
    .from('email_preferences')
    .upsert(
      {
        member_id: memberId,
        category,
        enabled: false,
        // community_id is needed for upsert - look it up
        community_id: await getMemberCommunityId(supabase, memberId),
      },
      { onConflict: 'member_id,category' },
    );

  if (error) {
    console.error('Unsubscribe failed:', error);
    return htmlResponse(
      'Something Went Wrong',
      'We could not process your unsubscribe request. Please try again later.',
      500,
    );
  }

  const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return htmlResponse(
    'Unsubscribed',
    `You have been unsubscribed from "${categoryLabel}" emails. You can re-enable these emails from your Settings page in DuesIQ.`,
    200,
  );
}

async function getMemberCommunityId(
  supabase: ReturnType<typeof createAdminClient>,
  memberId: string,
): Promise<string> {
  const { data } = await supabase
    .from('members')
    .select('community_id')
    .eq('id', memberId)
    .single();

  return data?.community_id || '';
}

function htmlResponse(title: string, message: string, status: number) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - DuesIQ</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f6f9fc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 48px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    h1 {
      color: #1a1a2e;
      font-size: 24px;
      margin-bottom: 12px;
    }
    p {
      color: #525f7f;
      font-size: 15px;
      line-height: 1.6;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #8898aa;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${status === 200 ? '✅' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="footer">Powered by DuesIQ</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}
