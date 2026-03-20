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

export const DEFAULT_CARD_VISIBILITY: Record<MemberRole, DashboardCardId[]> = {
  owner: ['board-tasks', 'balance', 'announcements', 'maintenance', 'payments', 'events', 'amenity-calendar', 'household', 'documents', 'voting', 'bulletin-board', 'vendors', 'arc-requests'],
  member: ['board-tasks', 'balance', 'announcements', 'maintenance', 'payments', 'events', 'amenity-calendar', 'documents', 'voting', 'bulletin-board', 'vendors', 'arc-requests'],
  tenant: ['announcements', 'maintenance', 'events', 'amenity-calendar', 'bulletin-board', 'vendors'],
  minor: ['announcements', 'events', 'bulletin-board'],
};
