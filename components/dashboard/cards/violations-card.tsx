'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { DashboardCardShell } from './dashboard-card-shell';
import { ShieldCheck } from 'lucide-react';

interface SeverityCount {
  severity: string;
  count: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  warning: 'text-yellow-600 dark:text-yellow-400',
  minor: 'text-blue-600 dark:text-blue-400',
  major: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
};

export function ViolationsCard() {
  const { community } = useCommunity();
  const [counts, setCounts] = useState<SeverityCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      // Get open violations grouped by severity
      const { data } = await supabase
        .from('violations')
        .select('severity')
        .eq('community_id', community.id)
        .in('status', ['reported', 'under_review', 'notice_sent', 'escalated']);

      if (data) {
        const map = new Map<string, number>();
        for (const row of data) {
          map.set(row.severity, (map.get(row.severity) || 0) + 1);
        }
        const result: SeverityCount[] = [];
        for (const sev of ['critical', 'major', 'minor', 'warning']) {
          const c = map.get(sev);
          if (c) result.push({ severity: sev, count: c });
        }
        setCounts(result);
        setTotal(data.length);
      }
      setLoading(false);
    }

    fetch();
  }, [community.id]);

  return (
    <DashboardCardShell title="Open Violations">
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="animate-pulse h-5 rounded bg-muted" />)}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <ShieldCheck className="h-8 w-8 text-text-muted-light dark:text-text-muted-dark" />
          <p className="text-body text-text-muted-light dark:text-text-muted-dark">No open violations.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-metric-xl tabular-nums text-text-primary-light dark:text-text-primary-dark">
              {total}
            </p>
            <div className="flex flex-wrap gap-3">
              {counts.map((c) => (
                <div key={c.severity} className="flex items-center gap-1.5">
                  <span className={`text-body font-semibold tabular-nums ${SEVERITY_COLORS[c.severity] || ''}`}>
                    {c.count}
                  </span>
                  <span className="text-meta text-text-muted-light dark:text-text-muted-dark capitalize">
                    {c.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Link
            href={`/${community.slug}/violations`}
            className="block text-center text-label text-secondary-500 dark:text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
          >
            View violations
          </Link>
        </div>
      )}
    </DashboardCardShell>
  );
}
