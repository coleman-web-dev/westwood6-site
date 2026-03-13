'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Badge } from '@/components/shared/ui/badge';
import { Vote, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { BallotType, BallotStatus } from '@/lib/types/database';

interface HouseholdVotingHistoryProps {
  unitId: string;
  communityId: string;
}

interface EligibilityRow {
  ballot_id: string;
  has_voted: boolean;
  voted_at: string | null;
  voted_by_proxy: boolean;
  ballots: {
    id: string;
    title: string;
    ballot_type: BallotType;
    status: BallotStatus;
    is_secret_ballot: boolean;
    opens_at: string;
    closes_at: string;
  };
}

interface VoteRow {
  ballot_id: string;
  ballot_options: { label: string };
}

const BALLOT_TYPE_LABEL: Record<BallotType, string> = {
  board_election: 'Election',
  budget_approval: 'Budget',
  amendment: 'Amendment',
  special_assessment: 'Assessment',
  recall: 'Recall',
  general: 'General',
};

const STATUS_VARIANT: Record<BallotStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  scheduled: 'outline',
  open: 'default',
  closed: 'secondary',
  certified: 'secondary',
  cancelled: 'destructive',
};

export function HouseholdVotingHistory({ unitId, communityId }: HouseholdVotingHistoryProps) {
  const { community } = useCommunity();
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState<EligibilityRow[]>([]);
  const [voteMap, setVoteMap] = useState<Record<string, string[]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch ballot eligibility for this unit
    const { data: eligData } = await supabase
      .from('ballot_eligibility')
      .select('ballot_id, has_voted, voted_at, voted_by_proxy, ballots(id, title, ballot_type, status, is_secret_ballot, opens_at, closes_at)')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(10);

    const rows = (eligData as EligibilityRow[]) ?? [];
    setEligibility(rows);

    // For non-secret ballots where unit voted, fetch their actual votes
    const votedBallotIds = rows
      .filter((e) => e.has_voted && !e.ballots.is_secret_ballot)
      .map((e) => e.ballot_id);

    if (votedBallotIds.length > 0) {
      const { data: votes } = await supabase
        .from('ballot_votes')
        .select('ballot_id, ballot_options(label)')
        .eq('unit_id', unitId)
        .in('ballot_id', votedBallotIds);

      const map: Record<string, string[]> = {};
      for (const v of (votes as VoteRow[]) ?? []) {
        if (!map[v.ballot_id]) map[v.ballot_id] = [];
        map[v.ballot_id].push(v.ballot_options.label);
      }
      setVoteMap(map);
    }

    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
        <div className="flex items-center gap-2">
          <Vote className="h-5 w-5 text-secondary-500" />
          <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
            Voting History
          </h2>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse h-10 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding space-y-3">
      <div className="flex items-center gap-2">
        <Vote className="h-5 w-5 text-secondary-500" />
        <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
          Voting History
        </h2>
      </div>

      {eligibility.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">
          No voting history for this household.
        </p>
      ) : (
        <div className="space-y-2">
          {eligibility.map((e) => {
            const ballot = e.ballots;
            const choices = voteMap[e.ballot_id];

            return (
              <div
                key={e.ballot_id}
                className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body text-text-primary-light dark:text-text-primary-dark truncate">
                      {ballot.title}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {BALLOT_TYPE_LABEL[ballot.ballot_type]}
                    </Badge>
                    <Badge variant={STATUS_VARIANT[ballot.status]} className="text-[10px]">
                      {ballot.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
                      {new Date(ballot.closes_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {choices && choices.length > 0 && (
                      <span className="text-meta text-text-secondary-light dark:text-text-secondary-dark">
                        Voted: {choices.join(', ')}
                      </span>
                    )}
                    {e.voted_by_proxy && (
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark italic">
                        (by proxy)
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {e.has_voted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-text-muted-light dark:text-text-muted-dark" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={`/${community.slug}/voting`}
        className="inline-flex items-center gap-1 text-label text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-400"
      >
        View All Ballots
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
