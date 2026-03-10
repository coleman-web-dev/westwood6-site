import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COMMUNITY_ID, UNIT_1_ID } from '../helpers/fixtures';

// ─── Mock setup ─────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown };
let tableResults: Record<string, QueryResult>;

function resetMock() {
  tableResults = {};
  postInvoiceCreatedCalls = [];
  postPaymentReceivedCalls = [];
  postOverpaymentWalletCreditCalls = [];
  postInvoiceWaivedCalls = [];
  postInvoiceVoidedCalls = [];
}

function setTableResult(table: string, result: QueryResult) {
  tableResults[table] = result;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const config = tableResults[table] ?? { data: null, error: null };

      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'is', 'order', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        return Promise.resolve(config).then(resolve);
      };

      return chain;
    },
  }),
}));

let postInvoiceCreatedCalls: unknown[] = [];
let postPaymentReceivedCalls: unknown[] = [];
let postOverpaymentWalletCreditCalls: unknown[] = [];
let postInvoiceWaivedCalls: unknown[] = [];
let postInvoiceVoidedCalls: unknown[] = [];

vi.mock('@/lib/utils/accounting-entries', () => ({
  postInvoiceCreated: vi.fn().mockImplementation((...args: unknown[]) => {
    postInvoiceCreatedCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
  postPaymentReceived: vi.fn().mockImplementation((...args: unknown[]) => {
    postPaymentReceivedCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
  postOverpaymentWalletCredit: vi.fn().mockImplementation((...args: unknown[]) => {
    postOverpaymentWalletCreditCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
  postInvoiceWaived: vi.fn().mockImplementation((...args: unknown[]) => {
    postInvoiceWaivedCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
  postInvoiceVoided: vi.fn().mockImplementation((...args: unknown[]) => {
    postInvoiceVoidedCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { backfillJournalEntries } from '@/lib/utils/accounting-backfill';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('backfillJournalEntries', () => {
  beforeEach(() => {
    resetMock();
  });

  it('returns zero stats when no invoices exist', async () => {
    setTableResult('invoices', { data: [], error: null });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result).toEqual({ invoices: 0, payments: 0, walletCredits: 0, errors: 0 });
    expect(postInvoiceCreatedCalls).toHaveLength(0);
  });

  it('returns zero stats when invoices query returns null', async () => {
    setTableResult('invoices', { data: null, error: null });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result).toEqual({ invoices: 0, payments: 0, walletCredits: 0, errors: 0 });
  });

  it('posts invoice creation for all invoices', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Jan Dues', created_at: '2026-01-01', assessment_id: null },
        { id: 'inv-2', unit_id: UNIT_1_ID, amount: 3000, amount_paid: 0, status: 'pending', title: 'Feb Dues', created_at: '2026-02-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result.invoices).toBe(2);
    expect(postInvoiceCreatedCalls).toHaveLength(2);
  });

  it('posts payment entry for paid invoices', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 5000, status: 'paid', title: 'Jan Dues', created_at: '2026-01-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result.invoices).toBe(1);
    expect(result.payments).toBe(1);
    expect(postPaymentReceivedCalls).toHaveLength(1);
  });

  it('posts overpayment wallet credit when amount_paid > amount', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 7000, status: 'paid', title: 'Jan Dues', created_at: '2026-01-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result.walletCredits).toBe(1);
    expect(postOverpaymentWalletCreditCalls).toHaveLength(1);
    // Overpayment amount = 7000 - 5000 = 2000
    const call = postOverpaymentWalletCreditCalls[0] as unknown[];
    expect(call[3]).toBe(2000);
  });

  it('posts waived entry for waived invoices with remaining balance', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 2000, status: 'waived', title: 'Jan Dues', created_at: '2026-01-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(postInvoiceWaivedCalls).toHaveLength(1);
    // Waived amount = 5000 - 2000 = 3000
    const call = postInvoiceWaivedCalls[0] as unknown[];
    expect(call[3]).toBe(3000);
  });

  it('posts voided entry for voided invoices', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'voided', title: 'Jan Dues', created_at: '2026-01-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(postInvoiceVoidedCalls).toHaveLength(1);
  });

  it('detects special assessments and passes isSpecial flag', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 10000, amount_paid: 0, status: 'pending', title: 'Special Assessment', created_at: '2026-01-01', assessment_id: 'assess-special' },
      ],
      error: null,
    });
    setTableResult('assessments', {
      data: [{ id: 'assess-special', type: 'special' }],
      error: null,
    });

    await backfillJournalEntries(COMMUNITY_ID);

    expect(postInvoiceCreatedCalls).toHaveLength(1);
    // isSpecial flag (6th argument) should be true
    const call = postInvoiceCreatedCalls[0] as unknown[];
    expect(call[5]).toBe(true);
  });

  it('handles all invoice statuses in one batch', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 5000, status: 'paid', title: 'Paid', created_at: '2026-01-01', assessment_id: null },
        { id: 'inv-2', unit_id: UNIT_1_ID, amount: 3000, amount_paid: 1000, status: 'partial', title: 'Partial', created_at: '2026-01-15', assessment_id: null },
        { id: 'inv-3', unit_id: UNIT_1_ID, amount: 4000, amount_paid: 0, status: 'waived', title: 'Waived', created_at: '2026-02-01', assessment_id: null },
        { id: 'inv-4', unit_id: UNIT_1_ID, amount: 2000, amount_paid: 0, status: 'voided', title: 'Voided', created_at: '2026-02-15', assessment_id: null },
        { id: 'inv-5', unit_id: UNIT_1_ID, amount: 1000, amount_paid: 0, status: 'pending', title: 'Pending', created_at: '2026-03-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    expect(result.invoices).toBe(5); // All 5 invoices get creation entries
    expect(result.payments).toBe(2); // paid + partial
    expect(postInvoiceWaivedCalls).toHaveLength(1); // waived
    expect(postInvoiceVoidedCalls).toHaveLength(1); // voided
    expect(result.errors).toBe(0);
  });

  it('calls progress callback with correct counts', async () => {
    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Jan', created_at: '2026-01-01', assessment_id: null },
        { id: 'inv-2', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Feb', created_at: '2026-02-01', assessment_id: null },
        { id: 'inv-3', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Mar', created_at: '2026-03-01', assessment_id: null },
      ],
      error: null,
    });

    const progressCalls: [number, number][] = [];
    await backfillJournalEntries(COMMUNITY_ID, (current, total) => {
      progressCalls.push([current, total]);
    });

    expect(progressCalls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('continues processing after individual invoice errors', async () => {
    // Make the first call to postInvoiceCreated fail
    const { postInvoiceCreated } = await import('@/lib/utils/accounting-entries');
    const mockedFn = postInvoiceCreated as ReturnType<typeof vi.fn>;
    mockedFn.mockRejectedValueOnce(new Error('DB error'));

    setTableResult('invoices', {
      data: [
        { id: 'inv-1', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Fails', created_at: '2026-01-01', assessment_id: null },
        { id: 'inv-2', unit_id: UNIT_1_ID, amount: 5000, amount_paid: 0, status: 'pending', title: 'Succeeds', created_at: '2026-02-01', assessment_id: null },
      ],
      error: null,
    });

    const result = await backfillJournalEntries(COMMUNITY_ID);

    // First invoice errors, second succeeds
    expect(result.errors).toBe(1);
    expect(result.invoices).toBe(1);
  });
});
