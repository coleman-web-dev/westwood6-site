'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCommunity } from '@/lib/providers/community-provider';
import { Button } from '@/components/shared/ui/button';
import type { AuditLog } from '@/lib/types/audit';

const ACTION_LABELS: Record<string, string> = {
  login_success: 'Login',
  login_failed: 'Failed login',
  member_deprovisioned: 'Member removed',
  mfa_enrolled: 'MFA enabled',
  mfa_removed: 'MFA disabled',
  plaid_connected: 'Bank connected',
  role_changed: 'Role changed',
  settings_changed: 'Settings updated',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AuditLogViewer() {
  const { community } = useCommunity();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  useEffect(() => {
    loadLogs(0);
  }, [community.id]);

  async function loadLogs(pageNum: number) {
    setLoading(true);
    const supabase = createClient();
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    setLogs(data || []);
    setHasMore((data?.length || 0) === PAGE_SIZE);
    setPage(pageNum);
    setLoading(false);
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-stroke-light dark:border-stroke-dark rounded-panel p-card-padding">
      <h2 className="text-card-title text-text-primary-light dark:text-text-primary-dark mb-4">
        Audit Log
      </h2>
      <p className="text-meta text-text-muted-light dark:text-text-muted-dark mb-4">
        Security events and access history for your community.
      </p>

      {loading ? (
        <div className="text-body text-text-muted-light dark:text-text-muted-dark py-8 text-center">
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-body text-text-muted-light dark:text-text-muted-dark py-8 text-center">
          No audit events recorded yet.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-stroke-light dark:border-stroke-dark text-left">
                  <th className="py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Date
                  </th>
                  <th className="py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Actor
                  </th>
                  <th className="py-2 pr-4 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Action
                  </th>
                  <th className="py-2 text-label text-text-secondary-light dark:text-text-secondary-dark font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-stroke-light/50 dark:border-stroke-dark/50"
                  >
                    <td className="py-2.5 pr-4 text-meta text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2.5 pr-4 text-text-primary-light dark:text-text-primary-dark">
                      {log.actor_email || 'System'}
                    </td>
                    <td className="py-2.5 pr-4 text-text-primary-light dark:text-text-primary-dark">
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="py-2.5 text-text-muted-light dark:text-text-muted-dark">
                      {log.target_type && (
                        <span className="text-meta">
                          {log.target_type}
                          {log.metadata &&
                            Object.keys(log.metadata).length > 0 &&
                            ` \u00b7 ${Object.entries(log.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => loadLogs(page - 1)}
            >
              Previous
            </Button>
            <span className="text-meta text-text-muted-light dark:text-text-muted-dark">
              Page {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => loadLogs(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
