'use client';

import { Vote, Lock, ShieldCheck, BarChart3, Users } from 'lucide-react';
import { useCommunity } from '@/lib/providers/community-provider';

export function VotingUpsell() {
  const { isBoard } = useCommunity();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center mb-6">
        <Vote className="h-8 w-8 text-secondary-500" />
      </div>

      <h2 className="text-page-title text-text-primary-light dark:text-text-primary-dark mb-2">
        Electronic Voting
      </h2>

      <p className="text-body text-text-secondary-light dark:text-text-secondary-dark max-w-md mb-8">
        {isBoard
          ? 'Run legally compliant HOA elections and votes right from your dashboard. Secure, auditable, and easy for your members.'
          : 'Electronic voting is not yet enabled for your community. Contact your board for more information.'}
      </p>

      {isBoard && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mb-8">
            <FeatureItem
              icon={<ShieldCheck className="h-5 w-5 text-green-500" />}
              title="Legally Compliant"
              description="Meets ESIGN, UETA, and state-specific HOA voting requirements across all 50 states"
            />
            <FeatureItem
              icon={<Lock className="h-5 w-5 text-blue-500" />}
              title="Secret Ballot"
              description="Architecturally separated voter identity from ballot choices for board elections"
            />
            <FeatureItem
              icon={<BarChart3 className="h-5 w-5 text-secondary-500" />}
              title="Real-time Results"
              description="Live quorum tracking, automatic tallying, and certifiable results"
            />
            <FeatureItem
              icon={<Users className="h-5 w-5 text-amber-500" />}
              title="Proxy Voting"
              description="Members can authorize others to vote on their behalf with full audit trail"
            />
          </div>

          <p className="text-label text-text-muted-light dark:text-text-muted-dark">
            Contact DuesIQ to enable voting for your community.
          </p>
        </>
      )}
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 text-left rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-label font-semibold text-text-primary-light dark:text-text-primary-dark">
          {title}
        </p>
        <p className="text-meta text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
