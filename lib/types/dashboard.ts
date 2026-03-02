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
  | 'amenity-calendar';

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
  owner: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'household', 'documents'],
  member: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'amenity-calendar', 'documents'],
  tenant: ['announcements', 'maintenance', 'events', 'amenities', 'amenity-calendar'],
  minor: ['announcements', 'events'],
};
