'use client';

import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';

export function HouseholdCard() {
  const { householdMembers, unit } = useCommunity();

  return (
    <DashboardCardShell title="Household Members">
      {!unit ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No unit assigned.</p>
      ) : householdMembers.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No household members.</p>
      ) : (
        <ul className="space-y-2">
          {householdMembers.map((m) => (
            <li key={m.id} className="flex items-center justify-between">
              <span className="text-body">
                {m.first_name} {m.last_name}
              </span>
              <Badge variant="outline" className="text-meta capitalize">
                {m.member_role}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
