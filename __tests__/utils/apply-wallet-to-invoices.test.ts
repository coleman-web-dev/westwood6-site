import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyWalletToInvoice,
  applyWalletToInvoiceBatch,
} from '@/lib/utils/apply-wallet-to-invoices';
import { COMMUNITY_ID, UNIT_1_ID, UNIT_2_ID, MEMBER_1_ID, INVOICE_1_ID } from '../helpers/fixtures';

// ─── Mock Supabase client builder ────────────────────────────────────────────

function createMockClient(config: {
  walletBalance?: number;
  wallets?: { unit_id: string; balance: number }[];
  invoiceUpdateError?: boolean;
}) {
  let walletBalance = config.walletBalance ?? 0;
  const insertCalls: { table: string; data: unknown }[] = [];
  const updateCalls: { table: string; data: unknown }[] = [];

  const client = {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};

      // Make all methods chainable
      for (const m of ['select', 'eq', 'neq', 'in', 'limit', 'order', 'gt', 'gte', 'lt', 'lte']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.single = vi.fn().mockImplementation(() => {
        if (table === 'unit_wallets') {
          return Promise.resolve({
            data: { balance: walletBalance },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      chain.insert = vi.fn().mockImplementation((data: unknown) => {
        insertCalls.push({ table, data });
        return Promise.resolve({ data: null, error: null });
      });

      chain.update = vi.fn().mockImplementation((data: unknown) => {
        updateCalls.push({ table, data });
        // Return a chainable object for .eq()
        const updateChain: Record<string, unknown> = {};
        for (const m of ['eq', 'neq', 'in']) {
          updateChain[m] = vi.fn().mockReturnValue(updateChain);
        }
        // Make it thenable
        (updateChain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
          if (table === 'invoices' && config.invoiceUpdateError) {
            return Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(resolve);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        };
        return updateChain;
      });

      // For batch: unit_wallets select with .in()
      if (table === 'unit_wallets' && config.wallets) {
        (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
          return Promise.resolve({
            data: config.wallets,
            error: null,
          }).then(resolve);
        };
      }

      return chain;
    },
    _insertCalls: insertCalls,
    _updateCalls: updateCalls,
  };

  return client;
}

// ─── applyWalletToInvoice() ──────────────────────────────────────────────────

describe('applyWalletToInvoice', () => {
  it('fully pays when wallet balance >= invoice amount', async () => {
    const client = createMockClient({ walletBalance: 10000 });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(5000);
    expect(result.invoiceStatus).toBe('paid');
    expect(result.newWalletBalance).toBe(5000);
  });

  it('partially pays when wallet balance < invoice amount', async () => {
    const client = createMockClient({ walletBalance: 3000 });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(3000);
    expect(result.invoiceStatus).toBe('partial');
    expect(result.newWalletBalance).toBe(0);
  });

  it('exactly pays when wallet balance equals invoice amount', async () => {
    const client = createMockClient({ walletBalance: 5000 });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(5000);
    expect(result.invoiceStatus).toBe('paid');
    expect(result.newWalletBalance).toBe(0);
  });

  it('does nothing when wallet balance is zero', async () => {
    const client = createMockClient({ walletBalance: 0 });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(0);
    expect(result.invoiceStatus).toBe('pending');
    expect(result.newWalletBalance).toBe(0);
  });

  it('does nothing when wallet balance is negative', async () => {
    const client = createMockClient({ walletBalance: -100 });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(0);
    expect(result.invoiceStatus).toBe('pending');
    expect(result.newWalletBalance).toBe(-100);
  });

  it('returns pending status and original balance when invoice update fails', async () => {
    const client = createMockClient({ walletBalance: 5000, invoiceUpdateError: true });

    const result = await applyWalletToInvoice(
      client as unknown as Parameters<typeof applyWalletToInvoice>[0],
      INVOICE_1_ID, 5000, 'January Dues', UNIT_1_ID, COMMUNITY_ID, MEMBER_1_ID
    );

    expect(result.applied).toBe(0);
    expect(result.invoiceStatus).toBe('pending');
    expect(result.newWalletBalance).toBe(5000);
  });
});

// ─── applyWalletToInvoiceBatch() ─────────────────────────────────────────────

describe('applyWalletToInvoiceBatch', () => {
  it('returns zeros for empty invoices array', async () => {
    const client = createMockClient({});

    const result = await applyWalletToInvoiceBatch(
      client as unknown as Parameters<typeof applyWalletToInvoiceBatch>[0],
      [],
      COMMUNITY_ID,
      MEMBER_1_ID
    );

    expect(result.totalApplied).toBe(0);
    expect(result.unitsAffected).toBe(0);
  });

  it('applies wallet to multiple invoices for a single unit', async () => {
    const client = createMockClient({
      wallets: [{ unit_id: UNIT_1_ID, balance: 10000 }],
    });

    const invoices = [
      { id: 'inv-1', amount: 3000, unit_id: UNIT_1_ID, title: 'Jan' },
      { id: 'inv-2', amount: 3000, unit_id: UNIT_1_ID, title: 'Feb' },
      { id: 'inv-3', amount: 3000, unit_id: UNIT_1_ID, title: 'Mar' },
    ];

    const result = await applyWalletToInvoiceBatch(
      client as unknown as Parameters<typeof applyWalletToInvoiceBatch>[0],
      invoices,
      COMMUNITY_ID,
      MEMBER_1_ID
    );

    expect(result.totalApplied).toBe(9000); // Applied to all 3
    expect(result.unitsAffected).toBe(1);
  });

  it('handles wallet exhaustion mid-batch', async () => {
    const client = createMockClient({
      wallets: [{ unit_id: UNIT_1_ID, balance: 5000 }],
    });

    const invoices = [
      { id: 'inv-1', amount: 3000, unit_id: UNIT_1_ID, title: 'Jan' },
      { id: 'inv-2', amount: 3000, unit_id: UNIT_1_ID, title: 'Feb' },
      { id: 'inv-3', amount: 3000, unit_id: UNIT_1_ID, title: 'Mar' },
    ];

    const result = await applyWalletToInvoiceBatch(
      client as unknown as Parameters<typeof applyWalletToInvoiceBatch>[0],
      invoices,
      COMMUNITY_ID,
      MEMBER_1_ID
    );

    // First invoice: 3000 applied (balance 2000 remaining)
    // Second invoice: 2000 applied (partial, balance 0)
    // Third invoice: 0 applied (wallet empty)
    expect(result.totalApplied).toBe(5000);
    expect(result.unitsAffected).toBe(1);
  });

  it('processes multiple units independently', async () => {
    const client = createMockClient({
      wallets: [
        { unit_id: UNIT_1_ID, balance: 5000 },
        { unit_id: UNIT_2_ID, balance: 8000 },
      ],
    });

    const invoices = [
      { id: 'inv-1', amount: 3000, unit_id: UNIT_1_ID, title: 'Unit 1 Jan' },
      { id: 'inv-2', amount: 4000, unit_id: UNIT_2_ID, title: 'Unit 2 Jan' },
    ];

    const result = await applyWalletToInvoiceBatch(
      client as unknown as Parameters<typeof applyWalletToInvoiceBatch>[0],
      invoices,
      COMMUNITY_ID,
      MEMBER_1_ID
    );

    expect(result.totalApplied).toBe(7000); // 3000 + 4000
    expect(result.unitsAffected).toBe(2);
  });

  it('skips units with zero wallet balance', async () => {
    const client = createMockClient({
      wallets: [
        { unit_id: UNIT_1_ID, balance: 0 },
        { unit_id: UNIT_2_ID, balance: 5000 },
      ],
    });

    const invoices = [
      { id: 'inv-1', amount: 3000, unit_id: UNIT_1_ID, title: 'Unit 1' },
      { id: 'inv-2', amount: 3000, unit_id: UNIT_2_ID, title: 'Unit 2' },
    ];

    const result = await applyWalletToInvoiceBatch(
      client as unknown as Parameters<typeof applyWalletToInvoiceBatch>[0],
      invoices,
      COMMUNITY_ID,
      MEMBER_1_ID
    );

    expect(result.totalApplied).toBe(3000); // Only unit 2
    expect(result.unitsAffected).toBe(1);
  });
});
