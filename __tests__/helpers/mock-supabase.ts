import { vi } from 'vitest';

/**
 * Creates a chainable mock Supabase client for testing.
 *
 * Usage:
 *   const { client, mockQuery } = createMockSupabase();
 *   mockQuery('accounts', { data: [...], error: null });
 *   vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => client }));
 */

interface MockQueryResult {
  data: unknown;
  error: unknown;
  count?: number;
}

type MockQueryConfig = Record<string, MockQueryResult>;

export function createMockSupabase(queryConfig: MockQueryConfig = {}) {
  const queryResults: MockQueryConfig = { ...queryConfig };

  function setQueryResult(table: string, result: MockQueryResult) {
    queryResults[table] = result;
  }

  function getResult(table: string): MockQueryResult {
    return queryResults[table] ?? { data: null, error: null };
  }

  // Build a chainable query builder that tracks the current table
  function createQueryBuilder(table: string) {
    const result = getResult(table);

    const builder: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
      single: vi.fn().mockResolvedValue(result),
      then: vi.fn((resolve: (val: MockQueryResult) => void) => resolve(result)),
    };

    // Make it thenable (so `await supabase.from('x').select()` works)
    Object.defineProperty(builder, 'then', {
      value: (resolve: (val: MockQueryResult) => void) => {
        return Promise.resolve(result).then(resolve);
      },
      writable: true,
      configurable: true,
    });

    return builder;
  }

  const rpcResults: Record<string, MockQueryResult> = {};

  const client = {
    from: vi.fn((table: string) => createQueryBuilder(table)),
    rpc: vi.fn((fn: string) => {
      const result = rpcResults[fn] ?? { data: null, error: null };
      return Promise.resolve(result);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } },
        error: null,
      }),
    },
  };

  return {
    client,
    setQueryResult,
    setRpcResult: (fn: string, result: MockQueryResult) => {
      rpcResults[fn] = result;
    },
  };
}
