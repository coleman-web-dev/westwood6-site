import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { COMMUNITY_ID } from '../../helpers/fixtures';

// ─── Mock setup ─────────────────────────────────────────────────────────────

let mockUser: { id: string } | null = null;
let mockMember: { system_role: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({
        data: { user: mockUser },
        error: mockUser ? null : { message: 'Not authenticated' },
      }),
    },
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'order', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      chain.single = vi.fn().mockImplementation(() =>
        Promise.resolve({ data: mockMember, error: mockMember ? null : { message: 'Not found' } })
      );
      return chain;
    },
  }),
}));

// Mock the report functions to isolate route logic
const mockGetTrialBalance = vi.fn().mockResolvedValue([]);
const mockGetBalanceSheet = vi.fn().mockResolvedValue({ is_balanced: true });
const mockGetIncomeStatement = vi.fn().mockResolvedValue({ net_income: 0 });
const mockGetBudgetVariance = vi.fn().mockResolvedValue([]);
const mockGetCashFlowForecast = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/utils/accounting-reports', () => ({
  getTrialBalance: (...args: unknown[]) => mockGetTrialBalance(...args),
  getBalanceSheet: (...args: unknown[]) => mockGetBalanceSheet(...args),
  getIncomeStatement: (...args: unknown[]) => mockGetIncomeStatement(...args),
  getBudgetVariance: (...args: unknown[]) => mockGetBudgetVariance(...args),
  getCashFlowForecast: (...args: unknown[]) => mockGetCashFlowForecast(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { GET } from '@/app/api/accounting/reports/route';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:6006/api/accounting/reports');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/accounting/reports', () => {
  beforeEach(() => {
    mockUser = { id: 'user-123' };
    mockMember = { system_role: 'board' };
    mockGetTrialBalance.mockClear();
    mockGetBalanceSheet.mockClear();
    mockGetIncomeStatement.mockClear();
    mockGetBudgetVariance.mockClear();
    mockGetCashFlowForecast.mockClear();
  });

  it('returns 401 when not authenticated', async () => {
    mockUser = null;
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance' }) as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when community_id is missing', async () => {
    const res = await GET(makeRequest({ report: 'trial-balance' }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when report type is missing', async () => {
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID }) as any);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a board member', async () => {
    mockMember = { system_role: 'resident' };
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance' }) as any);
    expect(res.status).toBe(403);
  });

  it('allows manager role', async () => {
    mockMember = { system_role: 'manager' };
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance' }) as any);
    expect(res.status).toBe(200);
  });

  it('allows super_admin role', async () => {
    mockMember = { system_role: 'super_admin' };
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance' }) as any);
    expect(res.status).toBe(200);
  });

  it('routes trial-balance report', async () => {
    const mockData = [{ code: '1000', name: 'Cash', balance: 5000 }];
    mockGetTrialBalance.mockResolvedValue(mockData);

    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance' }) as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual(mockData);
    expect(mockGetTrialBalance).toHaveBeenCalledWith(COMMUNITY_ID, undefined);
  });

  it('passes as_of_date to trial-balance', async () => {
    mockGetTrialBalance.mockResolvedValue([]);

    await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'trial-balance', as_of_date: '2026-03-01' }) as any);
    expect(mockGetTrialBalance).toHaveBeenCalledWith(COMMUNITY_ID, '2026-03-01');
  });

  it('routes balance-sheet report', async () => {
    const mockData = { is_balanced: true, total_assets: 5000 };
    mockGetBalanceSheet.mockResolvedValue(mockData);

    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'balance-sheet' }) as any);
    expect(res.status).toBe(200);
    expect(mockGetBalanceSheet).toHaveBeenCalledWith(COMMUNITY_ID, undefined);
  });

  it('routes income-statement with required dates', async () => {
    const res = await GET(makeRequest({
      community_id: COMMUNITY_ID,
      report: 'income-statement',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
    }) as any);

    expect(res.status).toBe(200);
    expect(mockGetIncomeStatement).toHaveBeenCalledWith(COMMUNITY_ID, '2026-01-01', '2026-03-31');
  });

  it('returns 400 for income-statement without dates', async () => {
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'income-statement' }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('start_date');
  });

  it('routes budget-variance report', async () => {
    mockGetBudgetVariance.mockResolvedValue([]);

    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'budget-variance', year: '2026' }) as any);
    expect(res.status).toBe(200);
    expect(mockGetBudgetVariance).toHaveBeenCalledWith(COMMUNITY_ID, 2026);
  });

  it('routes cash-flow report with custom months', async () => {
    mockGetCashFlowForecast.mockResolvedValue([]);

    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'cash-flow', months: '12' }) as any);
    expect(res.status).toBe(200);
    expect(mockGetCashFlowForecast).toHaveBeenCalledWith(COMMUNITY_ID, 12);
  });

  it('defaults cash-flow to 6 months', async () => {
    mockGetCashFlowForecast.mockResolvedValue([]);

    await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'cash-flow' }) as any);
    expect(mockGetCashFlowForecast).toHaveBeenCalledWith(COMMUNITY_ID, 6);
  });

  it('returns 400 for unknown report type', async () => {
    const res = await GET(makeRequest({ community_id: COMMUNITY_ID, report: 'nonexistent' }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown');
  });
});
