import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client that won't crash but returns null for all queries.
    // Uses a chainable proxy so any .select().eq().order().single() chain works.
    const terminalResult = { data: null, error: null };
    const queryHandler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        if (prop === 'single' || prop === 'maybeSingle')
          return async () => terminalResult;
        return (..._args: unknown[]) => new Proxy({}, queryHandler);
      },
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
        resetPasswordForEmail: async () => ({ error: { message: 'Supabase not configured' } }),
      },
      from: () => new Proxy({}, queryHandler),
    } as any;
  }

  return createBrowserClient(url, key);
}
