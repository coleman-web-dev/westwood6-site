import type { MemberRole } from './database';

export type DashboardCardId =
  | 'balance'
  | 'announcements'
  | 'maintenance'
  | 'payments'
  | 'events'
  | 'household'
  | 'documents'
  | 'amenities'
  | 'amenity-calendar'
  | 'voting'
  | 'bulletin-board'
  | 'violations'
  | 'vendors'
  | 'board-tasks'
  | 'arc-requests';

export interface DashboardCardConfig {
  id: DashboardCardId;
  title: string;
  icon: string;
  minW: number;
  minH: number;
  defaultW: number;
  defaultH: number;
}

/** Cards that only appear in admin view (hidden when board members switch to personal) */
export const ADMIN_ONLY_CARDS: Set<DashboardCardId> = new Set([
  'board-tasks',
  'vendors',
  'arc-requests',
  'violations',
]);

/**
 * Default card visibility and ORDER for each member role.
 * The order determines the default grid layout (paired two per row, left to right).
 * Most important cards should come first for a good first-login experience.
 * Board members in admin view prepend admin-only cards; in personal view those are filtered out.
 */
export const DEFAULT_CARD_VISIBILITY: Record<MemberRole, DashboardCardId[]> = {
  owner: ['balance', 'announcements', 'payments', 'maintenance', 'events', 'amenity-calendar', 'household', 'voting', 'bulletin-board', 'documents', 'board-tasks', 'vendors', 'arc-requests'],
  member: ['balance', 'announcements', 'payments', 'maintenance', 'events', 'amenity-calendar', 'voting', 'bulletin-board', 'documents', 'board-tasks', 'vendors', 'arc-requests'],
  tenant: ['announcements', 'maintenance', 'events', 'amenity-calendar', 'bulletin-board', 'vendors'],
  minor: ['announcements', 'events', 'bulletin-board'],
};
