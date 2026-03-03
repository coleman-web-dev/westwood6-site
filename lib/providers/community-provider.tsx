'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Community, Member, Unit } from '@/lib/types/database';
import { DEFAULT_CARD_VISIBILITY, type DashboardCardId } from '@/lib/types/dashboard';

type ViewMode = 'admin' | 'personal';

const VIEW_MODE_KEY = 'duesiq_view_mode';

interface CommunityContextValue {
  community: Community;
  member: Member | null;
  unit: Unit | null;
  householdMembers: Member[];
  isBoard: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
  actualIsBoard: boolean;
  isHeadOfHousehold: boolean;
  visibleCards: DashboardCardId[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
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
  const [viewMode, setViewModeState] = useState<ViewMode>('admin');

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'personal') {
      setViewModeState('personal');
    }
  }, []);

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  const value = useMemo<CommunityContextValue>(() => {
    const role = member?.member_role ?? 'member';
    const systemRole = member?.system_role ?? 'resident';

    const actualIsBoard = systemRole === 'board' || systemRole === 'manager' || systemRole === 'super_admin';

    const configCards = community.theme?.dashboard_cards?.[role];
    const visibleCards = (configCards ?? DEFAULT_CARD_VISIBILITY[role]) as DashboardCardId[];

    return {
      community,
      member,
      unit,
      householdMembers,
      actualIsBoard,
      isBoard: viewMode === 'admin' ? actualIsBoard : false,
      isManager: viewMode === 'admin' ? (systemRole === 'manager' || systemRole === 'super_admin') : false,
      isSuperAdmin: viewMode === 'admin' ? systemRole === 'super_admin' : false,
      isHeadOfHousehold: member?.member_role === 'owner' && member?.parent_member_id === null,
      visibleCards,
      viewMode,
      setViewMode,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community, member, unit, householdMembers, viewMode]);

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
