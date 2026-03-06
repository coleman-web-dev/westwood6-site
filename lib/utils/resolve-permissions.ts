import type { Member, Community } from '@/lib/types/database';
import type { PermissionKey, PermissionMap, RoleTemplate } from '@/lib/types/permissions';
import {
  PERMISSION_KEYS,
  DEFAULT_ROLE_TEMPLATES,
  allPermissions,
  readOnlyPermissions,
  noPermissions,
} from '@/lib/types/permissions';

/**
 * Resolve the effective permissions for a member.
 *
 * Priority:
 * 1. super_admin -> always full permissions (cannot be restricted)
 * 2. board/manager with role_template_id -> look up template in community config
 * 3. board/manager with no template -> read-only (safe default until admin assigns a role)
 * 4. resident -> no admin permissions
 *
 * Backward compatibility: The migration auto-assigns existing board/manager
 * members to 'full_admin', so they keep full access. Only new board members
 * added after migration default to read-only.
 */
export function resolvePermissions(
  member: Member | null,
  community: Community | null,
): PermissionMap {
  if (!member || !community) return noPermissions();

  const systemRole = member.system_role;

  // super_admin always gets everything
  if (systemRole === 'super_admin') return allPermissions();

  // Residents never get admin permissions
  if (systemRole === 'resident') return noPermissions();

  // Board or manager
  if (systemRole === 'board' || systemRole === 'manager') {
    // If assigned a specific template, use it
    if (member.role_template_id) {
      const templates = (community.theme?.role_templates ??
        DEFAULT_ROLE_TEMPLATES) as RoleTemplate[];
      const template = templates.find((t) => t.id === member.role_template_id);
      if (template) {
        // Ensure all permission keys are present (in case new keys were added after template was saved)
        const merged = { ...readOnlyPermissions() };
        for (const key of PERMISSION_KEYS) {
          if (template.permissions[key]) {
            merged[key] = template.permissions[key];
          }
        }
        return merged;
      }
    }
    // No template assigned -> read-only (safe default)
    return readOnlyPermissions();
  }

  return noPermissions();
}

/** Check a single permission */
export function checkPermission(
  permissions: PermissionMap,
  key: PermissionKey,
  level: 'read' | 'write',
): boolean {
  return permissions[key]?.[level] ?? false;
}

/** Check if any admin permission exists (used to determine if someone has any board access) */
export function hasAnyPermission(permissions: PermissionMap): boolean {
  return PERMISSION_KEYS.some(
    (key) => permissions[key].read || permissions[key].write,
  );
}
