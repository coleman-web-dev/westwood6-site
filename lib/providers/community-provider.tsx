'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Community, Member, Unit } from '@/lib/types/database';
import { DEFAULT_CARD_VISIBILITY, type DashboardCardId } from '@/lib/types/dashboard';

interface CommunityContextValue {
  community: Community;
  member: Member | null;
  unit: Unit | null;
  householdMembers: Member[];
  isBoard: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
  isHeadOfHousehold: boolean;
  visibleCards: DashboardCardId[];
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

interface InitialData {
  community: Community;
  member: Member | null;
  unit: Unit | null;
  householdMembers: Member[];
}

export function CommunityProvider({
  initialData,
  children,
}: {
  initialData: InitialData;
  children: React.ReactNode;
}) {
  const { community, member, unit, householdMembers } = initialData;

  const value = useMemo<CommunityContextValue>(() => {
    const role = member?.member_role ?? 'member';
    const systemRole = member?.system_role ?? 'resident';

    const configCards = community.theme?.dashboard_cards?.[role];
    const visibleCards = (configCards ?? DEFAULT_CARD_VISIBILITY[role]) as DashboardCardId[];

    return {
      community,
      member,
      unit,
      householdMembers,
      isBoard: systemRole === 'board' || systemRole === 'manager' || systemRole === 'super_admin',
      isManager: systemRole === 'manager' || systemRole === 'super_admin',
      isSuperAdmin: systemRole === 'super_admin',
      isHeadOfHousehold: member?.member_role === 'owner' && member?.parent_member_id === null,
      visibleCards,
    };
  }, [community, member, unit, householdMembers]);

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return ctx;
}
