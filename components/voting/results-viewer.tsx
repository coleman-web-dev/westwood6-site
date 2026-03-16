'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/shared/ui/dialog';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { CheckCircle2, Award, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { sendBallotEmails } from '@/lib/actions/email-actions';
import { QuorumTracker } from './quorum-tracker';
import type { Ballot, BallotOption, BallotResultCache, QuorumStatus } from '@/lib/types/database';

interface ResultsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ballot: Ballot;
  onUpdated?: () => void;
}

interface ResultWithOption extends BallotResultCache {
  option?: BallotOption;
}

export function ResultsViewer({ open, onOpenChange, ballot, onUpdated }: ResultsViewerProps) {
  const { isBoard, community, member } = useCommunity();
  const [results, setResults] = useState<ResultWithOption[]>([]);
  const [quorum, setQuorum] = useState<QuorumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [certifying, setCertifying] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadResults();
  }, [open, ballot.id]);

  async function loadResults() {
    setLoading(true);
    const supabase = createClient();

    // Fetch results + options
    const [{ data: resultData }, { data: optionData }, { data: quorumData }] = await Promise.all([
      supabase
        .from('ballot_results_cache')
        .select('*')
        .eq('ballot_id', ballot.id)
        .order('vote_count', { ascending: false }),
      supabase
        .from('ballot_options')
        .select('*')
        .eq('ballot_id', ballot.id)
        .order('display_order'),
      supabase.rpc('get_ballot_quorum_status', { p_ballot_id: ballot.id }),
    ]);

    const optionsMap = new Map<string, BallotOption>();
    for (const opt of (optionData as BallotOption[]) ?? []) {
      optionsMap.set(opt.id, opt);
    }

    const enriched: ResultWithOption[] = ((resultData as BallotResultCache[]) ?? []).map((r) => ({
      ...r,
      option: optionsMap.get(r.option_id),
    }));

    setResults(enriched);
    if (quorumData) setQuorum(quorumData as unknown as QuorumStatus);
    setLoading(false);
  }

  async function handlePublish() {
    setPublishing(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('ballots')
      .update({ results_published: true, results_published_at: new Date().toISOString() })
      .eq('id', ballot.id);

    if (error) {
      toast.error('Failed to publish results.');
    } else {
      toast.success('Results published. All members can now view them.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'ballot_results_published',
        targetType: 'ballot',
        targetId: ballot.id,
        metadata: { title: ballot.title },
      });

      // Notify all members
      await supabase.rpc('create_member_notifications', {
        p_community_id: ballot.community_id,
        p_type: 'ballot_results',
        p_title: `Results: ${ballot.title}`,
        p_body: 'Voting results have been published.',
        p_reference_id: ballot.id,
        p_reference_type: 'ballot',
      });

      // Queue results published email notifications (fire-and-forget)
      sendBallotEmails(
        community.id,
        community.slug,
        ballot.title,
        ballot.ballot_type,
        'results_published',
      ).catch((err) => console.error('Failed to queue ballot results emails:', err));

      onUpdated?.();
    }
    setPublishing(false);
  }

  async function handleCertify() {
    setCertifying(true);
    const supabase = createClient();

    // Get current member for certification
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single();

    const { error } = await supabase
      .from('ballots')
      .update({
        status: 'certified',
        certified_at: new Date().toISOString(),
        certified_by: memberData?.id ?? null,
      })
      .eq('id', ballot.id);

    if (error) {
      toast.error('Failed to certify ballot.');
    } else {
      toast.success('Ballot certified as official record.');
      logAuditEvent({
        communityId: community.id,
        actorId: member?.user_id,
        actorEmail: member?.email,
        action: 'ballot_certified',
        targetType: 'ballot',
        targetId: ballot.id,
        metadata: { title: ballot.title },
      });
      onUpdated?.();
    }
    setCertifying(false);
  }

  const maxVotes = results.length > 0 ? Math.max(...results.map((r) => r.vote_count)) : 0;
  const totalVotes = quorum?.total_voted ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-secondary-500" />
            Results: {ballot.title}
          </DialogTitle>
          <DialogDescription>
            {ballot.status === 'certified'
              ? `Certified on ${format(new Date(ballot.certified_at!), 'MMMM d, yyyy')}`
              : ballot.status === 'closed'
                ? `Closed on ${format(new Date(ballot.closes_at), 'MMMM d, yyyy')}`
                : 'Voting in progress'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted-light dark:text-text-muted-dark" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Quorum status */}
            <QuorumTracker ballotId={ballot.id} />

            {/* Results bars */}
            <div className="space-y-3">
              {results.map((r) => {
                const pct = Math.round(r.vote_percentage * 100);
                const barWidth = maxVotes > 0 ? (r.vote_count / maxVotes) * 100 : 0;
                return (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                          {r.option?.label ?? 'Unknown'}
                        </span>
                        {r.is_winner && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <span className="text-body tabular-nums text-text-secondary-light dark:text-text-secondary-dark">
                        {r.vote_count} vote{r.vote_count !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-primary-100 dark:bg-primary-800/40 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                          r.is_winner
                            ? 'bg-green-500 dark:bg-green-400'
                            : 'bg-secondary-400/70 dark:bg-secondary-500/60'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Approval threshold verdict */}
            {ballot.approval_threshold !== null && (ballot.tally_method === 'yes_no' || ballot.tally_method === 'yes_no_abstain') && (() => {
              const yesResult = results.find((r) => r.option?.label === 'Yes');
              const noResult = results.find((r) => r.option?.label === 'No');
              const yesVotes = yesResult?.vote_count ?? 0;
              const noVotes = noResult?.vote_count ?? 0;
              const substantiveTotal = yesVotes + noVotes;
              const yesPct = substantiveTotal > 0 ? Math.round((yesVotes / substantiveTotal) * 100) : 0;
              const thresholdPct = Math.round(ballot.approval_threshold * 100);
              const passed = yesPct >= thresholdPct && (quorum?.quorum_met ?? false);
              return (
                <div className={`rounded-inner-card border-2 p-3 ${
                  passed
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
                    : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                      Requires {thresholdPct}% approval
                    </span>
                    <span className={`text-body font-semibold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {passed ? 'Passed' : 'Failed'} ({yesPct}%)
                    </span>
                  </div>
                  {!(quorum?.quorum_met ?? false) && (
                    <p className="text-meta text-red-500 mt-1">
                      Quorum was not met. Results may not be valid.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Summary */}
            <div className="rounded-inner-card bg-surface-light-2 dark:bg-surface-dark-2 p-3 space-y-1 text-body">
              <div className="flex justify-between">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Total votes cast</span>
                <span className="text-text-primary-light dark:text-text-primary-dark tabular-nums">{totalVotes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary-light dark:text-text-secondary-dark">Quorum met</span>
                <span className={quorum?.quorum_met ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                  {quorum?.quorum_met ? 'Yes' : 'No'}
                </span>
              </div>
              {ballot.is_secret_ballot && (
                <div className="flex justify-between">
                  <span className="text-text-secondary-light dark:text-text-secondary-dark">Ballot type</span>
                  <span className="text-secondary-500">Secret ballot</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {isBoard && ballot.status === 'closed' && !ballot.results_published && (
            <Button variant="outline" onClick={handlePublish} disabled={publishing}>
              <Eye className="h-4 w-4 mr-1" />
              {publishing ? 'Publishing...' : 'Publish Results'}
            </Button>
          )}
          {isBoard && ballot.status === 'closed' && (
            <Button variant="outline" onClick={handleCertify} disabled={certifying}>
              <Award className="h-4 w-4 mr-1" />
              {certifying ? 'Certifying...' : 'Certify Results'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
