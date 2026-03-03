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
