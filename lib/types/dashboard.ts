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
  | 'violations';

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
  owner: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'household', 'documents', 'voting', 'bulletin-board'],
  member: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'documents', 'voting', 'bulletin-board'],
  tenant: ['announcements', 'maintenance', 'events', 'amenities', 'amenity-calendar', 'bulletin-board'],
  minor: ['announcements', 'events', 'bulletin-board'],
};
