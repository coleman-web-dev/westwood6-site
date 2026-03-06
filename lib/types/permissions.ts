// ─── Permission Keys ─────────────────────────────────────
// Each key maps to a feature module in the app.
// "read" = can view the module's data in admin context
// "write" = can create, edit, delete, manage within the module

export const PERMISSION_KEYS = [
  'payments',
  'announcements',
  'documents',
  'amenities',
  'events',
  'maintenance',
  'bulletin_board',
  'voting',
  'violations',
  'arc_requests',
  'vendors',
  'accounting',
  'checks',
  'budget',
  'reports',
  'members',
  'settings',
  'banking',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionLevel {
  read: boolean;
  write: boolean;
}

export type PermissionMap = Record<PermissionKey, PermissionLevel>;

// ─── Role Templates ──────────────────────────────────────

export interface RoleTemplate {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  permissions: PermissionMap;
}

// ─── Helper builders ─────────────────────────────────────

/** All permissions set to read + write */
export function allPermissions(): PermissionMap {
  return Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, { read: true, write: true }]),
  ) as PermissionMap;
}

/** All read, no write */
export function readOnlyPermissions(): PermissionMap {
  return Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, { read: true, write: false }]),
  ) as PermissionMap;
}

/** No permissions at all */
export function noPermissions(): PermissionMap {
  return Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, { read: false, write: false }]),
  ) as PermissionMap;
}

/** Start with read-only, then grant write access to specific keys */
function withWriteAccess(keys: PermissionKey[]): PermissionMap {
  const perms = readOnlyPermissions();
  for (const key of keys) {
    perms[key] = { read: true, write: true };
  }
  return perms;
}

// ─── Default Templates ───────────────────────────────────

export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'full_admin',
    name: 'Full Admin',
    description: 'Full read and write access to all features',
    is_default: true,
    permissions: allPermissions(),
  },
  {
    id: 'president',
    name: 'President',
    description: 'Full access to all community features',
    is_default: true,
    permissions: allPermissions(),
  },
  {
    id: 'treasurer',
    name: 'Treasurer',
    description: 'Financial management focus with read access to all areas',
    is_default: true,
    permissions: withWriteAccess([
      'payments',
      'accounting',
      'checks',
      'budget',
      'vendors',
      'reports',
      'banking',
    ]),
  },
  {
    id: 'secretary',
    name: 'Secretary',
    description: 'Communications and records management',
    is_default: true,
    permissions: withWriteAccess([
      'announcements',
      'documents',
      'voting',
      'members',
      'events',
      'bulletin_board',
    ]),
  },
  {
    id: 'board_member',
    name: 'Board Member',
    description: 'Standard board member access',
    is_default: true,
    permissions: withWriteAccess([
      'payments',
      'announcements',
      'documents',
      'amenities',
      'events',
      'maintenance',
      'bulletin_board',
      'voting',
      'violations',
      'arc_requests',
      'vendors',
      'budget',
      'reports',
    ]),
  },
  {
    id: 'property_manager',
    name: 'Property Manager',
    description: 'Day-to-day operations management',
    is_default: true,
    permissions: withWriteAccess([
      'maintenance',
      'vendors',
      'amenities',
      'announcements',
      'events',
      'violations',
      'arc_requests',
      'documents',
      'bulletin_board',
    ]),
  },
];

// ─── Human-readable labels ───────────────────────────────

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  payments: 'Payments & Invoices',
  announcements: 'Announcements',
  documents: 'Documents',
  amenities: 'Amenities & Reservations',
  events: 'Events',
  maintenance: 'Maintenance Requests',
  bulletin_board: 'Bulletin Board',
  voting: 'Voting & Ballots',
  violations: 'Violations',
  arc_requests: 'ARC Requests',
  vendors: 'Vendors',
  accounting: 'Accounting & GL',
  checks: 'Check Writing',
  budget: 'Budget',
  reports: 'Reports & Exports',
  members: 'Member Management',
  settings: 'Community Settings',
  banking: 'Banking & Plaid',
};

/** Permission key groupings for the UI editor */
export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  {
    label: 'Financial',
    keys: ['payments', 'accounting', 'checks', 'budget', 'banking', 'reports'],
  },
  {
    label: 'Community',
    keys: ['announcements', 'documents', 'events', 'bulletin_board', 'voting'],
  },
  {
    label: 'Property',
    keys: ['amenities', 'maintenance', 'violations', 'arc_requests', 'vendors'],
  },
  {
    label: 'Administration',
    keys: ['members', 'settings'],
  },
];
