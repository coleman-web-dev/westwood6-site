import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncBankTransactions } from '@/lib/utils/plaid-sync';

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all active connections that aren't in an error state
  const { data: connections, error } = await admin
    .from('plaid_connections')
    .select('id, community_id, last_synced_at')
    .eq('is_active', true)
    .neq('requires_reconsent', true)
    .is('error_code', null);

  if (error) {
    console.error('Failed to fetch plaid connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No active connections to sync', results: [] });
  }

  // Skip connections synced within the last 6 hours
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const connectionsToSync = connections.filter(
    (c) => !c.last_synced_at || c.last_synced_at < sixHoursAgo,
  );

  if (connectionsToSync.length === 0) {
    return NextResponse.json({
      message: 'All connections recently synced',
      results: [],
    });
  }

  const results: {
    connectionId: string;
    communityId: string;
    added: number;
    modified: number;
    removed: number;
    error?: string;
  }[] = [];

  for (const conn of connectionsToSync) {
    try {
      const result = await syncBankTransactions(admin, conn.community_id, conn.id);
      results.push({
        connectionId: conn.id,
        communityId: conn.community_id,
        added: result.added,
        modified: result.modified,
        removed: result.removed,
        error: result.error,
      });
    } catch (err) {
      console.error(`Sync failed for connection ${conn.id}:`, err);
      results.push({
        connectionId: conn.id,
        communityId: conn.community_id,
        added: 0,
        modified: 0,
        removed: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results });
}
