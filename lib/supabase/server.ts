import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client that won't crash but returns null for all queries.
    // Uses a chainable proxy so any .select().eq().order().single() chain works.
    const chainable: Record<string, unknown> = {};
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') return undefined; // prevent accidental await
        return (..._args: unknown[]) => new Proxy({}, handler);
      },
    };
    // Terminal methods that return data
    const terminalResult = { data: null, error: null };
    const queryHandler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        if (prop === 'single' || prop === 'maybeSingle')
          return async () => terminalResult;
        // For methods that end the chain implicitly (select with no further chain)
        return (..._args: unknown[]) => new Proxy({}, queryHandler);
      },
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
        resetPasswordForEmail: async () => ({ error: { message: 'Supabase not configured' } }),
        exchangeCodeForSession: async () => ({ error: { message: 'Supabase not configured' } }),
      },
      from: () => new Proxy({}, queryHandler),
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll is called from Server Components where cookies can't be set.
          // This can be ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}
