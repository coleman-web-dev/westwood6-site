import { BalanceCard } from './balance-card';
import { AnnouncementsCard } from './announcements-card';
import { MaintenanceCard } from './maintenance-card';
import { PaymentsCard } from './payments-card';
import { EventsCard } from './events-card';
import { HouseholdCard } from './household-card';
import { DocumentsCard } from './documents-card';
import { AmenitiesCard } from './amenities-card';
import { AmenityCalendarCard } from './amenity-calendar-card';
import { VotingCard } from './voting-card';
import { BulletinBoardCard } from './bulletin-board-card';
import { ViolationsCard } from './violations-card';
import type { DashboardCardId } from '@/lib/types/dashboard';

export const CARD_COMPONENTS: Record<DashboardCardId, React.ComponentType> = {
  balance: BalanceCard,
  announcements: AnnouncementsCard,
  maintenance: MaintenanceCard,
  payments: PaymentsCard,
  events: EventsCard,
  household: HouseholdCard,
  documents: DocumentsCard,
  amenities: AmenitiesCard,
  'amenity-calendar': AmenityCalendarCard,
  voting: VotingCard,
  'bulletin-board': BulletinBoardCard,
  violations: ViolationsCard,
};
