import { describe, it, expect, vi, beforeEach } from 'vitest';
import { COMMUNITY_ID, UNIT_1_ID, INVOICE_1_ID } from '../../helpers/fixtures';

// ─── Mock setup ─────────────────────────────────────────────────────────────

type QueryResult = { data: unknown; error: unknown };
let tableResults: Record<string, QueryResult>;
let singleResults: Record<string, QueryResult>;
let insertCalls: { table: string; data: unknown }[];
let updateCalls: { table: string; data: unknown; id?: string }[];
let upsertCalls: { table: string; data: unknown }[];
let constructEventResult: { event?: unknown; error?: Error } = {};

function resetMock() {
  tableResults = {};
  singleResults = {};
  insertCalls = [];
  updateCalls = [];
  upsertCalls = [];
  constructEventResult = {};
}

function setTableResult(table: string, result: QueryResult) {
  tableResults[table] = result;
}

function setSingleResult(table: string, result: QueryResult) {
  singleResults[table] = result;
}

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: vi.fn().mockImplementation(() => {
        if (constructEventResult.error) {
          throw constructEventResult.error;
        }
        return constructEventResult.event;
      }),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};

      for (const m of ['select', 'eq', 'neq', 'in', 'not', 'is', 'order', 'limit']) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }

      chain.maybeSingle = vi.fn().mockImplementation(() => {
        const result = singleResults[table] ?? tableResults[table] ?? { data: null, error: null };
        return Promise.resolve(result);
      });

      chain.single = vi.fn().mockImplementation(() => {
        const result = singleResults[table] ?? tableResults[table] ?? { data: null, error: null };
        return Promise.resolve(result);
      });

      chain.insert = vi.fn().mockImplementation((data: unknown) => {
        insertCalls.push({ table, data });
        return Promise.resolve({ data: null, error: null });
      });

      chain.update = vi.fn().mockImplementation((data: unknown) => {
        const updateChain: Record<string, unknown> = {};
        updateChain.eq = vi.fn().mockImplementation((_col: string, id: string) => {
          updateCalls.push({ table, data, id });
          return Promise.resolve({ data: null, error: null });
        });
        return updateChain;
      });

      chain.upsert = vi.fn().mockImplementation((data: unknown) => {
        upsertCalls.push({ table, data });
        return Promise.resolve({ data: null, error: null });
      });

      (chain as { then: (r: (v: unknown) => void) => Promise<unknown> }).then = (resolve) => {
        const config = tableResults[table] ?? { data: null, error: null };
        return Promise.resolve(config).then(resolve);
      };

      return chain;
    },
  }),
}));

let postPaymentReceivedCalls: unknown[] = [];
let postOverpaymentWalletCreditCalls: unknown[] = [];

vi.mock('@/lib/utils/accounting-entries', () => ({
  postPaymentReceived: vi.fn().mockImplementation((...args: unknown[]) => {
    postPaymentReceivedCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
  postOverpaymentWalletCredit: vi.fn().mockImplementation((...args: unknown[]) => {
    postOverpaymentWalletCreditCalls.push(args);
    return Promise.resolve({ data: null, error: null });
  }),
}));

let queuePaymentConfirmationCalls: unknown[] = [];

vi.mock('@/lib/email/queue', () => ({
  queuePaymentConfirmation: vi.fn().mockImplementation((...args: unknown[]) => {
    queuePaymentConfirmationCalls.push(args);
    return Promise.resolve();
  }),
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { POST } from '@/app/api/stripe/webhook/route';

function makeRequest(body: string = '', sig: string | null = 'sig_valid'): Request {
  const headers: Record<string, string> = { 'content-type': 'text/plain' };
  if (sig) headers['stripe-signature'] = sig;
  return new Request('http://localhost:6006/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    resetMock();
    postPaymentReceivedCalls = [];
    postOverpaymentWalletCreditCalls = [];
    queuePaymentConfirmationCalls = [];
  });

  // ── Signature Verification ────────────────────────────────────────

  it('returns 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const res = await POST(makeRequest() as any);
      expect(res.status).toBe(500);
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('body', null) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('stripe-signature');
  });

  it('returns 400 when signature verification fails', async () => {
    constructEventResult = { error: new Error('Signature mismatch') };

    const res = await POST(makeRequest('body', 'bad_sig') as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Signature mismatch');
  });

  // ── checkout.session.completed ────────────────────────────────────

  it('processes checkout.session.completed: marks invoice paid and creates payment record', async () => {
    constructEventResult = {
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            amount_total: 5000,
            payment_intent: 'pi_test_123',
            metadata: {
              invoice_id: INVOICE_1_ID,
              community_id: COMMUNITY_ID,
            },
          },
        },
      },
    };

    // No existing payment (idempotency check passes)
    setSingleResult('payments', { data: null, error: null });
    // Invoice found
    setSingleResult('invoices', {
      data: {
        id: INVOICE_1_ID,
        unit_id: UNIT_1_ID,
        amount: 5000,
        amount_paid: 0,
        title: 'January Dues',
        paid_by: null,
      },
      error: null,
    });
    // Community for email
    setSingleResult('communities', {
      data: { slug: 'westwood6' },
      error: null,
    });

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    // Invoice should be updated to paid
    const invoiceUpdate = updateCalls.find((c) => c.table === 'invoices');
    expect(invoiceUpdate).toBeDefined();
    expect((invoiceUpdate?.data as Record<string, unknown>)?.status).toBe('paid');
    expect((invoiceUpdate?.data as Record<string, unknown>)?.amount_paid).toBe(5000);

    // Payment record should be created
    const paymentInsert = insertCalls.find((c) => c.table === 'payments');
    expect(paymentInsert).toBeDefined();
    expect((paymentInsert?.data as Record<string, unknown>)?.amount).toBe(5000);

    // Accounting entry should be posted
    expect(postPaymentReceivedCalls).toHaveLength(1);

    // Email should be queued
    expect(queuePaymentConfirmationCalls).toHaveLength(1);
  });

  it('handles checkout.session.completed with overpayment (credits wallet)', async () => {
    constructEventResult = {
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_overpay',
            amount_total: 7000, // Paid 7000 for 5000 invoice
            payment_intent: 'pi_test_overpay',
            metadata: {
              invoice_id: INVOICE_1_ID,
              community_id: COMMUNITY_ID,
            },
          },
        },
      },
    };

    setSingleResult('payments', { data: null, error: null });
    setSingleResult('invoices', {
      data: {
        id: INVOICE_1_ID,
        unit_id: UNIT_1_ID,
        amount: 5000,
        amount_paid: 0,
        title: 'January Dues',
        paid_by: null,
      },
      error: null,
    });
    setSingleResult('unit_wallets', { data: { balance: 0 }, error: null });
    setSingleResult('communities', { data: { slug: 'westwood6' }, error: null });

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    // Wallet should be credited with excess
    const walletUpsert = upsertCalls.find((c) => c.table === 'unit_wallets');
    expect(walletUpsert).toBeDefined();
    expect((walletUpsert?.data as Record<string, unknown>)?.balance).toBe(2000);

    // Wallet transaction should be logged
    const walletTxn = insertCalls.find((c) => c.table === 'wallet_transactions');
    expect(walletTxn).toBeDefined();
    expect((walletTxn?.data as Record<string, unknown>)?.amount).toBe(2000);
    expect((walletTxn?.data as Record<string, unknown>)?.type).toBe('overpayment');

    // Overpayment accounting entry should be posted
    expect(postOverpaymentWalletCreditCalls).toHaveLength(1);
  });

  it('skips checkout.session.completed when already processed (idempotent)', async () => {
    constructEventResult = {
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_dup',
            amount_total: 5000,
            payment_intent: 'pi_test_dup',
            metadata: {
              invoice_id: INVOICE_1_ID,
              community_id: COMMUNITY_ID,
            },
          },
        },
      },
    };

    // Payment already exists for this session
    setSingleResult('payments', { data: { id: 'existing-payment' }, error: null });

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    // No invoice update or payment insert should happen
    const invoiceUpdate = updateCalls.find((c) => c.table === 'invoices');
    expect(invoiceUpdate).toBeUndefined();
    const paymentInsert = insertCalls.find((c) => c.table === 'payments');
    expect(paymentInsert).toBeUndefined();
  });

  it('skips checkout.session.completed when metadata is missing', async () => {
    constructEventResult = {
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_no_meta',
            amount_total: 5000,
            metadata: {},
          },
        },
      },
    };

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    // No processing should happen
    expect(updateCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  // ── invoice.payment_failed ────────────────────────────────────────

  it('marks invoice overdue and unit past_due on invoice.payment_failed', async () => {
    constructEventResult = {
      event: {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_failed',
            parent: {
              subscription_details: {
                subscription: 'sub_test_123',
              },
            },
          },
        },
      },
    };

    setSingleResult('units', {
      data: { id: UNIT_1_ID, community_id: COMMUNITY_ID },
      error: null,
    });
    setSingleResult('invoices', {
      data: { id: INVOICE_1_ID },
      error: null,
    });

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    // Invoice should be marked overdue
    const invoiceUpdate = updateCalls.find(
      (c) => c.table === 'invoices' && (c.data as Record<string, unknown>)?.status === 'overdue'
    );
    expect(invoiceUpdate).toBeDefined();

    // Unit should be marked past_due
    const unitUpdate = updateCalls.find(
      (c) => c.table === 'units' && (c.data as Record<string, unknown>)?.stripe_subscription_status === 'past_due'
    );
    expect(unitUpdate).toBeDefined();
  });

  // ── customer.subscription.updated ─────────────────────────────────

  it('syncs subscription status on customer.subscription.updated', async () => {
    constructEventResult = {
      event: {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            status: 'active',
          },
        },
      },
    };

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    const unitUpdate = updateCalls.find((c) => c.table === 'units');
    expect(unitUpdate).toBeDefined();
    expect((unitUpdate?.data as Record<string, unknown>)?.stripe_subscription_status).toBe('active');
  });

  // ── customer.subscription.deleted ─────────────────────────────────

  it('clears subscription fields on customer.subscription.deleted', async () => {
    constructEventResult = {
      event: {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
          },
        },
      },
    };

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);

    const unitUpdate = updateCalls.find((c) => c.table === 'units');
    expect(unitUpdate).toBeDefined();
    expect((unitUpdate?.data as Record<string, unknown>)?.stripe_subscription_id).toBeNull();
    expect((unitUpdate?.data as Record<string, unknown>)?.stripe_subscription_status).toBeNull();
  });

  // ── Error handling ─────────────────────────────────────────────────

  it('returns 200 even on processing errors (prevents Stripe retries)', async () => {
    constructEventResult = {
      event: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_error',
            amount_total: 5000,
            payment_intent: 'pi_error',
            metadata: {
              invoice_id: INVOICE_1_ID,
              community_id: COMMUNITY_ID,
            },
          },
        },
      },
    };

    // No existing payment
    setSingleResult('payments', { data: null, error: null });
    // Invoice lookup fails
    setSingleResult('invoices', { data: null, error: { message: 'DB error' } });

    const res = await POST(makeRequest('body') as any);
    // Should still return 200 to prevent Stripe retries
    expect(res.status).toBe(200);
  });

  // ── Unhandled events ─────────────────────────────────────────────

  it('returns 200 for unhandled event types', async () => {
    constructEventResult = {
      event: {
        type: 'payment_intent.created',
        data: { object: {} },
      },
    };

    const res = await POST(makeRequest('body') as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
  });
});
