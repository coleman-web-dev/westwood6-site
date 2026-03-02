import type { MemberRole } from './database';

export type DashboardCardId =
  | 'balance'
  | 'announcements'
  | 'maintenance'
  | 'payments'
  | 'events'
  | 'household'
  | 'documents'
  | 'amenities';

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
  owner: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'household', 'documents'],
  member: ['balance', 'announcements', 'maintenance', 'payments', 'events', 'amenities', 'documents'],
  tenant: ['announcements', 'maintenance', 'events', 'amenities'],
  minor: ['announcements', 'events'],
};
