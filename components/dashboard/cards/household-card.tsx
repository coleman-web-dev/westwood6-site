'use client';

import Link from 'next/link';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';

export function HouseholdCard() {
  const { community, householdMembers, unit } = useCommunity();

  return (
    <DashboardCardShell title="Household Members">
      {!unit ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No unit assigned.</p>
      ) : householdMembers.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No household members.</p>
      ) : (
        <div className="space-y-3">
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
          <Link
            href={`/${community.slug}/household`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            Manage household
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
