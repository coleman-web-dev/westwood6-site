'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';

export async function deprovisionMembers(
  memberIds: string[],
  actorId: string,
  actorEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  try {
    for (const memberId of memberIds) {
      // Get member details
      const { data: member } = await admin
        .from('members')
        .select('user_id, email, community_id, first_name, last_name')
        .eq('id', memberId)
        .single();

      if (!member) continue;

      // Unlink member from unit
      await admin.from('members').update({ unit_id: null }).eq('id', memberId);

      if (member.user_id) {
        // Check if this user has any other active memberships
        const { count } = await admin
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.user_id)
          .neq('id', memberId)
          .not('unit_id', 'is', null);

        // If no other active memberships, disable the auth account
        if ((count ?? 0) === 0) {
          // Ban the user (effectively disables login)
          await admin.auth.admin.updateUserById(member.user_id, {
            ban_duration: '876000h',
          });

          // Revoke all active sessions
          await admin.auth.admin.signOut(member.user_id, 'global');
        }
      }

      await logAuditEvent({
        communityId: member.community_id,
        actorId,
        actorEmail,
        action: 'member_deprovisioned',
        targetType: 'member',
        targetId: memberId,
        metadata: {
          member_email: member.email,
          member_name: `${member.first_name} ${member.last_name}`,
          auth_disabled: (member.user_id && true) || false,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('De-provisioning error:', error);
    return { success: false, error: 'Failed to de-provision members' };
  }
}
