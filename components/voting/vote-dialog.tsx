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
import { ScrollArea } from '@/components/shared/ui/scroll-area';
import { CheckCircle2, Lock, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { logAuditEvent } from '@/lib/audit';
import { BallotStatusBadge } from './ballot-status-badge';
import type { Ballot, BallotOption, VotingConfig } from '@/lib/types/database';
import { VOTING_CONFIG_DEFAULTS } from '@/lib/types/database';

interface ProxyUnit {
  unit_id: string;
  unit_number: string;
}

interface VoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ballot: Ballot;
  onVoted: () => void;
}

export function VoteDialog({ open, onOpenChange, ballot, onVoted }: VoteDialogProps) {
  const { community, member } = useCommunity();
  const votingConfig: VotingConfig = { ...VOTING_CONFIG_DEFAULTS, ...(community?.theme?.voting_config as Partial<VotingConfig> | undefined) };
  const proxyAllowed = votingConfig.proxy_voting_allowed &&
    (ballot.ballot_type !== 'board_election' || votingConfig.proxy_voting_for_elections);
  const [options, setOptions] = useState<BallotOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [voted, setVoted] = useState(false);
  const [proxyUnits, setProxyUnits] = useState<ProxyUnit[]>([]);
  const [votingAsProxy, setVotingAsProxy] = useState<string | null>(null); // unit_id or null for self

  useEffect(() => {
    if (!open) {
      setSelectedOptions(new Set());
      setVoted(false);
      setConfirming(false);
      setVotingAsProxy(null);
      return;
    }
    const supabase = createClient();
    async function loadData() {
      setLoading(true);
      const [{ data: optData, error }, { data: proxyData }] = await Promise.all([
        supabase
          .from('ballot_options')
          .select('*')
          .eq('ballot_id', ballot.id)
          .order('display_order'),
        proxyAllowed && member
          ? supabase
              .from('proxy_authorizations')
              .select('grantor_unit_id, grantor_unit:units!proxy_authorizations_grantor_unit_id_fkey(unit_number)')
              .eq('grantee_member_id', member.id)
              .eq('status', 'active')
              .or(`ballot_id.is.null,ballot_id.eq.${ballot.id}`)
          : Promise.resolve({ data: [] }),
      ]);
      if (error) {
        toast.error('Failed to load ballot options. Please try again.');
      }
      setOptions((optData as BallotOption[]) ?? []);
      setProxyUnits(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((proxyData ?? []) as any[]).map((p) => ({
          unit_id: p.grantor_unit_id,
          unit_number: p.grantor_unit?.unit_number ?? 'Unknown',
        })),
      );
      setLoading(false);
    }
    loadData();
  }, [open, ballot.id]);

  function toggleOption(optionId: string) {
    const next = new Set(selectedOptions);
    if (next.has(optionId)) {
      next.delete(optionId);
    } else {
      // For single-select, clear previous selection
      if (ballot.max_selections === 1) {
        next.clear();
      } else if (next.size >= ballot.max_selections) {
        toast.error(`You can select up to ${ballot.max_selections} options.`);
        return;
      }
      next.add(optionId);
    }
    setSelectedOptions(next);
  }

  function handleConfirmStep() {
    if (selectedOptions.size === 0) {
      toast.error('Please select an option.');
      return;
    }
    setConfirming(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc('cast_vote', {
      p_ballot_id: ballot.id,
      p_option_ids: Array.from(selectedOptions),
      p_voter_unit_id: votingAsProxy ?? null,
      p_is_proxy: !!votingAsProxy,
    });

    setSubmitting(false);

    if (error) {
      toast.error('Failed to cast vote. Please try again.');
      return;
    }

    const result = data as { success?: boolean; error?: string };
    if (result.error) {
      toast.error(result.error);
      return;
    }

    logAuditEvent({
      communityId: community.id,
      actorId: member?.user_id,
      actorEmail: member?.email,
      action: 'vote_cast',
      targetType: 'ballot',
      targetId: ballot.id,
      metadata: { title: ballot.title, is_secret: ballot.is_secret_ballot, is_proxy: !!votingAsProxy, proxy_unit_id: votingAsProxy },
    });
    setVoted(true);
    onVoted();
  }

  const isSingleSelect = ballot.max_selections === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {voted ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Vote Recorded
              </>
            ) : (
              'Cast Your Vote'
            )}
          </DialogTitle>
          <DialogDescription>
            {voted
              ? 'Your vote has been securely recorded.'
              : ballot.title}
          </DialogDescription>
        </DialogHeader>

        {voted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="text-body text-text-primary-light dark:text-text-primary-dark font-medium">
                Thank you for voting!
              </p>
              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-1">
                Recorded at {format(new Date(), 'MMMM d, yyyy h:mm a')}
              </p>
              {ballot.is_secret_ballot && (
                <div className="flex items-center justify-center gap-1.5 mt-2 text-meta text-secondary-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secret ballot: your vote is anonymous
                </div>
              )}
            </div>
          </div>
        ) : confirming ? (
          <div className="space-y-4 py-2">
            <div className="rounded-inner-card border-2 border-secondary-300 dark:border-secondary-700 bg-secondary-50/30 dark:bg-secondary-950/20 p-4 space-y-3">
              <p className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                Confirm your selection{selectedOptions.size > 1 ? 's' : ''}:
              </p>
              <ul className="space-y-1.5">
                {options.filter((o) => selectedOptions.has(o.id)).map((opt) => (
                  <li key={opt.id} className="flex items-center gap-2 text-body text-text-primary-light dark:text-text-primary-dark">
                    <CheckCircle2 className="h-4 w-4 text-secondary-500 shrink-0" />
                    {opt.label}
                  </li>
                ))}
              </ul>
            </div>
            {votingAsProxy && (
              <p className="text-body text-secondary-500 flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Voting as proxy for Unit {proxyUnits.find((p) => p.unit_id === votingAsProxy)?.unit_number}
              </p>
            )}
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Your vote cannot be changed after submission.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Ballot info */}
            <div className="flex items-center gap-2 flex-wrap">
              <BallotStatusBadge status={ballot.status} />
              {ballot.is_secret_ballot && (
                <span className="inline-flex items-center gap-1 text-meta text-secondary-500">
                  <Lock className="h-3 w-3" />
                  Secret ballot
                </span>
              )}
            </div>

            {ballot.description && (
              <p className="text-body text-text-secondary-light dark:text-text-secondary-dark">
                {ballot.description}
              </p>
            )}

            {/* Proxy voting selector */}
            {proxyUnits.length > 0 && (
              <div className="rounded-inner-card border border-stroke-light dark:border-stroke-dark p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary-500" />
                  <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                    Vote on behalf of:
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setVotingAsProxy(null)}
                    className={`px-3 py-1.5 rounded-pill text-meta font-medium transition-colors ${
                      votingAsProxy === null
                        ? 'bg-secondary-500 text-white'
                        : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark'
                    }`}
                  >
                    Yourself
                  </button>
                  {proxyUnits.map((pu) => (
                    <button
                      key={pu.unit_id}
                      type="button"
                      onClick={() => setVotingAsProxy(pu.unit_id)}
                      className={`px-3 py-1.5 rounded-pill text-meta font-medium transition-colors ${
                        votingAsProxy === pu.unit_id
                          ? 'bg-secondary-500 text-white'
                          : 'bg-surface-light-2 dark:bg-surface-dark-2 text-text-secondary-light dark:text-text-secondary-dark'
                      }`}
                    >
                      Unit {pu.unit_number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-1.5">
              <p className="text-label text-text-secondary-light dark:text-text-secondary-dark">
                {isSingleSelect ? 'Select one option:' : `Select up to ${ballot.max_selections} options:`}
              </p>
              <ScrollArea className={options.length > 6 ? 'h-[300px]' : ''}>
                <div className="space-y-2">
                  {options.map((opt) => {
                    const isSelected = selectedOptions.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(opt.id)}
                        className={`w-full text-left rounded-inner-card border-2 p-3 transition-colors ${
                          isSelected
                            ? 'border-secondary-500 bg-secondary-50/50 dark:bg-secondary-950/20'
                            : 'border-stroke-light dark:border-stroke-dark hover:border-secondary-300 dark:hover:border-secondary-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`shrink-0 w-5 h-5 rounded-${isSingleSelect ? 'full' : 'md'} border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-secondary-500 bg-secondary-500'
                                : 'border-primary-300 dark:border-primary-600'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <span className="text-body font-medium text-text-primary-light dark:text-text-primary-dark">
                              {opt.label}
                            </span>
                            {opt.description && (
                              <p className="text-meta text-text-muted-light dark:text-text-muted-dark mt-0.5">
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Closing time */}
            <p className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Voting closes {format(new Date(ballot.closes_at), 'MMMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {voted ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Go Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Cast Vote'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStep}
                disabled={selectedOptions.size === 0}
              >
                Review Vote
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
