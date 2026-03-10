import { describe, it, expect, vi } from 'vitest';
import { autoMatchTransactions } from '@/lib/utils/bank-matching';
import { COMMUNITY_ID } from '../helpers/fixtures';

// ─── Mock client builder ─────────────────────────────────────────────────────

function createMatchingClient(config: {
  pendingTxns?: { id: string; amount: number; date: string; name?: string; plaid_bank_account_id?: string }[];
  entries?: { id: string; entry_date: string; journal_lines: { debit: number; credit: number }[] }[];
  matchedIds?: string[];
  // For phase 2 (check matching)
  pendingAfterPhase1?: { id: string; amount: number; date: string; name: string }[];
  checks?: { id: string; amount: number; journal_entry_id: string; status: string; check_number?: number } | null;
}) {
  const updateCalls: { table: string; data: unknown }[] = [];
  let bankTxnFetchCount = 0;

  const client = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'is', 'order', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.single = vi.fn().mockImplementation(() => {
        if (table === 'checks') {
          return Promise.resolve({
            data: config.checks ?? null,
            error: config.checks ? null : { message: 'Not found' },
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      chain.update = vi.fn().mockImplementation((data: unknown) => {
        const updateChain: Record<string, unknown> = {};
        updateChain.eq = vi.fn().mockImplementation(() => {
          updateCalls.push({ table, data });
          return updateChain;
        });
        (updateChain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) =>
          Promise.resolve({ data: null, error: null }).then(resolve);
        return updateChain;
      });

      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        if (table === 'bank_transactions') {
          bankTxnFetchCount++;
          if (bankTxnFetchCount === 1) {
            // First fetch: pending for phase 1
            return Promise.resolve({ data: config.pendingTxns ?? [], error: null }).then(resolve);
          }
          if (bankTxnFetchCount === 2) {
            // Second fetch: already matched IDs
            return Promise.resolve({
              data: (config.matchedIds ?? []).map((id) => ({ matched_journal_entry_id: id })),
              error: null,
            }).then(resolve);
          }
          // Third fetch: pending for phase 2 (check matching)
          return Promise.resolve({
            data: config.pendingAfterPhase1 ?? [],
            error: null,
          }).then(resolve);
        }
        if (table === 'journal_entries') {
          return Promise.resolve({ data: config.entries ?? [], error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      };

      return chain;
    },
    _updateCalls: updateCalls,
  };

  return client;
}

// ─── autoMatchTransactions() ─────────────────────────────────────────────────

describe('autoMatchTransactions', () => {
  it('matches transactions by exact amount and same date', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-01',
          journal_lines: [
            { debit: 50, credit: 0 }, // $50.00 stored as dollars in journal
            { debit: 0, credit: 50 },
          ],
        },
      ],
      matchedIds: [],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
    expect(client._updateCalls.some((c) =>
      c.table === 'bank_transactions' &&
      (c.data as Record<string, unknown>)?.status === 'matched'
    )).toBe(true);
  });

  it('matches transactions within 3-day window', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-03', // 2 days later
          journal_lines: [{ debit: 50, credit: 0 }, { debit: 0, credit: 50 }],
        },
      ],
      matchedIds: [],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
  });

  it('does not match when amount differs', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-01',
          journal_lines: [{ debit: 49.99, credit: 0 }, { debit: 0, credit: 49.99 }], // Different amount
        },
      ],
      matchedIds: [],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('returns 0 when no pending transactions', async () => {
    const client = createMatchingClient({
      pendingTxns: [],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-01',
          journal_lines: [{ debit: 50, credit: 0 }, { debit: 0, credit: 50 }],
        },
      ],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('returns 0 when no journal entries exist', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('skips already-matched journal entries', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-01',
          journal_lines: [{ debit: 50, credit: 0 }, { debit: 0, credit: 50 }],
        },
      ],
      matchedIds: ['entry-1'], // Already matched
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('prevents double-matching (one entry matches at most one txn)', async () => {
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-1', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
        { id: 'txn-2', amount: 5000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-1',
          entry_date: '2026-03-01',
          journal_lines: [{ debit: 50, credit: 0 }, { debit: 0, credit: 50 }],
        },
      ],
      matchedIds: [],
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    // Only 1 match, not 2 (entry removed from lookup after first match)
    expect(result).toBe(1);
  });

  it('matches check by check number (phase 2)', async () => {
    // Phase 1 needs data to not early-return, but amounts should not match
    const client = createMatchingClient({
      pendingTxns: [
        { id: 'txn-check', amount: 15000, date: '2026-03-01', plaid_bank_account_id: 'bank-1' },
      ],
      entries: [
        {
          id: 'entry-nomatch',
          entry_date: '2026-03-01',
          journal_lines: [{ debit: 99.99, credit: 0 }, { debit: 0, credit: 99.99 }], // Won't match 15000 cents
        },
      ],
      matchedIds: [],
      pendingAfterPhase1: [
        { id: 'txn-check', amount: 15000, date: '2026-03-01', name: 'Check #1234' },
      ],
      checks: {
        id: 'check-1',
        amount: 15000,
        journal_entry_id: 'je-1',
        status: 'printed',
      },
    });

    const result = await autoMatchTransactions(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
    // Verify check status was updated to "cleared"
    const checkUpdate = client._updateCalls.find(
      (c) => c.table === 'checks' && (c.data as Record<string, unknown>)?.status === 'cleared'
    );
    expect(checkUpdate).toBeDefined();
  });

  it('parses check number from various formats', async () => {
    // Test the regex pattern: /(?:check|ck|chk)\s*#?\s*(\d+)/i
    const pattern = /(?:check|ck|chk)\s*#?\s*(\d+)/i;

    expect(pattern.exec('Check #1234')?.[1]).toBe('1234');
    expect(pattern.exec('CK #1234')?.[1]).toBe('1234');
    expect(pattern.exec('CHK 1234')?.[1]).toBe('1234');
    expect(pattern.exec('CHECK#1234')?.[1]).toBe('1234');
    expect(pattern.exec('ck1234')?.[1]).toBe('1234');
    expect(pattern.exec('chk# 1234')?.[1]).toBe('1234');
    // Non-matching
    expect(pattern.exec('Wire transfer')).toBeNull();
    expect(pattern.exec('DUKE ENERGY')).toBeNull();
  });
});
