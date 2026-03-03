'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { Ballot, BallotEligibility } from '@/lib/types/database';

interface VotingParticipationProps {
  ballots: Ballot[];
  ballotEligibility: BallotEligibility[];
}

export function VotingParticipation({ ballots, ballotEligibility }: VotingParticipationProps) {
  const stats = useMemo(() => {
    const closedBallots = ballots.filter(
      (b) => b.status === 'closed' || b.status === 'certified'
    );

    const ballotStats = closedBallots.map((ballot) => {
      const eligible = ballotEligibility.filter((e) => e.ballot_id === ballot.id);
      const voted = eligible.filter((e) => e.has_voted);
      const participationRate = eligible.length > 0 ? (voted.length / eligible.length) * 100 : 0;
      const quorumMet = eligible.length > 0
        ? (voted.length / eligible.length) >= ballot.quorum_threshold
        : false;

      return {
        id: ballot.id,
        title: ballot.title,
        closedAt: ballot.closes_at,
        participationRate,
        quorumMet,
        totalEligible: eligible.length,
        totalVoted: voted.length,
      };
    });

    const avgParticipation = ballotStats.length > 0
      ? ballotStats.reduce((sum, b) => sum + b.participationRate, 0) / ballotStats.length
      : 0;

    const quorumAchievementRate = ballotStats.length > 0
      ? (ballotStats.filter((b) => b.quorumMet).length / ballotStats.length) * 100
      : 0;

    return { ballotStats, avgParticipation, quorumAchievementRate };
  }, [ballots, ballotEligibility]);

  return (
    <div className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-card-padding">
      <h3 className="text-section-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Voting Participation
      </h3>

      {stats.ballotStats.length === 0 ? (
        <p className="text-body text-text-muted-light dark:text-text-muted-dark text-center py-6">
          No completed ballots in this period.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-grid-gap mb-4">
            <div className="text-center">
              <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
                {stats.avgParticipation.toFixed(1)}%
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Avg. Participation
              </p>
            </div>
            <div className="text-center">
              <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
                {stats.quorumAchievementRate.toFixed(0)}%
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
                Quorum Achievement
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-meta">Ballot</TableHead>
                  <TableHead className="text-meta hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-meta text-right">Participation</TableHead>
                  <TableHead className="text-meta text-right">Quorum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.ballotStats.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-body font-medium">{b.title}</TableCell>
                    <TableCell className="text-meta text-text-secondary-light dark:text-text-secondary-dark hidden sm:table-cell">
                      {new Date(b.closedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-body text-right tabular-nums">
                      {b.participationRate.toFixed(1)}%
                      <span className="text-meta text-text-muted-light dark:text-text-muted-dark ml-1">
                        ({b.totalVoted}/{b.totalEligible})
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center rounded-pill px-2 py-0.5 text-meta font-medium ${
                          b.quorumMet
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {b.quorumMet ? 'Met' : 'Not met'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
