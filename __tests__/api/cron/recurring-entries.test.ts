import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COMMUNITY_ID } from '../../helpers/fixtures';

// ─── Mock setup ─────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown };
let tableResults: Record<string, QueryResult>;
let updateCalls: { table: string; id: string; data: unknown }[];
let createJournalEntryCalls: unknown[];

function resetMock() {
  tableResults = {};
  updateCalls = [];
  createJournalEntryCalls = [];
}

function setTableResult(table: string, result: QueryResult) {
  tableResults[table] = result;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const config = tableResults[table] ?? { data: null, error: null };

      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'is', 'order', 'limit', 'gte', 'lte', 'gt', 'lt']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.update = vi.fn().mockImplementation((data: unknown) => {
        const updateChain: Record<string, unknown> = {};
        updateChain.eq = vi.fn().mockImplementation((_col: string, id: string) => {
          updateCalls.push({ table, id, data });
          return Promise.resolve({ data: null, error: null });
        });
        return updateChain;
      });

      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        return Promise.resolve(config).then(resolve);
      };

      return chain;
    },
  }),
}));

vi.mock('@/lib/utils/accounting-entries', () => ({
  createJournalEntry: vi.fn().mockImplementation((params: unknown) => {
    createJournalEntryCalls.push(params);
    return Promise.resolve({ data: { id: 'je-new' }, error: null });
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { GET } from '@/app/api/cron/recurring-entries/route';

function makeRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  return new Request('http://localhost:6006/api/cron/recurring-entries', {
    method: 'GET',
    headers,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/cron/recurring-entries', () => {
  beforeEach(() => {
    resetMock();
    createJournalEntryCalls = [];
  });

  it('returns 401 without auth', async () => {
    const res = await GET(makeRequest() as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong secret', async () => {
    const res = await GET(makeRequest('wrong') as any);
    expect(res.status).toBe(401);
  });

  it('returns processed:0 when no entries due', async () => {
    setTableResult('recurring_journal_entries', { data: [], error: null });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(0);
    expect(createJournalEntryCalls).toHaveLength(0);
  });

  it('processes monthly recurring entry and advances next_run_date by 1 month', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Monthly insurance',
          memo: 'Auto-generated',
          frequency: 'monthly',
          next_run_date: '2026-03-01',
          end_date: null,
          lines: [
            { accountCode: '5000', debit: 5000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 5000 },
          ],
          is_active: true,
          last_run_date: '2026-02-01',
          times_run: 2,
          created_by: 'user-1',
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(1);

    // Verify journal entry was created
    expect(createJournalEntryCalls).toHaveLength(1);
    const call = createJournalEntryCalls[0] as Record<string, unknown>;
    expect(call.communityId).toBe(COMMUNITY_ID);
    expect(call.entryDate).toBe('2026-03-01');
    expect(call.source).toBe('recurring');

    // Verify recurring entry was updated
    const update = updateCalls.find((c) => c.table === 'recurring_journal_entries');
    expect(update).toBeDefined();
    const updateData = update?.data as Record<string, unknown>;
    expect(updateData.last_run_date).toBe('2026-03-01');
    expect(updateData.next_run_date).toBe('2026-04-01');
    expect(updateData.times_run).toBe(3);
    expect(updateData.is_active).toBe(true);
  });

  it('processes quarterly entry and advances by 3 months', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Quarterly reserve transfer',
          memo: null,
          frequency: 'quarterly',
          next_run_date: '2026-03-01',
          end_date: null,
          lines: [
            { accountCode: '1010', debit: 10000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 10000 },
          ],
          is_active: true,
          last_run_date: '2025-12-01',
          times_run: 4,
          created_by: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(1);

    const update = updateCalls.find((c) => c.table === 'recurring_journal_entries');
    const updateData = update?.data as Record<string, unknown>;
    expect(updateData.next_run_date).toBe('2026-06-01');
    expect(updateData.times_run).toBe(5);
  });

  it('processes annually entry and advances by 1 year', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Annual audit accrual',
          memo: null,
          frequency: 'annually',
          next_run_date: '2026-01-01',
          end_date: null,
          lines: [
            { accountCode: '5000', debit: 50000, credit: 0 },
            { accountCode: '2000', debit: 0, credit: 50000 },
          ],
          is_active: true,
          last_run_date: '2025-01-01',
          times_run: 1,
          created_by: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(1);

    const update = updateCalls.find((c) => c.table === 'recurring_journal_entries');
    const updateData = update?.data as Record<string, unknown>;
    expect(updateData.next_run_date).toBe('2027-01-01');
    expect(updateData.times_run).toBe(2);
  });

  it('deactivates entry when next_run_date exceeds end_date', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Temporary monthly fee',
          memo: null,
          frequency: 'monthly',
          next_run_date: '2026-12-01',
          end_date: '2026-12-31', // Next run (2027-01-01) will exceed end_date
          lines: [
            { accountCode: '5000', debit: 1000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 1000 },
          ],
          is_active: true,
          last_run_date: '2026-11-01',
          times_run: 11,
          created_by: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(1);

    const update = updateCalls.find((c) => c.table === 'recurring_journal_entries');
    const updateData = update?.data as Record<string, unknown>;
    expect(updateData.is_active).toBe(false);
    expect(updateData.next_run_date).toBe('2027-01-01');
  });

  it('keeps entry active when next_run_date is within end_date', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Monthly fee',
          memo: null,
          frequency: 'monthly',
          next_run_date: '2026-03-01',
          end_date: '2026-12-31', // Next run (2026-04-01) is within end_date
          lines: [
            { accountCode: '5000', debit: 1000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 1000 },
          ],
          is_active: true,
          last_run_date: '2026-02-01',
          times_run: 2,
          created_by: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(1);

    const update = updateCalls.find((c) => c.table === 'recurring_journal_entries');
    const updateData = update?.data as Record<string, unknown>;
    expect(updateData.is_active).toBe(true);
  });

  it('handles multiple entries in single run', async () => {
    setTableResult('recurring_journal_entries', {
      data: [
        {
          id: 'rec-1',
          community_id: COMMUNITY_ID,
          description: 'Entry 1',
          memo: null,
          frequency: 'monthly',
          next_run_date: '2026-03-01',
          end_date: null,
          lines: [
            { accountCode: '5000', debit: 1000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 1000 },
          ],
          is_active: true,
          last_run_date: null,
          times_run: 0,
          created_by: null,
        },
        {
          id: 'rec-2',
          community_id: COMMUNITY_ID,
          description: 'Entry 2',
          memo: null,
          frequency: 'quarterly',
          next_run_date: '2026-03-01',
          end_date: null,
          lines: [
            { accountCode: '5100', debit: 2000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 2000 },
          ],
          is_active: true,
          last_run_date: null,
          times_run: 0,
          created_by: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(2);
    expect(createJournalEntryCalls).toHaveLength(2);
    expect(updateCalls).toHaveLength(2);
  });
});
