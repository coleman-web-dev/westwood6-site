'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PermissionKey } from '@/lib/types/permissions';
import type { RoleTemplate } from '@/lib/types/permissions';
import { PERMISSION_KEYS, readOnlyPermissions } from '@/lib/types/permissions';

export interface AuthResult {
  user: { id: string; email?: string };
  member: {
    id: string;
    system_role: string;
    role_template_id: string | null;
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

/**
 * Verify the current user is a board-level member. Throws on failure.
 * This is the base check that all permission checks build on.
 */
export async function requireBoardMember(communityId: string): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: member } = await supabase
    .from('members')
    .select('id, system_role, role_template_id, first_name, last_name, email')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single();

  if (
    !member ||
    !['board', 'manager', 'super_admin'].includes(member.system_role)
  ) {
    throw new Error('Forbidden');
  }

  return { user, member };
}

/**
 * Verify the current user has a specific permission.
 * Checks board membership first, then resolves fine-grained permissions
 * from the member's role template.
 *
 * Priority:
 * 1. super_admin -> always allowed
 * 2. Has role_template_id -> look up template and check permission
 * 3. No template -> read-only default (board/manager without assignment)
 */
export async function requirePermission(
  communityId: string,
  permission: PermissionKey,
  level: 'read' | 'write',
): Promise<AuthResult> {
  const { user, member } = await requireBoardMember(communityId);

  // super_admin always passes
  if (member.system_role === 'super_admin') return { user, member };

  // No template assigned -> read-only default
  if (!member.role_template_id) {
    const readOnly = readOnlyPermissions();
    if (!readOnly[permission]?.[level]) {
      throw new Error(
        `Forbidden: missing ${level} permission for ${permission}`,
      );
    }
    return { user, member };
  }

  // Look up the template from community config
  const admin = createAdminClient();
  const { data: community } = await admin
    .from('communities')
    .select('theme')
    .eq('id', communityId)
    .single();

  const templates = (
    community?.theme as Record<string, unknown> | null
  )?.role_templates as RoleTemplate[] | undefined;
  const template = templates?.find(
    (t: RoleTemplate) => t.id === member.role_template_id,
  );

  if (!template) {
    // Template not found -> fallback to read-only
    const readOnly = readOnlyPermissions();
    if (!readOnly[permission]?.[level]) {
      throw new Error(
        `Forbidden: missing ${level} permission for ${permission}`,
      );
    }
    return { user, member };
  }

  // Ensure the permission key exists (forward-compatible)
  const perm = template.permissions[permission];
  if (!perm || !perm[level]) {
    throw new Error(
      `Forbidden: missing ${level} permission for ${permission}`,
    );
  }

  return { user, member };
}
