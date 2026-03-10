import { describe, it, expect, vi } from 'vitest';
import { applyCategorization, findMatchingRule } from '@/lib/utils/bank-categorization';
import { COMMUNITY_ID } from '../helpers/fixtures';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createCategorizationClient(config: {
  rules?: { id: string; pattern: string; match_field: string; account_id: string; times_applied: number }[];
  transactions?: { id: string; name: string; merchant_name: string | null }[];
}) {
  const updateCalls: { table: string; id: string; data: unknown }[] = [];

  const client = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'in', 'is', 'not', 'order', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.update = vi.fn().mockImplementation((data: unknown) => {
        const updateChain: Record<string, unknown> = {};
        updateChain.eq = vi.fn().mockImplementation((_col: string, id: string) => {
          updateCalls.push({ table, id, data });
          return updateChain;
        });
        (updateChain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) =>
          Promise.resolve({ data: null, error: null }).then(resolve);
        return updateChain;
      });

      // Resolve based on table
      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        if (table === 'categorization_rules') {
          return Promise.resolve({ data: config.rules ?? [], error: null }).then(resolve);
        }
        if (table === 'bank_transactions') {
          return Promise.resolve({ data: config.transactions ?? [], error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      };

      return chain;
    },
    _updateCalls: updateCalls,
  };

  return client;
}

// ─── applyCategorization() ───────────────────────────────────────────────────

describe('applyCategorization', () => {
  it('categorizes a matching transaction by name', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke energy', match_field: 'name', account_id: 'acct-utilities', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY PAYMENT', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
    // Verify the transaction was updated
    expect(client._updateCalls.some((c) => c.table === 'bank_transactions')).toBe(true);
    // Verify times_applied was incremented
    expect(client._updateCalls.some((c) => c.table === 'categorization_rules')).toBe(true);
  });

  it('performs case-insensitive matching', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'DUKE', match_field: 'name', account_id: 'acct-utilities', times_applied: 5 },
      ],
      transactions: [
        { id: 'txn-1', name: 'duke energy payment', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
  });

  it('returns 0 when no rules match', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'xyz', match_field: 'name', account_id: 'acct-1', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY PAYMENT', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('returns 0 when no rules exist', async () => {
    const client = createCategorizationClient({
      rules: [],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY PAYMENT', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('returns 0 when no pending transactions exist', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke', match_field: 'name', account_id: 'acct-1', times_applied: 0 },
      ],
      transactions: [],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(0);
  });

  it('matches on merchant_name when match_field is merchant_name', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke', match_field: 'merchant_name', account_id: 'acct-1', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'ELECTRIC PAYMENT #1234', merchant_name: 'Duke Energy' },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
  });

  it('skips transactions with null field value', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke', match_field: 'merchant_name', account_id: 'acct-1', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    // merchant_name is null, so the rule matching on merchant_name should not match
    expect(result).toBe(0);
  });

  it('first matching rule wins (highest priority)', async () => {
    const client = createCategorizationClient({
      rules: [
        // Rules come in priority descending order (highest first)
        { id: 'rule-high', pattern: 'duke', match_field: 'name', account_id: 'acct-high', times_applied: 0 },
        { id: 'rule-low', pattern: 'duke energy', match_field: 'name', account_id: 'acct-low', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY PAYMENT', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(1);
    // The high-priority rule should be applied (comes first in array)
    const txnUpdate = client._updateCalls.find((c) => c.table === 'bank_transactions');
    expect((txnUpdate?.data as Record<string, unknown>)?.categorized_account_id).toBe('acct-high');
  });

  it('categorizes multiple transactions', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke', match_field: 'name', account_id: 'acct-1', times_applied: 0 },
      ],
      transactions: [
        { id: 'txn-1', name: 'DUKE ENERGY 01', merchant_name: null },
        { id: 'txn-2', name: 'DUKE ENERGY 02', merchant_name: null },
        { id: 'txn-3', name: 'WALMART GROCERY', merchant_name: null },
      ],
    });

    const result = await applyCategorization(client as any, COMMUNITY_ID);

    expect(result).toBe(2); // Only 2 match "duke"
  });
});

// ─── findMatchingRule() ──────────────────────────────────────────────────────

describe('findMatchingRule', () => {
  it('returns account_id when a rule matches name', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'duke', match_field: 'name', account_id: 'acct-utilities', times_applied: 0 },
      ],
    });

    const result = await findMatchingRule(
      client as any, COMMUNITY_ID, 'DUKE ENERGY', null
    );

    expect(result).toBe('acct-utilities');
  });

  it('returns null when no rule matches', async () => {
    const client = createCategorizationClient({
      rules: [
        { id: 'rule-1', pattern: 'walmart', match_field: 'name', account_id: 'acct-1', times_applied: 0 },
      ],
    });

    const result = await findMatchingRule(
      client as any, COMMUNITY_ID, 'DUKE ENERGY', null
    );

    expect(result).toBeNull();
  });

  it('returns null when no rules exist', async () => {
    const client = createCategorizationClient({ rules: [] });

    const result = await findMatchingRule(
      client as any, COMMUNITY_ID, 'DUKE ENERGY', null
    );

    expect(result).toBeNull();
  });
});
