import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { queueVendorInsuranceReminder } from '@/lib/email/queue';
import type { CommunityTheme } from '@/lib/types/database';

const DEFAULT_REMINDER_DAYS = [60, 30, 7];

/**
 * POST /api/cron/vendor-insurance-reminders
 * Cron endpoint: finds vendors with expiring insurance and queues reminder emails to board members.
 * Runs daily. Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: communities } = await supabase
    .from('communities')
    .select('id, slug, theme');

  if (!communities || communities.length === 0) {
    return NextResponse.json({ queued: 0, skipped: 0, message: 'No communities found' });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Check for recently sent reminders to avoid duplicates (last 3 days)
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: recentEmails } = await supabase
    .from('email_queue')
    .select('template_data')
    .eq('category', 'insurance_reminder_email')
    .gte('created_at', threeDaysAgo.toISOString());

  const recentVendorIds = new Set<string>();
  if (recentEmails) {
    for (const e of recentEmails) {
      const data = e.template_data as Record<string, unknown>;
      if (data?.vendorId) {
        recentVendorIds.add(data.vendorId as string);
      }
    }
  }

  let queued = 0;
  let skipped = 0;

  for (const community of communities) {
    const theme = community.theme as CommunityTheme | null;
    const reminderDays = theme?.vendor_settings?.insurance_reminder_days ?? DEFAULT_REMINDER_DAYS;

    // Find the largest reminder window
    const maxDays = Math.max(...reminderDays);

    // Calculate the date that is maxDays from now
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + maxDays);
    const windowEndStr = windowEnd.toISOString().split('T')[0];

    // Query active vendors with insurance_expiry within the window
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, name, company, insurance_expiry')
      .eq('community_id', community.id)
      .eq('status', 'active')
      .not('insurance_expiry', 'is', null)
      .lte('insurance_expiry', windowEndStr)
      .gte('insurance_expiry', todayStr);

    if (!vendors || vendors.length === 0) continue;

    for (const vendor of vendors) {
      if (!vendor.insurance_expiry) continue;

      // Calculate days until expiry
      const expiryDate = new Date(vendor.insurance_expiry + 'T00:00:00');
      const diffMs = expiryDate.getTime() - new Date(todayStr + 'T00:00:00').getTime();
      const daysUntilExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Check if this matches any of the configured reminder days
      const shouldRemind = reminderDays.some((d) => daysUntilExpiry === d);
      if (!shouldRemind) {
        continue;
      }

      // Deduplicate
      if (recentVendorIds.has(vendor.id)) {
        skipped++;
        continue;
      }

      try {
        await queueVendorInsuranceReminder(
          community.id,
          community.slug,
          vendor.id,
          vendor.name,
          vendor.company,
          vendor.insurance_expiry,
          daysUntilExpiry,
        );
        queued++;

        // Create in-app board notification
        await supabase.rpc('create_board_notifications', {
          p_community_id: community.id,
          p_type: 'general',
          p_title: `Vendor insurance ${daysUntilExpiry === 0 ? 'expires today' : `expires in ${daysUntilExpiry} days`}`,
          p_body: `${vendor.name}${vendor.company ? ` (${vendor.company})` : ''} insurance expires ${vendor.insurance_expiry}.`,
        });
      } catch (err) {
        console.error(`Failed to queue insurance reminder for vendor ${vendor.id}:`, err);
        skipped++;
      }
    }
  }

  return NextResponse.json({ queued, skipped });
}
