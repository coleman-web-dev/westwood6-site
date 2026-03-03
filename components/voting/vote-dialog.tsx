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
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { BallotStatusBadge } from './ballot-status-badge';
import type { Ballot, BallotOption } from '@/lib/types/database';

interface VoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ballot: Ballot;
  onVoted: () => void;
}

export function VoteDialog({ open, onOpenChange, ballot, onVoted }: VoteDialogProps) {
  const { member } = useCommunity();
  const [options, setOptions] = useState<BallotOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedOptions(new Set());
      setVoted(false);
      return;
    }
    const supabase = createClient();
    async function loadOptions() {
      setLoading(true);
      const { data } = await supabase
        .from('ballot_options')
        .select('*')
        .eq('ballot_id', ballot.id)
        .order('display_order');
      setOptions((data as BallotOption[]) ?? []);
      setLoading(false);
    }
    loadOptions();
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

  async function handleSubmit() {
    if (selectedOptions.size === 0) {
      toast.error('Please select an option.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc('cast_vote', {
      p_ballot_id: ballot.id,
      p_option_ids: Array.from(selectedOptions),
      p_voter_unit_id: null,
      p_is_proxy: false,
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
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || selectedOptions.size === 0}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
