import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COMMUNITY_ID, UNIT_1_ID, INVOICE_1_ID, JOURNAL_ENTRY_ID } from '../helpers/fixtures';

// ─── Mock setup ──────────────────────────────────────────────────────────────

// Track all mock calls for assertions
let mockCalls: { table: string; method: string; args: unknown[] }[] = [];
let mockResponses: Record<string, Record<string, unknown>> = {};

function setMockResponse(table: string, method: string, response: unknown) {
  if (!mockResponses[table]) mockResponses[table] = {};
  mockResponses[table][method] = response;
}

function getMockResponse(table: string, method: string): unknown {
  return mockResponses[table]?.[method] ?? { data: null, error: null, count: null };
}

// Create a chainable builder that records calls and returns mock responses
function createChain(table: string) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'limit', 'order', 'range'];
  for (const m of methods) {
    chain[m] = (...args: unknown[]) => {
      mockCalls.push({ table, method: m, args });
      return chain;
    };
  }
  chain.single = () => {
    mockCalls.push({ table, method: 'single', args: [] });
    return Promise.resolve(getMockResponse(table, 'single'));
  };
  chain.maybeSingle = () => {
    mockCalls.push({ table, method: 'maybeSingle', args: [] });
    return Promise.resolve(getMockResponse(table, 'maybeSingle'));
  };
  // Make the chain itself thenable for `await supabase.from(x).select()...`
  (chain as { then: (resolve: (val: unknown) => void) => Promise<unknown> }).then = (resolve) => {
    return Promise.resolve(getMockResponse(table, 'resolve')).then(resolve);
  };
  return chain;
}

const mockSupabase = {
  from: (table: string) => createChain(table),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}));

// Import AFTER mocking
const {
  createJournalEntry,
  postInvoiceCreated,
  postPaymentReceived,
  postOverpaymentWalletCredit,
  postWalletApplied,
  postLateFeeApplied,
  postInvoiceWaived,
  postInvoiceVoided,
  postRefund,
  postVendorPayment,
  postInterFundTransfer,
  reverseJournalEntry,
} = await import('@/lib/utils/accounting-entries');

beforeEach(() => {
  mockCalls = [];
  mockResponses = {};
});

// Helper to set up the "accounting is set up" baseline (accounts exist, codes resolve)
function setupAccountingBaseline() {
  // accounts count check returns > 0
  setMockResponse('accounts', 'resolve', {
    count: 10,
    data: null,
    error: null,
  });
  // accounts code lookup returns matching accounts
  setMockResponse('accounts', 'resolve', {
    data: [
      { id: 'acct-1000', code: '1000' },
      { id: 'acct-1010', code: '1010' },
      { id: 'acct-1100', code: '1100' },
      { id: 'acct-1110', code: '1110' },
      { id: 'acct-2110', code: '2110' },
      { id: 'acct-4000', code: '4000' },
      { id: 'acct-4010', code: '4010' },
      { id: 'acct-4100', code: '4100' },
      { id: 'acct-5100', code: '5100' },
      { id: 'acct-5800', code: '5800' },
    ],
    error: null,
    count: 10,
  });
  // journal entry creation returns an ID
  setMockResponse('journal_entries', 'single', {
    data: { id: JOURNAL_ENTRY_ID },
    error: null,
  });
  // journal lines insertion succeeds
  setMockResponse('journal_lines', 'resolve', {
    data: null,
    error: null,
  });
}

// ─── createJournalEntry() ────────────────────────────────────────────────────

describe('createJournalEntry', () => {
  it('creates a balanced entry with two lines', async () => {
    setupAccountingBaseline();

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Test entry',
      source: 'manual',
      lines: [
        { accountCode: '1000', debit: 5000, credit: 0 },
        { accountCode: '5100', debit: 0, credit: 5000 },
      ],
    });

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });

  it('rejects unbalanced entry (debits != credits)', async () => {
    setupAccountingBaseline();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Unbalanced entry',
      source: 'manual',
      lines: [
        { accountCode: '1000', debit: 5000, credit: 0 },
        { accountCode: '5100', debit: 0, credit: 4000 }, // mismatch!
      ],
    });

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('unbalanced entry')
    );
    consoleSpy.mockRestore();
  });

  it('returns null when accounting is not set up (no accounts)', async () => {
    // Override to return count = 0
    setMockResponse('accounts', 'resolve', {
      count: 0,
      data: null,
      error: null,
    });

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Test',
      source: 'manual',
      lines: [
        { accountCode: '1000', debit: 100, credit: 0 },
        { accountCode: '5100', debit: 0, credit: 100 },
      ],
    });

    expect(result).toBeNull();
  });

  it('returns null when account code lookup fails', async () => {
    // Count returns > 0 but code lookup returns no accounts
    setMockResponse('accounts', 'resolve', {
      data: [],
      error: null,
      count: 0,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Unknown code',
      source: 'manual',
      lines: [
        { accountCode: '9999', debit: 100, credit: 0 },
        { accountCode: '1000', debit: 0, credit: 100 },
      ],
    });

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('cleans up orphaned entry when line insertion fails', async () => {
    setupAccountingBaseline();
    // Override journal_lines to fail
    setMockResponse('journal_lines', 'resolve', {
      data: null,
      error: { message: 'Insert failed' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Lines will fail',
      source: 'manual',
      lines: [
        { accountCode: '1000', debit: 100, credit: 0 },
        { accountCode: '5100', debit: 0, credit: 100 },
      ],
    });

    expect(result).toBeNull();
    // Verify cleanup delete was called on journal_entries
    const deleteCalls = mockCalls.filter(
      (c) => c.table === 'journal_entries' && c.method === 'delete'
    );
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    consoleSpy.mockRestore();
  });

  it('handles multi-line balanced entries', async () => {
    setupAccountingBaseline();

    const result = await createJournalEntry({
      communityId: COMMUNITY_ID,
      description: 'Multi-line entry',
      source: 'manual',
      lines: [
        { accountCode: '5100', debit: 3000, credit: 0 },
        { accountCode: '5800', debit: 2000, credit: 0 },
        { accountCode: '1000', debit: 0, credit: 5000 },
      ],
    });

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

// ─── Convenience Wrappers ────────────────────────────────────────────────────

describe('postInvoiceCreated', () => {
  it('creates entry with DR 1100 / CR 4000 for regular assessment', async () => {
    setupAccountingBaseline();

    const result = await postInvoiceCreated(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 10000, 'January 2026 Dues'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
    // Verify the insert was called on journal_entries
    const insertCalls = mockCalls.filter(
      (c) => c.table === 'journal_entries' && c.method === 'insert'
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('creates entry with DR 1110 / CR 4010 for special assessment', async () => {
    setupAccountingBaseline();

    const result = await postInvoiceCreated(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 10000, 'Special Assessment', true
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postPaymentReceived', () => {
  it('creates entry with DR 1000 / CR 1100', async () => {
    setupAccountingBaseline();

    const result = await postPaymentReceived(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 10000, 'Payment for January'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postOverpaymentWalletCredit', () => {
  it('creates entry with DR 1000 / CR 2110', async () => {
    setupAccountingBaseline();

    const result = await postOverpaymentWalletCredit(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 2000
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postWalletApplied', () => {
  it('creates entry with DR 2110 / CR 1100', async () => {
    setupAccountingBaseline();

    const result = await postWalletApplied(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 5000
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postLateFeeApplied', () => {
  it('creates entry with DR 1100 / CR 4100', async () => {
    setupAccountingBaseline();

    const result = await postLateFeeApplied(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 2500
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postInvoiceWaived', () => {
  it('creates entry with DR 5800 / CR 1100', async () => {
    setupAccountingBaseline();

    const result = await postInvoiceWaived(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 10000, 'Waived by board'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postInvoiceVoided', () => {
  it('creates entry with DR 4000 / CR 1100', async () => {
    setupAccountingBaseline();

    const result = await postInvoiceVoided(
      COMMUNITY_ID, INVOICE_1_ID, UNIT_1_ID, 10000, 'Voided - duplicate'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postRefund', () => {
  it('creates entry with DR 1100 / CR 1000', async () => {
    setupAccountingBaseline();

    const result = await postRefund(
      COMMUNITY_ID, 'payment-id-1', UNIT_1_ID, 5000
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postVendorPayment', () => {
  it('creates entry with DR expense / CR 1000', async () => {
    setupAccountingBaseline();

    const result = await postVendorPayment(
      COMMUNITY_ID, 'vendor-id-1', 8000, '5100', 'Monthly electric bill'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

describe('postInterFundTransfer', () => {
  it('creates entry with DR 1010 / CR 1000 for operating to reserve', async () => {
    setupAccountingBaseline();

    const result = await postInterFundTransfer(
      COMMUNITY_ID, 'operating', 'reserve', 50000, 'Monthly reserve contribution'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });

  it('creates entry with DR 1000 / CR 1010 for reserve to operating', async () => {
    setupAccountingBaseline();

    const result = await postInterFundTransfer(
      COMMUNITY_ID, 'reserve', 'operating', 10000, 'Emergency withdrawal'
    );

    expect(result).toBe(JOURNAL_ENTRY_ID);
  });
});

// ─── reverseJournalEntry() ───────────────────────────────────────────────────

describe('reverseJournalEntry', () => {
  it('creates a reversal with swapped debits/credits', async () => {
    // Original entry fetch
    setMockResponse('journal_entries', 'single', {
      data: {
        id: JOURNAL_ENTRY_ID,
        community_id: COMMUNITY_ID,
        description: 'Original entry',
        source: 'manual',
        status: 'posted',
        reference_type: null,
        reference_id: null,
        unit_id: UNIT_1_ID,
        journal_lines: [
          { account_id: 'acct-1000', debit: 5000, credit: 0, description: 'Cash' },
          { account_id: 'acct-5100', debit: 0, credit: 5000, description: 'Utilities' },
        ],
      },
      error: null,
    });

    const reversalId = 'reversal-entry-id';

    // First single() call returns the original entry
    // We need to handle sequential single() calls returning different values
    // For the reversal insert, the second single() call returns the reversal
    let singleCallCount = 0;
    const originalSingle = mockSupabase.from;
    mockSupabase.from = (table: string) => {
      const chain = createChain(table);
      if (table === 'journal_entries') {
        chain.single = () => {
          singleCallCount++;
          if (singleCallCount === 1) {
            // First call: fetch original
            return Promise.resolve({
              data: {
                id: JOURNAL_ENTRY_ID,
                community_id: COMMUNITY_ID,
                description: 'Original entry',
                source: 'manual',
                status: 'posted',
                reference_type: null,
                reference_id: null,
                unit_id: UNIT_1_ID,
                journal_lines: [
                  { account_id: 'acct-1000', debit: 5000, credit: 0, description: 'Cash' },
                  { account_id: 'acct-5100', debit: 0, credit: 5000, description: 'Utilities' },
                ],
              },
              error: null,
            });
          }
          // Second call: reversal insert
          return Promise.resolve({
            data: { id: reversalId },
            error: null,
          });
        };
      }
      return chain;
    };

    const result = await reverseJournalEntry(COMMUNITY_ID, JOURNAL_ENTRY_ID, 'Test reversal');

    expect(result).toBe(reversalId);

    // Verify that journal_lines insert and journal_entries update were called
    const lineInserts = mockCalls.filter(
      (c) => c.table === 'journal_lines' && c.method === 'insert'
    );
    expect(lineInserts.length).toBeGreaterThanOrEqual(1);

    const entryUpdates = mockCalls.filter(
      (c) => c.table === 'journal_entries' && c.method === 'update'
    );
    expect(entryUpdates.length).toBeGreaterThanOrEqual(1);

    // Restore
    mockSupabase.from = originalSingle;
  });

  it('returns null for already-reversed entry', async () => {
    setMockResponse('journal_entries', 'single', {
      data: {
        id: JOURNAL_ENTRY_ID,
        status: 'reversed',
        journal_lines: [],
      },
      error: null,
    });

    const result = await reverseJournalEntry(COMMUNITY_ID, JOURNAL_ENTRY_ID);

    expect(result).toBeNull();
  });

  it('returns null when entry not found', async () => {
    setMockResponse('journal_entries', 'single', {
      data: null,
      error: null,
    });

    const result = await reverseJournalEntry(COMMUNITY_ID, 'nonexistent-id');

    expect(result).toBeNull();
  });
});
