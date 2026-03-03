'use client';

import { Badge } from '@/components/shared/ui/badge';
import type { Member, MemberRole } from '@/lib/types/database';

const ROLE_BADGE_VARIANT: Record<MemberRole, 'secondary' | 'outline' | 'default'> = {
  owner: 'secondary',
  member: 'outline',
  tenant: 'default',
  minor: 'outline',
};

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Owner',
  member: 'Member',
  tenant: 'Tenant',
  minor: 'Minor',
};

interface MemberCardProps {
  member: Member & { unit: { unit_number: string } | null };
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
            {member.first_name} {member.last_name}
          </span>
          <Badge variant={ROLE_BADGE_VARIANT[member.member_role]}>
            {ROLE_LABEL[member.member_role]}
          </Badge>
        </div>

        {member.unit && (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
            Unit {member.unit.unit_number}
          </p>
        )}

        <div className="flex items-center gap-4 flex-wrap text-meta text-text-secondary-light dark:text-text-secondary-dark">
          {member.email && <span>{member.email}</span>}
          {member.phone && <span>{member.phone}</span>}
        </div>
      </div>
    </div>
  );
}
