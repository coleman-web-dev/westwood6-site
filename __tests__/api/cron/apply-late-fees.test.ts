import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COMMUNITY_ID } from '../../helpers/fixtures';

// ─── Mock setup ─────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown };
let tableResults: Record<string, QueryResult>;
let updateCalls: { table: string; id: string; data: unknown }[];

function resetMock() {
  tableResults = {};
  updateCalls = [];
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

// ─── Import after mocks ─────────────────────────────────────────────────────

import { POST } from '@/app/api/cron/apply-late-fees/route';

function makeRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }
  return new Request('http://localhost:6006/api/cron/apply-late-fees', {
    method: 'POST',
    headers,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/cron/apply-late-fees', () => {
  beforeEach(() => {
    resetMock();
  });

  it('returns 401 without CRON_SECRET', async () => {
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong secret', async () => {
    const res = await POST(makeRequest('wrong-secret') as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET env is not set', async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await POST(makeRequest('test-cron-secret') as any);
      expect(res.status).toBe(401);
    } finally {
      process.env.CRON_SECRET = original;
    }
  });

  it('applies flat fee to overdue invoices', async () => {
    setTableResult('communities', {
      data: [
        {
          id: COMMUNITY_ID,
          theme: {
            payment_settings: {
              late_fee_settings: {
                enabled: true,
                grace_period_days: 5,
                fee_type: 'flat',
                fee_amount: 2500, // $25.00 in cents
                max_fee: null,
              },
            },
          },
        },
      ],
      error: null,
    });

    setTableResult('invoices', {
      data: [
        { id: 'inv-1', amount: 10000, late_fee_amount: 0 },
        { id: 'inv-2', amount: 20000, late_fee_amount: 0 },
      ],
      error: null,
    });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.applied).toBe(2);

    // Both invoices should get flat $25 fee
    const inv1Update = updateCalls.find((c) => c.id === 'inv-1');
    expect(inv1Update).toBeDefined();
    expect((inv1Update?.data as Record<string, unknown>)?.late_fee_amount).toBe(2500);
    expect((inv1Update?.data as Record<string, unknown>)?.amount).toBe(12500); // 10000 + 2500

    const inv2Update = updateCalls.find((c) => c.id === 'inv-2');
    expect(inv2Update).toBeDefined();
    expect((inv2Update?.data as Record<string, unknown>)?.late_fee_amount).toBe(2500);
    expect((inv2Update?.data as Record<string, unknown>)?.amount).toBe(22500); // 20000 + 2500
  });

  it('applies percentage fee', async () => {
    setTableResult('communities', {
      data: [
        {
          id: COMMUNITY_ID,
          theme: {
            payment_settings: {
              late_fee_settings: {
                enabled: true,
                grace_period_days: 5,
                fee_type: 'percentage',
                fee_amount: 10, // 10%
                max_fee: null,
              },
            },
          },
        },
      ],
      error: null,
    });

    setTableResult('invoices', {
      data: [{ id: 'inv-1', amount: 15000, late_fee_amount: 0 }],
      error: null,
    });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.applied).toBe(1);

    const update = updateCalls.find((c) => c.id === 'inv-1');
    // 10% of 15000 = 1500
    expect((update?.data as Record<string, unknown>)?.late_fee_amount).toBe(1500);
    expect((update?.data as Record<string, unknown>)?.amount).toBe(16500);
  });

  it('caps fee at max_fee', async () => {
    setTableResult('communities', {
      data: [
        {
          id: COMMUNITY_ID,
          theme: {
            payment_settings: {
              late_fee_settings: {
                enabled: true,
                grace_period_days: 5,
                fee_type: 'percentage',
                fee_amount: 50, // 50%
                max_fee: 5000, // cap at $50
              },
            },
          },
        },
      ],
      error: null,
    });

    setTableResult('invoices', {
      data: [{ id: 'inv-1', amount: 50000, late_fee_amount: 0 }],
      error: null,
    });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.applied).toBe(1);

    const update = updateCalls.find((c) => c.id === 'inv-1');
    // 50% of 50000 = 25000, but capped at 5000
    expect((update?.data as Record<string, unknown>)?.late_fee_amount).toBe(5000);
    expect((update?.data as Record<string, unknown>)?.amount).toBe(55000);
  });

  it('skips communities with late fees disabled', async () => {
    setTableResult('communities', {
      data: [
        {
          id: COMMUNITY_ID,
          theme: {
            payment_settings: {
              late_fee_settings: { enabled: false },
            },
          },
        },
      ],
      error: null,
    });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(0);
    expect(body.applied).toBe(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('skips communities with no payment settings', async () => {
    setTableResult('communities', {
      data: [{ id: COMMUNITY_ID, theme: null }],
      error: null,
    });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(0);
    expect(body.applied).toBe(0);
  });

  it('returns 0 when no invoices match', async () => {
    setTableResult('communities', {
      data: [
        {
          id: COMMUNITY_ID,
          theme: {
            payment_settings: {
              late_fee_settings: {
                enabled: true,
                grace_period_days: 5,
                fee_type: 'flat',
                fee_amount: 2500,
                max_fee: null,
              },
            },
          },
        },
      ],
      error: null,
    });

    setTableResult('invoices', { data: [], error: null });

    const res = await POST(makeRequest('test-cron-secret') as any);
    const body = await res.json();

    expect(body.processed).toBe(0);
    expect(body.applied).toBe(0);
  });
});
