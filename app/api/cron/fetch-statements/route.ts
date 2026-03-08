import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAndProcessStatements } from '@/lib/utils/plaid-statements';

/**
 * POST /api/cron/fetch-statements
 * Monthly cron (5th of each month): fetches bank statements from Plaid
 * for all active connections with Statements consent, processes them
 * with AI, and auto-applies categorizations.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: connections } = await admin
    .from('plaid_connections')
    .select('id, community_id')
    .eq('is_active', true)
    .eq('has_statements_consent', true);

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No connections with statements consent', results: [] });
  }

  const results: Record<string, unknown>[] = [];

  for (const conn of connections) {
    try {
      const result = await fetchAndProcessStatements(conn.community_id, conn.id);
      results.push({ connectionId: conn.id, ...result });
    } catch (err) {
      results.push({
        connectionId: conn.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ results });
}

export const maxDuration = 300;
