import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createJournalEntry } from '@/lib/utils/accounting-entries';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Find all active recurring entries due today or earlier
  const { data: entries } = await admin
    .from('recurring_journal_entries')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_date', today);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      const lines = entry.lines as { accountCode: string; debit: number; credit: number; description?: string }[];

      await createJournalEntry({
        communityId: entry.community_id,
        entryDate: entry.next_run_date,
        description: entry.description,
        source: 'recurring',
        memo: entry.memo,
        createdBy: entry.created_by,
        lines,
      });

      // Calculate next run date
      const current = new Date(entry.next_run_date);
      let next: Date;
      switch (entry.frequency) {
        case 'monthly':
          next = new Date(current);
          next.setMonth(next.getMonth() + 1);
          break;
        case 'quarterly':
          next = new Date(current);
          next.setMonth(next.getMonth() + 3);
          break;
        case 'annually':
          next = new Date(current);
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          next = new Date(current);
          next.setMonth(next.getMonth() + 1);
      }

      const nextRunDate = next.toISOString().split('T')[0];
      const isActive = !entry.end_date || nextRunDate <= entry.end_date;

      await admin
        .from('recurring_journal_entries')
        .update({
          last_run_date: entry.next_run_date,
          next_run_date: nextRunDate,
          times_run: entry.times_run + 1,
          is_active: isActive,
        })
        .eq('id', entry.id);

      processed++;
    } catch (err) {
      console.error(`Failed to process recurring entry ${entry.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ processed, errors });
}
