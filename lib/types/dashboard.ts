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

export const DEFAULT_CARD_VISIBILITY: Record<MemberRole, DashboardCardId[]> = {
  owner: ['board-tasks', 'balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'household', 'documents', 'voting', 'bulletin-board', 'vendors', 'arc-requests'],
  member: ['board-tasks', 'balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'documents', 'voting', 'bulletin-board', 'vendors', 'arc-requests'],
  tenant: ['announcements', 'maintenance', 'events', 'amenities', 'amenity-calendar', 'bulletin-board', 'vendors'],
  minor: ['announcements', 'events', 'bulletin-board'],
};
