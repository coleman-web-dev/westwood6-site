'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { QuorumStatus } from '@/lib/types/database';

interface QuorumTrackerProps {
  ballotId: string;
  /** Refresh quorum data on mount and whenever this key changes */
  refreshKey?: number;
}

export function QuorumTracker({ ballotId, refreshKey }: QuorumTrackerProps) {
  const [quorum, setQuorum] = useState<QuorumStatus | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase.rpc('get_ballot_quorum_status', {
        p_ballot_id: ballotId,
      });
      if (data) setQuorum(data as unknown as QuorumStatus);
    }
    load();
  }, [ballotId, refreshKey]);

  if (!quorum) return null;

  const pct = Math.round(quorum.participation_rate * 100);
  const thresholdPct = Math.round(quorum.quorum_threshold * 100);

  let barColor = 'bg-red-400 dark:bg-red-500';
  if (quorum.quorum_met) {
    barColor = 'bg-green-500 dark:bg-green-400';
  } else if (pct >= thresholdPct * 0.7) {
    barColor = 'bg-amber-400 dark:bg-amber-500';
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-meta">
        <span className="text-text-secondary-light dark:text-text-secondary-dark">
          Participation: {quorum.total_voted} of {quorum.total_eligible} units ({pct}%)
        </span>
        <span className={quorum.quorum_met ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-text-muted-light dark:text-text-muted-dark'}>
          {quorum.quorum_met ? 'Quorum met' : `${thresholdPct}% needed`}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-primary-100 dark:bg-primary-800/40 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute inset-y-0 w-0.5 bg-text-primary-light/40 dark:bg-text-primary-dark/40"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
    </div>
  );
}
