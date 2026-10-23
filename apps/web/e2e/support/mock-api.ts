// Copied from apps/admin/e2e/support/mock-api.ts; learner fixtures instead of staff ones, origin = the web e2e Worker.
import type { Page, Route } from '@playwright/test';
import { APP_CONFIG, entitlementsBody } from './fixtures';

export type MockRequest = { method: string; path: string; query: URLSearchParams; body: unknown; headers: Record<string, string> };
export type MockResponse = {
  status?: number;
  json?: unknown;
  body?: string;
  headers?: Record<string, string>;
  /** Fail like a dead network (fetch rejects with a TypeError → NetworkError in the app). */
  abort?: boolean;
};
export type MockHandler = (req: MockRequest) => MockResponse | Promise<MockResponse>;

export const API = 'http://localhost:3000';
const ORIGIN = 'http://localhost:3100';
const CORS = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-expose-headers': 'Retry-After',
};

const seen = new WeakMap<Page, MockRequest[]>();

/** Problem Details body like the API's `ProblemDetailsFilter` (`type` = base + slug). */
export const problem = (status: number, slug: string, extra: Record<string, unknown> = {}): MockResponse => ({
  status,
  headers: { 'content-type': 'application/problem+json' },
  json: { type: slug ? `${API}/problems/${slug}` : 'about:blank', status, title: slug || 'Error', operation_id: 'op-e2e', ...extra },
});

export const tokenBody = (token = 'e2e-token'): MockResponse => ({
  json: { access_token: token, token_type: 'Bearer', expires_in: 900 },
});

/**
 * Answers every `http://localhost:3000/v1/**` request from `handlers`, keyed `"METHOD /v1/path"` (no query string).
 * Handlers are looked up per request, so a test can change behaviour midway by mutating what its handler reads.
 * An unscripted request gets a 404 problem and is still recorded.
 */
export async function mockApi(page: Page, handlers: Record<string, MockHandler>): Promise<void> {
  const log: MockRequest[] = [];
  seen.set(page, log);
  await page.route(`${API}/v1/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': 'authorization,content-type,x-csrf-protection,idempotency-key',
        },
      });
      return;
    }
    const url = new URL(request.url());
    let body: unknown = request.postData();
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // keep the raw text (multipart)
      }
    }
    const req: MockRequest = { method: request.method(), path: url.pathname, query: url.searchParams, body, headers: request.headers() };
    log.push(req);
    const handler = handlers[`${req.method} ${req.path}`];
    const res = handler ? await handler(req) : problem(404, 'not-found', { detail: `unmocked ${req.method} ${req.path}` });
    if (res.abort) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: res.status ?? 200,
      headers: { ...CORS, ...(res.json !== undefined ? { 'content-type': 'application/json' } : {}), ...res.headers },
      body: res.body ?? (res.json !== undefined ? JSON.stringify(res.json) : ''),
    });
  });
}

export type Plan = 'free' | 'trial' | 'pro';

/** `GET /v1/me` of a learner (no staff role). */
export function meBody(over: Record<string, unknown> = {}) {
  return {
    id: 'learner-1',
    email: 'lan@example.com',
    email_verified: true,
    must_change_password: false,
    native_language: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    staff_role: null,
    permissions: [],
    given_name: 'Lan',
    family_name: 'Nguyễn',
    birth_date: '2008-05-14',
    ...over,
  };
}

/** Refresh accepted + `/me`, `/me/entitlements`, `/me/app-config`, `/me/reminders`, no decks for a learner; `extra` handlers on top. */
export async function signedInAs(
  page: Page,
  plan: Plan = 'free',
  extra: Record<string, MockHandler> = {},
  me: Record<string, unknown> = {},
): Promise<void> {
  await mockApi(page, {
    'POST /v1/auth/refresh': () => tokenBody(),
    'GET /v1/me': () => ({ json: meBody(me) }),
    'PATCH /v1/me': () => ({ json: meBody(me) }),
    'POST /v1/auth/logout': () => ({ status: 204 }),
    'GET /v1/me/entitlements': () => ({ json: entitlementsBody(plan) }),
    'GET /v1/me/app-config': () => ({ json: APP_CONFIG }),
    'GET /v1/me/reminders': () => ({ json: { enabled: true, email_verified: true } }),
    'GET /v1/groups': () => ({ json: { items: [] } }),
    'GET /v1/topics/suggestions': () => ({ json: { items: [] } }),
    'GET /v1/topics': () => ({ json: { items: [] } }),
    ...extra,
  });
}

export function requestCount(page: Page, method: string, path: string): number {
  return (seen.get(page) ?? []).filter((r) => r.method === method && r.path === path).length;
}

export function requests(page: Page, method: string, path: string): MockRequest[] {
  return (seen.get(page) ?? []).filter((r) => r.method === method && r.path === path);
}
