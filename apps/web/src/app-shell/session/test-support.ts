// Copied from apps/admin/src/auth/test-support.ts; makeMe is a learner by default.
import type { ChannelLike, Me } from '@/app-shell/session/session-store';

export const BASE = 'http://api.test';

export const makeMe = (over: Partial<Me> = {}): Me => ({
  id: 'u1',
  email: 'lan@example.com',
  email_verified: true,
  must_change_password: false,
  native_language: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  staff_role: null,
  permissions: [],
  given_name: 'Lan',
  family_name: 'Nguyễn',
  birth_date: '2000-05-12',
  terms_accepted_at: '2026-10-20T03:00:00.000Z',
  ...over,
});

export type Call = { method: string; path: string; headers: Record<string, string>; body: unknown; keepalive: boolean | undefined };
export type Route = (call: Call) => Response | Promise<Response>;

export const tokenResponse = (token: string) =>
  Response.json({ access_token: token, token_type: 'Bearer', expires_in: 900 });

export const problem = (status: number, slug: string, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({ type: slug === '' ? 'about:blank' : `${BASE}/problems/${slug}`, status, title: slug || 'err', ...extra }),
    { status, headers: { 'content-type': 'application/problem+json' } },
  );

export const rateLimited = (seconds: number, slug = 'rate-limited') =>
  new Response(JSON.stringify({ type: `${BASE}/problems/${slug}`, status: 429, title: slug }), {
    status: 429,
    headers: { 'content-type': 'application/problem+json', 'retry-after': String(seconds) },
  });

/** A scripted `fetch`: routes are keyed `"METHOD /path"`; an unscripted request fails the test loudly. */
export function makeFetch(routes: Record<string, Route>) {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const path = url.startsWith(BASE) ? url.slice(BASE.length) : url;
    const method = init.method ?? 'GET';
    let body: unknown = init.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // keep the raw string
      }
    }
    const call: Call = { method, path, headers: { ...(init.headers as Record<string, string>) }, body, keepalive: init.keepalive };
    calls.push(call);
    const route = routes[`${method} ${path}`];
    if (!route) throw new Error(`unscripted request: ${method} ${path}`);
    return route(call);
  }) as typeof fetch;
  const count = (method: string, path: string) => calls.filter((c) => c.method === method && c.path === path).length;
  return { fetch: fetchFn, calls, count };
}

/** Two or more channels that deliver to each other, like `BroadcastChannel` instances with one name. */
export function channelHub() {
  const members: Array<{ listeners: Array<(e: { data: unknown }) => void> }> = [];
  return {
    create(): ChannelLike {
      const me = { listeners: [] as Array<(e: { data: unknown }) => void> };
      members.push(me);
      return {
        postMessage(data) {
          for (const other of members) if (other !== me) other.listeners.forEach((l) => l({ data }));
        },
        addEventListener(_type, listener) {
          me.listeners.push(listener);
        },
        close() {},
      };
    },
  };
}
