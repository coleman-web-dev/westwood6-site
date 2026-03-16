'use server';

import { queueAnnouncementNotification, queueWelcomeInvite, queueEventNotification, queueBallotNotification } from '@/lib/email/queue';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Verify the caller is an authenticated board member of the given community.
 * Returns { authorized: true } or { authorized: false, error: string }.
 */
async function requireBoardAuth(communityId: string): Promise<
  { authorized: true } | { authorized: false; error: string }
> {
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    return { authorized: false, error: 'Authentication required' };
  }

  const supabase = createAdminClient();
  const { data: member } = await supabase
    .from('members')
    .select('system_role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (!member) {
    return { authorized: false, error: 'Not a member of this community' };
  }

  const isBoardOrHigher =
    member.system_role === 'board' ||
    member.system_role === 'manager' ||
    member.system_role === 'super_admin';

  if (!isBoardOrHigher) {
    return { authorized: false, error: 'Board member access required' };
  }

  return { authorized: true };
}

export async function sendAnnouncementEmails(
  communityId: string,
  communitySlug: string,
  title: string,
  body: string,
  priority: string,
) {
  const auth = await requireBoardAuth(communityId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

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
  const auth = await requireBoardAuth(communityId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

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

export async function sendEventNotificationEmails(
  communityId: string,
  communitySlug: string,
  title: string,
  description: string,
  location: string,
  startDatetime: string,
  endDatetime: string,
  notifyRoles: string[],
) {
  const auth = await requireBoardAuth(communityId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await queueEventNotification(
      communityId,
      communitySlug,
      title,
      description,
      location,
      startDatetime,
      endDatetime,
      notifyRoles,
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to queue event notification emails:', error);
    return { success: false, error: 'Failed to queue event emails' };
  }
}

export async function sendBallotEmails(
  communityId: string,
  communitySlug: string,
  ballotTitle: string,
  ballotType: string,
  variant: 'opened' | 'closed' | 'results_published',
  closesAt?: string,
) {
  const auth = await requireBoardAuth(communityId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    await queueBallotNotification(communityId, communitySlug, ballotTitle, ballotType, variant, closesAt);
    return { success: true };
  } catch (error) {
    console.error('Failed to queue ballot notification emails:', error);
    return { success: false, error: 'Failed to queue ballot emails' };
  }
}

export async function sendPaymentReminders(communityId: string) {
  const auth = await requireBoardAuth(communityId);
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

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
