'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { Badge } from '@/components/shared/ui/badge';
import { Vote, Clock, CheckCircle2 } from 'lucide-react';
import type { Ballot, BallotEligibility } from '@/lib/types/database';

export function VotingCard() {
  const { community, unit } = useCommunity();
  const basePath = `/${community.slug}`;
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, BallotEligibility>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community.theme?.voting_enabled) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    async function fetch() {
      // Get open ballots
      const { data: ballotData } = await supabase
        .from('ballots')
        .select('*')
        .eq('community_id', community.id)
        .eq('status', 'open')
        .order('closes_at', { ascending: true })
        .limit(5);

      const openBallots = (ballotData as Ballot[]) ?? [];
      setBallots(openBallots);

      // Get eligibility for current unit
      if (unit && openBallots.length > 0) {
        const { data: eligData } = await supabase
          .from('ballot_eligibility')
          .select('*')
          .in('ballot_id', openBallots.map((b) => b.id))
          .eq('unit_id', unit.id);

        const map: Record<string, BallotEligibility> = {};
        for (const e of (eligData as BallotEligibility[]) ?? []) {
          map[e.ballot_id] = e;
        }
        setEligibilityMap(map);
      }

      setLoading(false);
    }

    fetch();
  }, [community.id, community.theme?.voting_enabled, unit]);

  if (!community.theme?.voting_enabled) return null;

  const pendingVotes = ballots.filter((b) => !eligibilityMap[b.id]?.has_voted).length;

  return (
    <DashboardCardShell title="Active Ballots">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-5 rounded bg-muted" />
          ))}
        </div>
      ) : ballots.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark">No active ballots.</p>
      ) : (
        <div className="space-y-3">
          {pendingVotes > 0 && (
            <div className="flex items-center gap-2 rounded-inner-card bg-secondary-50/60 dark:bg-secondary-950/20 px-3 py-2">
              <Vote className="h-4 w-4 text-secondary-500 shrink-0" />
              <span className="text-body font-medium text-secondary-600 dark:text-secondary-400">
                {pendingVotes} ballot{pendingVotes !== 1 ? 's' : ''} awaiting your vote
              </span>
            </div>
          )}
          <ul className="space-y-2.5">
            {ballots.map((b) => {
              const elig = eligibilityMap[b.id];
              const hasVoted = elig?.has_voted;
              return (
                <li key={b.id}>
                  <Link
                    href={`${basePath}/voting`}
                    className="flex items-start gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark truncate group-hover:text-secondary-500 transition-colors">
                        {b.title}
                      </p>
                      <p className="text-meta text-text-muted-light dark:text-text-muted-dark flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closes {formatDistanceToNow(new Date(b.closes_at), { addSuffix: true })}
                      </p>
                    </div>
                    {hasVoted ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 shrink-0 text-meta">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Voted
                      </Badge>
                    ) : (
                      <Badge className="bg-secondary-100 text-secondary-600 dark:bg-secondary-900/40 dark:text-secondary-300 border-0 shrink-0 text-meta">
                        Vote
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DashboardCardShell>
  );
}
