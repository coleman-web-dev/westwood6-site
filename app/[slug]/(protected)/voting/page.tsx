'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Vote, Plus } from 'lucide-react';
import { BallotList } from '@/components/voting/ballot-list';
import { CreateBallotDialog } from '@/components/voting/create-ballot-dialog';
import { VoteDialog } from '@/components/voting/vote-dialog';
import { ResultsViewer } from '@/components/voting/results-viewer';
import { VotingUpsell } from '@/components/voting/voting-upsell';
import type { Ballot } from '@/lib/types/database';

export default function VotingPage() {
  const { community, isBoard } = useCommunity();
  const votingEnabled = community.theme?.voting_enabled === true;

  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBallot, setEditBallot] = useState<Ballot | null>(null);
  const [voteBallot, setVoteBallot] = useState<Ballot | null>(null);
  const [resultsBallot, setResultsBallot] = useState<Ballot | null>(null);

  const fetchBallots = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('ballots')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false });
    setBallots((data as Ballot[]) ?? []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => {
    if (votingEnabled) fetchBallots();
    else setLoading(false);
  }, [votingEnabled, fetchBallots]);

  if (!votingEnabled) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Vote className="h-6 w-6 text-secondary-500" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Voting
          </h1>
        </div>
        <VotingUpsell />
      </div>
    );
  }

  // Filter ballots by status for tabs
  const activeBallots = ballots.filter((b) => b.status === 'open');
  const upcomingBallots = ballots.filter((b) => b.status === 'draft' || b.status === 'scheduled');
  const pastBallots = ballots.filter((b) =>
    b.status === 'closed' || b.status === 'certified' || b.status === 'cancelled',
  );

  function handleEdit(ballot: Ballot) {
    setEditBallot(ballot);
    setCreateOpen(true);
  }

  function handleEditClose() {
    setCreateOpen(false);
    setEditBallot(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <Vote className="h-6 w-6 text-secondary-500" />
          <h1 className="text-page-title text-text-primary-light dark:text-text-primary-dark">
            Voting
          </h1>
        </div>
        {isBoard && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Ballot
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {activeBallots.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-secondary-500 text-white text-[10px] font-semibold">
                {activeBallots.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingBallots.length > 0 && (
              <span className="ml-1.5 text-meta text-text-muted-light dark:text-text-muted-dark">
                ({upcomingBallots.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <BallotList
            ballots={activeBallots}
            loading={loading}
            onEdit={handleEdit}
            onVote={(b) => setVoteBallot(b)}
            onViewResults={(b) => setResultsBallot(b)}
            onRefresh={fetchBallots}
          />
        </TabsContent>

        <TabsContent value="upcoming">
          <BallotList
            ballots={upcomingBallots}
            loading={loading}
            onEdit={handleEdit}
            onVote={(b) => setVoteBallot(b)}
            onViewResults={(b) => setResultsBallot(b)}
            onRefresh={fetchBallots}
          />
        </TabsContent>

        <TabsContent value="past">
          <BallotList
            ballots={pastBallots}
            loading={loading}
            onEdit={handleEdit}
            onVote={(b) => setVoteBallot(b)}
            onViewResults={(b) => setResultsBallot(b)}
            onRefresh={fetchBallots}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <CreateBallotDialog
        open={createOpen}
        onOpenChange={handleEditClose}
        onSuccess={fetchBallots}
        editBallot={editBallot ?? undefined}
      />

      {/* Vote Dialog */}
      {voteBallot && (
        <VoteDialog
          open={!!voteBallot}
          onOpenChange={(open) => !open && setVoteBallot(null)}
          ballot={voteBallot}
          onVoted={fetchBallots}
        />
      )}

      {/* Results Viewer */}
      {resultsBallot && (
        <ResultsViewer
          open={!!resultsBallot}
          onOpenChange={(open) => !open && setResultsBallot(null)}
          ballot={resultsBallot}
          onUpdated={fetchBallots}
        />
      )}
    </div>
  );
}
