'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Community, Member, Unit } from '@/lib/types/database';
import { DEFAULT_CARD_VISIBILITY, ADMIN_ONLY_CARDS, type DashboardCardId } from '@/lib/types/dashboard';
import type { PermissionKey, PermissionMap } from '@/lib/types/permissions';
import { noPermissions } from '@/lib/types/permissions';
import {
  resolvePermissions,
  checkPermission,
  hasAnyPermission,
} from '@/lib/utils/resolve-permissions';

type ViewMode = 'admin' | 'personal';

const VIEW_MODE_KEY = 'duesiq_view_mode';

type UserCommunity = { id: string; slug: string; name: string };

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
  /** true for tenant member_role — restricted financial visibility */
  isTenant: boolean;
  /** true for owner/member roles (not tenant/minor) — can view/manage household data */
  canManageHousehold: boolean;
  visibleCards: DashboardCardId[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  // Fine-grained permissions
  permissions: PermissionMap;
  hasPermission: (key: PermissionKey, level: 'read' | 'write') => boolean;
  canRead: (key: PermissionKey) => boolean;
  canWrite: (key: PermissionKey) => boolean;
  // Multi-community support
  userCommunities: UserCommunity[];
  hasMultipleCommunities: boolean;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

interface InitialData {
  community: Community;
  member: Member | null;
  unit: Unit | null;
  householdMembers: Member[];
  userCommunities: UserCommunity[];
}

export function CommunityProvider({
  initialData,
  children,
}: {
  initialData: InitialData;
  children: React.ReactNode;
}) {
  const { community, member, unit, householdMembers, userCommunities } = initialData;
  // Read localStorage synchronously to avoid a flash/race where cards
  // fire admin queries before the useEffect switches to 'personal'.
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === 'personal') return 'personal';
    }
    return 'admin';
  });

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  const value = useMemo<CommunityContextValue>(() => {
    const role = member?.member_role ?? 'member';
    const systemRole = member?.system_role ?? 'resident';

    const actualIsBoard = systemRole === 'board' || systemRole === 'manager' || systemRole === 'super_admin';

    // Resolve fine-grained permissions from role template
    const resolvedPermissions = resolvePermissions(member, community);

    // View mode affects whether permissions are active
    // In personal view, preserve resident-level permissions (e.g. violations read)
    const personalPermissions = (() => {
      const perms = noPermissions();
      perms.violations = { read: true, write: false };
      return perms;
    })();
    const activePermissions = viewMode === 'admin' ? resolvedPermissions : personalPermissions;

    const configCards = community.theme?.dashboard_cards?.[role];
    const allCards = (configCards ?? DEFAULT_CARD_VISIBILITY[role]) as DashboardCardId[];
    // In personal view, hide admin-only cards so board members see a resident experience
    const visibleCards = (actualIsBoard && viewMode === 'personal')
      ? allCards.filter((id) => !ADMIN_ONLY_CARDS.has(id))
      : allCards;

    return {
      community,
      member,
      unit,
      householdMembers,
      actualIsBoard,
      // isBoard is true if the user has a board-level system_role
      isBoard: viewMode === 'admin' ? actualIsBoard : false,
      isManager: viewMode === 'admin' ? (systemRole === 'manager' || systemRole === 'super_admin') : false,
      isSuperAdmin: viewMode === 'admin' ? systemRole === 'super_admin' : false,
      isHeadOfHousehold: member?.member_role === 'owner' && member?.parent_member_id === null,
      isTenant: member?.member_role === 'tenant',
      canManageHousehold: member?.member_role === 'owner' || member?.member_role === 'member',
      visibleCards,
      viewMode,
      setViewMode,
      // Permission helpers
      permissions: activePermissions,
      hasPermission: (key: PermissionKey, level: 'read' | 'write') =>
        checkPermission(activePermissions, key, level),
      canRead: (key: PermissionKey) => checkPermission(activePermissions, key, 'read'),
      canWrite: (key: PermissionKey) => checkPermission(activePermissions, key, 'write'),
      // Multi-community support
      userCommunities,
      hasMultipleCommunities: userCommunities.length > 1,
    };

  }, [community, member, unit, householdMembers, viewMode, userCommunities]);

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
