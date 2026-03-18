'use client';

import Link from 'next/link';
import { Badge } from '@/components/shared/ui/badge';
import { MemberNotes } from './member-notes';
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
  member: Member & { unit: { unit_number: string; address: string | null } | null };
  href?: string;
  isBoard?: boolean;
  noteCount?: number;
  onNoteCountChange?: (memberId: string, delta: number) => void;
}

export function MemberCard({ member, href, isBoard, noteCount = 0, onNoteCountChange }: MemberCardProps) {
  const cardContent = (
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
        <div className="text-meta text-text-muted-light dark:text-text-muted-dark">
          <p>Unit {member.unit.unit_number}</p>
          {member.unit.address && (
            <p>{member.unit.address}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap text-meta text-text-secondary-light dark:text-text-secondary-dark">
        {member.email && <span>{member.email}</span>}
        {member.phone && <span>{member.phone}</span>}
      </div>
    </div>
  );

  const card = (
    <div
      className={`rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding${
        href ? ' hover:border-secondary-400/40 hover:shadow-sm transition-all cursor-pointer' : ''
      }`}
    >
      {href ? (
        <Link href={href} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

      {isBoard && onNoteCountChange && (
        <MemberNotes
          memberId={member.id}
          noteCount={noteCount}
          onCountChange={onNoteCountChange}
        />
      )}
    </div>
  );

  return card;
}
