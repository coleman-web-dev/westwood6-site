'use client';

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/shared/ui/alert-dialog';
import {
  Play,
  Square,
  Pencil,
  Trash2,
  Vote,
  BarChart3,
  Clock,
  Lock,
  Users,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { BallotStatusBadge } from './ballot-status-badge';
import { QuorumTracker } from './quorum-tracker';
import type { Ballot, BallotEligibility } from '@/lib/types/database';

const BALLOT_TYPE_SHORT: Record<string, string> = {
  board_election: 'Election',
  budget_approval: 'Budget',
  amendment: 'Amendment',
  special_assessment: 'Assessment',
  recall: 'Recall',
  general: 'General',
};

interface BallotListProps {
  ballots: Ballot[];
  loading: boolean;
  onEdit: (ballot: Ballot) => void;
  onVote: (ballot: Ballot) => void;
  onViewResults: (ballot: Ballot) => void;
  onRefresh: () => void;
}

export function BallotList({
  ballots,
  loading,
  onEdit,
  onVote,
  onViewResults,
  onRefresh,
}: BallotListProps) {
  const { isBoard, member, unit } = useCommunity();
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, BallotEligibility>>({});
  const [actionBallot, setActionBallot] = useState<{ ballot: Ballot; action: 'open' | 'close' | 'cancel' | 'delete' } | null>(null);
  const [actioning, setActioning] = useState(false);
  const [quorumRefreshKey, setQuorumRefreshKey] = useState(0);

  // Load eligibility for current user's unit on all open ballots
  useEffect(() => {
    if (!unit) return;
    const openBallotIds = ballots.filter((b) => b.status === 'open').map((b) => b.id);
    if (openBallotIds.length === 0) {
      setEligibilityMap({});
      return;
    }
    const supabase = createClient();
    async function loadEligibility() {
      const { data } = await supabase
        .from('ballot_eligibility')
        .select('*')
        .in('ballot_id', openBallotIds)
        .eq('unit_id', unit!.id);
      const map: Record<string, BallotEligibility> = {};
      for (const e of (data as BallotEligibility[]) ?? []) {
        map[e.ballot_id] = e;
      }
      setEligibilityMap(map);
    }
    loadEligibility();
  }, [ballots, unit]);

  async function handleAction() {
    if (!actionBallot) return;
    setActioning(true);
    const supabase = createClient();
    const { ballot, action } = actionBallot;

    if (action === 'open') {
      const { data, error } = await supabase.rpc('open_ballot', { p_ballot_id: ballot.id });
      const result = data as { success?: boolean; error?: string; eligible_voters?: number } | null;
      if (error || result?.error) {
        toast.error(result?.error ?? 'Failed to open ballot.');
      } else {
        toast.success(`Ballot opened with ${result?.eligible_voters ?? 0} eligible voters.`);

        // Notify all approved members
        await supabase.rpc('create_member_notifications', {
          p_community_id: ballot.community_id,
          p_type: 'ballot_opened',
          p_title: `Vote now: ${ballot.title}`,
          p_body: `A new ballot is open for voting. Voting closes ${format(new Date(ballot.closes_at), 'MMMM d, yyyy \'at\' h:mm a')}.`,
          p_reference_id: ballot.id,
          p_reference_type: 'ballot',
        });
      }
    } else if (action === 'close') {
      const { data, error } = await supabase.rpc('close_and_tally_ballot', { p_ballot_id: ballot.id });
      const result = data as { success?: boolean; error?: string; quorum_met?: boolean } | null;
      if (error || result?.error) {
        toast.error(result?.error ?? 'Failed to close ballot.');
      } else {
        toast.success(`Ballot closed. Quorum ${result?.quorum_met ? 'met' : 'NOT met'}.`);

        await supabase.rpc('create_member_notifications', {
          p_community_id: ballot.community_id,
          p_type: 'ballot_closed',
          p_title: `Voting closed: ${ballot.title}`,
          p_body: 'Voting has closed. Results will be published by the board.',
          p_reference_id: ballot.id,
          p_reference_type: 'ballot',
        });
      }
    } else if (action === 'cancel') {
      await supabase.from('ballots').update({ status: 'cancelled' }).eq('id', ballot.id);
      toast.success('Ballot cancelled.');
    } else if (action === 'delete') {
      await supabase.from('ballots').delete().eq('id', ballot.id);
      toast.success('Ballot deleted.');
    }

    setActioning(false);
    setActionBallot(null);
    setQuorumRefreshKey((k) => k + 1);
    onRefresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
      </div>
    );
  }

  if (ballots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Vote className="h-10 w-10 text-text-muted-light dark:text-text-muted-dark mb-3" />
        <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
          No ballots found.
        </p>
        {isBoard && (
          <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
            Create a new ballot to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {ballots.map((ballot) => {
          const eligibility = eligibilityMap[ballot.id];
          const canVote = ballot.status === 'open' && eligibility && !eligibility.has_voted;
          const hasVoted = eligibility?.has_voted;
          const closesAt = new Date(ballot.closes_at);
          const opensAt = new Date(ballot.opens_at);
          const isExpired = isPast(closesAt) && ballot.status === 'open';

          return (
            <div
              key={ballot.id}
              className="rounded-panel border border-stroke-light dark:border-stroke-dark bg-surface-light dark:bg-surface-dark p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-card-title text-text-primary-light dark:text-text-primary-dark">
                    {ballot.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <BallotStatusBadge status={ballot.status} />
                    <Badge variant="outline" className="text-meta">
                      {BALLOT_TYPE_SHORT[ballot.ballot_type] ?? ballot.ballot_type}
                    </Badge>
                    {ballot.is_secret_ballot && (
                      <span className="inline-flex items-center gap-1 text-meta text-secondary-500">
                        <Lock className="h-3 w-3" />
                        Secret
                      </span>
                    )}
                  </div>
                </div>

                {/* Vote button for eligible members */}
                {canVote && (
                  <Button size="sm" onClick={() => onVote(ballot)}>
                    <Vote className="h-4 w-4 mr-1" />
                    Vote
                  </Button>
                )}
                {hasVoted && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 shrink-0">
                    Voted
                  </Badge>
                )}
              </div>

              {/* Description */}
              {ballot.description && (
                <p className="text-body text-text-secondary-light dark:text-text-secondary-dark line-clamp-2">
                  {ballot.description}
                </p>
              )}

              {/* Schedule */}
              <div className="flex items-center gap-4 text-meta text-text-muted-light dark:text-text-muted-dark">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {ballot.status === 'open'
                    ? isExpired
                      ? 'Voting period ended'
                      : `Closes ${formatDistanceToNow(closesAt, { addSuffix: true })}`
                    : ballot.status === 'draft' || ballot.status === 'scheduled'
                      ? `Opens ${format(opensAt, 'MMM d, yyyy h:mm a')}`
                      : `Closed ${format(closesAt, 'MMM d, yyyy')}`}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {Math.round(ballot.quorum_threshold * 100)}% quorum
                </span>
              </div>

              {/* Quorum progress for open ballots */}
              {ballot.status === 'open' && (
                <QuorumTracker ballotId={ballot.id} refreshKey={quorumRefreshKey} />
              )}

              {/* Board actions */}
              {isBoard && (
                <div className="flex items-center gap-2 pt-1 border-t border-stroke-light dark:border-stroke-dark">
                  {ballot.status === 'draft' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onEdit(ballot)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionBallot({ ballot, action: 'open' })}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Open Voting
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-red-500 hover:text-red-600"
                        onClick={() => setActionBallot({ ballot, action: 'delete' })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {ballot.status === 'open' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionBallot({ ballot, action: 'close' })}
                      >
                        <Square className="h-3.5 w-3.5 mr-1" />
                        Close & Tally
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setActionBallot({ ballot, action: 'cancel' })}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {(ballot.status === 'closed' || ballot.status === 'certified') && (
                    <Button size="sm" variant="outline" onClick={() => onViewResults(ballot)}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      View Results
                    </Button>
                  )}
                  {ballot.results_published && ballot.status !== 'draft' && !isBoard && (
                    <Button size="sm" variant="outline" onClick={() => onViewResults(ballot)}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      View Results
                    </Button>
                  )}
                </div>
              )}

              {/* Non-board members can view published results */}
              {!isBoard && ballot.results_published && (
                <div className="pt-1 border-t border-stroke-light dark:border-stroke-dark">
                  <Button size="sm" variant="outline" onClick={() => onViewResults(ballot)}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1" />
                    View Results
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionBallot} onOpenChange={(open) => !open && setActionBallot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionBallot?.action === 'open' && 'Open Ballot for Voting?'}
              {actionBallot?.action === 'close' && 'Close Ballot and Tally Votes?'}
              {actionBallot?.action === 'cancel' && 'Cancel This Ballot?'}
              {actionBallot?.action === 'delete' && 'Delete This Ballot?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionBallot?.action === 'open' &&
                'This will snapshot the eligible voter list and open the ballot for voting. You cannot edit the ballot after opening.'}
              {actionBallot?.action === 'close' &&
                'This will close voting, tally the results, and compute quorum status. This action cannot be undone.'}
              {actionBallot?.action === 'cancel' &&
                'This will cancel the ballot. Any votes already cast will be discarded. This cannot be undone.'}
              {actionBallot?.action === 'delete' &&
                'This will permanently delete this draft ballot. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setActionBallot(null)} disabled={actioning}>
              Cancel
            </Button>
            <Button
              variant={actionBallot?.action === 'delete' || actionBallot?.action === 'cancel' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={actioning}
            >
              {actioning
                ? 'Processing...'
                : actionBallot?.action === 'open'
                  ? 'Open Voting'
                  : actionBallot?.action === 'close'
                    ? 'Close & Tally'
                    : actionBallot?.action === 'cancel'
                      ? 'Cancel Ballot'
                      : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
