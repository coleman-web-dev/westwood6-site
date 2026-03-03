'use client';

import { Users, MessageSquare, Wrench } from 'lucide-react';
import type { Member, BulletinPost, MaintenanceRequest } from '@/lib/types/database';

interface CommunityEngagementProps {
  members: Member[];
  bulletinPosts: BulletinPost[];
  maintenanceRequests: MaintenanceRequest[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
};

export function CommunityEngagement({ members, bulletinPosts, maintenanceRequests }: CommunityEngagementProps) {
  const nonMinors = members.filter((m) => m.member_role !== 'minor');
  const activated = nonMinors.filter((m) => m.user_id != null);
  const activationRate = nonMinors.length > 0 ? (activated.length / nonMinors.length) * 100 : 0;

  const maintenanceStatusCounts: Record<string, number> = {};
  for (const req of maintenanceRequests) {
    maintenanceStatusCounts[req.status] = (maintenanceStatusCounts[req.status] || 0) + 1;
  }

  const cards = [
    {
      label: 'Member Activation Rate',
      value: `${activationRate.toFixed(0)}%`,
      detail: `${activated.length} of ${nonMinors.length} members`,
      icon: Users,
      iconBg: 'bg-secondary-100 dark:bg-secondary-900',
      iconColor: 'text-secondary-600 dark:text-secondary-400',
    },
    {
      label: 'Bulletin Activity',
      value: String(bulletinPosts.length),
      detail: `post${bulletinPosts.length !== 1 ? 's' : ''} in period`,
      icon: MessageSquare,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Maintenance Requests',
      value: String(maintenanceRequests.length),
      detail: `request${maintenanceRequests.length !== 1 ? 's' : ''} in period`,
      icon: Wrench,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badges: maintenanceStatusCounts,
    },
  ];

  return (
    <div className="grid gap-grid-gap grid-cols-1 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-inner-card ${card.iconBg}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                {card.label}
              </p>
              <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
                {card.value}
              </p>
            </div>
          </div>
          <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
            {card.detail}
          </p>
          {card.badges && Object.keys(card.badges).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(card.badges).map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-pill px-2 py-0.5 text-meta font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                >
                  {count} {status.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
