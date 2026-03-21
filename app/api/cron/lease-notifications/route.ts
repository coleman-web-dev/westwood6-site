import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { LeaseNotificationRule } from '@/lib/types/database';

// Vercel crons send GET requests
export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

/**
 * Daily cron: finds units with leases approaching expiry and queues
 * notification emails to board members. Uses per-unit notification rules
 * (e.g. 30 days before, 60 days before).
 * Protected by CRON_SECRET header.
 */
async function handler(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find all leased units with an expiration date and notification rules
  const { data: units } = await supabase
    .from('units')
    .select('id, community_id, unit_number, address, lease_expiration_date, lease_notification_rules')
    .eq('is_leased', true)
    .eq('status', 'active')
    .not('lease_expiration_date', 'is', null);

  if (!units || units.length === 0) {
    return NextResponse.json({ notified: 0, message: 'No leased units with expiration dates' });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Check for recently sent lease notifications to avoid duplicates (last 3 days)
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentEmails } = await supabase
    .from('email_queue')
    .select('template_data')
    .eq('category', 'lease_expiry_notification')
    .gte('created_at', threeDaysAgo.toISOString());

  // Track recently notified unit+days combos
  const recentKeys = new Set<string>();
  if (recentEmails) {
    for (const e of recentEmails) {
      const data = e.template_data as Record<string, unknown>;
      if (data?.unitId && data?.daysBefore !== undefined) {
        recentKeys.add(`${data.unitId}_${data.daysBefore}`);
      }
    }
  }

  let notified = 0;
  let skipped = 0;

  for (const unit of units) {
    if (!unit.lease_expiration_date) continue;

    const rules = (unit.lease_notification_rules ?? []) as LeaseNotificationRule[];
    if (rules.length === 0) continue;

    const expiryDate = new Date(unit.lease_expiration_date + 'T00:00:00');
    const diffMs = expiryDate.getTime() - new Date(todayStr + 'T00:00:00').getTime();
    const daysUntilExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Skip if already expired
    if (daysUntilExpiry < 0) continue;

    // Check if today matches any notification rule
    const matchingRule = rules.find((r) => r.days_before === daysUntilExpiry);
    if (!matchingRule) continue;

    // Deduplicate
    const dedupeKey = `${unit.id}_${matchingRule.days_before}`;
    if (recentKeys.has(dedupeKey)) {
      skipped++;
      continue;
    }

    try {
      const unitLabel = unit.address
        ? `Lot ${unit.unit_number} (${unit.address})`
        : `Lot ${unit.unit_number}`;

      const title =
        daysUntilExpiry === 0
          ? `Lease expires today: ${unitLabel}`
          : `Lease expires in ${daysUntilExpiry} days: ${unitLabel}`;

      const body = `The lease for ${unitLabel} expires on ${expiryDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}. Please follow up with the tenant and homeowner.`;

      // Queue email to board members
      await supabase.from('email_queue').insert({
        community_id: unit.community_id,
        to_role: 'board',
        category: 'lease_expiry_notification',
        subject: title,
        body,
        template_data: {
          unitId: unit.id,
          daysBefore: matchingRule.days_before,
          unitNumber: unit.unit_number,
          expirationDate: unit.lease_expiration_date,
        },
      });

      // Also create in-app board notification
      await supabase.rpc('create_board_notifications', {
        p_community_id: unit.community_id,
        p_type: 'general',
        p_title: title,
        p_body: body,
      });

      notified++;
    } catch (err) {
      console.error(`Failed to queue lease notification for unit ${unit.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ notified, skipped });
}
