'use server';

import { queueAnnouncementNotification, queueWelcomeInvite } from '@/lib/email/queue';

export async function sendAnnouncementEmails(
  communityId: string,
  communitySlug: string,
  title: string,
  body: string,
  priority: string,
) {
  try {
    await queueAnnouncementNotification(communityId, communitySlug, title, body, priority);
    return { success: true };
  } catch (error) {
    console.error('Failed to queue announcement emails:', error);
    return { success: false, error: 'Failed to queue emails' };
  }
}

export async function sendWelcomeInvites(
  communityId: string,
  communitySlug: string,
  communityName: string,
  members: { email: string; name: string }[],
) {
  try {
    for (const m of members) {
      await queueWelcomeInvite(communityId, communitySlug, communityName, m.email, m.name);
    }
    return { success: true, count: members.length };
  } catch (error) {
    console.error('Failed to queue welcome invites:', error);
    return { success: false, error: 'Failed to queue welcome emails' };
  }
}

export async function sendPaymentReminders(communityId: string) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duesiq.com';

    const res = await fetch(`${baseUrl}/api/email/schedule-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ community_id: communityId }),
    });

    if (!res.ok) {
      return { success: false, error: 'Failed to trigger reminders' };
    }

    const data = await res.json();
    return { success: true, queued: data.queued ?? 0, skipped: data.skipped ?? 0 };
  } catch (error) {
    console.error('Failed to send payment reminders:', error);
    return { success: false, error: 'Failed to send reminders' };
  }
}
