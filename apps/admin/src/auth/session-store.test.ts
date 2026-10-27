import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../api/client';
import { ApiError, NetworkError } from '../api/problem';
import { SessionStore } from './session-store';
import { BASE, channelHub, makeFetch, makeMe, problem, rateLimited, tokenResponse, type Call, type Route } from './test-support';

const ok = (body: unknown): Route => () => Response.json(body);
const noContent: Route = () => new Response(null, { status: 204 });

function newStore(routes: Record<string, Route>, channel: ReturnType<ReturnType<typeof channelHub>['create']> | null = null) {
  const f = makeFetch(routes);
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel });
  return { store, ...f };
}

const PENDING_KEY = 'wordmet-admin-logout-pending';

describe('SessionStore sign-out failure (T9, FE38)', () => {
  beforeEach(() => sessionStorage.clear());

  const signedInRoutes = (logout: Route): Record<string, Route> => ({
    'POST /v1/auth/login': () => tokenResponse('tok-1'),
    'GET /v1/me': ok(makeMe()),
    'POST /v1/auth/logout': logout,
  });

  it('T9: logout answered 503 → signed-out logout-failed, flag set', async () => {
    const { store } = newStore(signedInRoutes(() => problem(503, 'unavailable')));
    await store.login('a@example.com', 'pw');

    await store.logout();

    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
    expect(store.hasAccessToken).toBe(false);
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
  });

  it('T9: logout with no answer (network error) → logout-failed too', async () => {
    const { store } = newStore(
      signedInRoutes(() => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await store.login('a@example.com', 'pw');
    await store.logout();
    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
  });

  it.each([200, 204, 401, 403])('logout answered %i counts as done', async (status) => {
    const { store } = newStore(signedInRoutes(() => new Response(null, { status })));
    await store.login('a@example.com', 'pw');
    await store.logout();
    expect(store.state).toEqual({ status: 'signed-out', notice: null });
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("logout('expired') answered 401 → no logout-failed", async () => {
    const { store } = newStore(signedInRoutes(() => problem(401, 'invalid-token')));
    await store.login('a@example.com', 'pw');
    await store.logout('expired');
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("logout('expired') answered 503 → keeps its notice, no flag", async () => {
    const { store } = newStore(signedInRoutes(() => problem(503, 'unavailable')));
    await store.login('a@example.com', 'pw');
    await store.logout('expired');
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('FE38: a new store with the flag → logout-failed without calling refresh', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const { store, count } = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('tok-9'), 'GET /v1/me': ok(makeMe()) });

    await store.bootstrap();

    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
    expect(count('POST', '/v1/auth/refresh')).toBe(0);
  });

  it('logout answered 429 counts as failed (the server did nothing)', async () => {
    const { store } = newStore(signedInRoutes(() => problem(429, 'rate-limited')));
    await store.login('a@example.com', 'pw');
    await store.logout();
    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
  });

  it('retryLogout answered 429 keeps the flag and the notice', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const { store } = newStore({ 'POST /v1/auth/logout': () => problem(429, 'rate-limited') });
    await store.bootstrap();
    await store.retryLogout();
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
  });

  it('a failed sign-out in tab A leaves tab B signed-out with logout-failed and the flag; a fresh store there does not refresh', async () => {
    const hub = channelHub();
    const a = newStore(signedInRoutes(() => problem(503, 'unavailable')), hub.create());
    const b = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('tok-9'), 'GET /v1/me': ok(makeMe()) }, hub.create());
    await a.store.login('a@example.com', 'pw');
    sessionStorage.clear();

    await a.store.logout();

    expect(b.store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
    const fresh = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('tok-9') });
    await fresh.store.bootstrap();
    expect(fresh.count('POST', '/v1/auth/refresh')).toBe(0);
  });

  it('a late retryLogout answer does not sign out a tab that signed in again meanwhile', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const hub = channelHub();
    let release!: () => void;
    const gateP = new Promise<void>((r) => (release = r));
    const { store } = newStore(
      {
        'POST /v1/auth/logout': async () => {
          await gateP;
          return new Response(null, { status: 204 });
        },
        'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
        'GET /v1/me': ok(makeMe()),
      },
      hub.create(),
    );
    await store.bootstrap();
    const retry = store.retryLogout();

    hub.create().postMessage({ type: 'login' });
    await vi.waitFor(() => expect(store.state.status).toBe('signed-in'));
    release();
    await retry;

    expect(store.state.status).toBe('signed-in');
  });

  it('a sign-in after a failed sign-out clears the flag; a fresh store bootstraps normally', async () => {
    let logoutStatus = 503;
    const routes = {
      ...signedInRoutes(() => new Response(null, { status: logoutStatus })),
      'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
    };
    const { store } = newStore(routes);
    await store.login('a@example.com', 'pw');
    await store.logout();
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
    logoutStatus = 204;

    await store.login('a@example.com', 'pw');

    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    const fresh = newStore(routes);
    await fresh.store.bootstrap();
    expect(fresh.count('POST', '/v1/auth/refresh')).toBe(1);
    expect(fresh.store.state.status).toBe('signed-in');
  });

  it('a login in another tab clears the flag in a flagged tab, which then bootstraps', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const hub = channelHub();
    const routes = { 'POST /v1/auth/refresh': () => tokenResponse('tok-2'), 'GET /v1/me': ok(makeMe()) };
    const a = newStore(routes, hub.create());
    await a.store.bootstrap();
    expect(a.store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });

    hub.create().postMessage({ type: 'login' });

    await vi.waitFor(() => expect(a.store.state.status).toBe('signed-in'));
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(a.count('POST', '/v1/auth/refresh')).toBe(1);
  });

  it('retryLogout ok → flag removed, notice null', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const { store, count } = newStore({ 'POST /v1/auth/logout': noContent });
    await store.bootstrap();

    await store.retryLogout();

    expect(count('POST', '/v1/auth/logout')).toBe(1);
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(store.state).toEqual({ status: 'signed-out', notice: null });
  });

  it('retryLogout failing again keeps the flag and the notice', async () => {
    sessionStorage.setItem(PENDING_KEY, '1');
    const { store } = newStore({ 'POST /v1/auth/logout': () => problem(503, 'unavailable') });
    await store.bootstrap();
    await store.retryLogout();
    expect(sessionStorage.getItem(PENDING_KEY)).toBe('1');
    expect(store.state).toEqual({ status: 'signed-out', notice: 'logout-failed' });
  });
});

describe('SessionStore', () => {
  it('B25#2: login of a verified user without role calls logout with X-CSRF-Protection: 1, keeps no token, state signed-out notice no-access', async () => {
    const { store, calls, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe({ staff_role: null, email_verified: true, permissions: [] })),
      'POST /v1/auth/logout': noContent,
    });

    await store.login('learner@example.com', 'pw');

    expect(store.state).toEqual({ status: 'signed-out', notice: 'no-access' });
    expect(count('POST', '/v1/auth/logout')).toBe(1);
    const logout = calls.find((c) => c.path === '/v1/auth/logout')!;
    expect(logout.headers['X-CSRF-Protection']).toBe('1');
    expect(logout.body).toEqual({});
    expect(store.hasAccessToken).toBe(false);
    const login = calls.find((c) => c.path === '/v1/auth/login')!;
    expect(login.body).toEqual({ email: 'learner@example.com', password: 'pw', client: 'web', device_label: 'Wordmet Admin' });
  });

  it('B25#3: no role and unverified → signed-out notice no-access, logout called (no verify-email state)', async () => {
    const { store, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe({ staff_role: null, email_verified: false, permissions: [] })),
      'POST /v1/auth/logout': noContent,
    });

    await store.login('new@example.com', 'pw');

    expect(store.state).toEqual({ status: 'signed-out', notice: 'no-access' });
    expect(count('POST', '/v1/auth/logout')).toBe(1);
    expect(store.hasAccessToken).toBe(false);
  });

  it('B25#27 (store): role + must_change_password → change-password; changePassword(ok) stores the new token, /me now false → signed-in', async () => {
    let meCalls = 0;
    const { store, calls } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/password/change': () => tokenResponse('tok-2'),
      'GET /v1/me': () => Response.json(makeMe({ must_change_password: meCalls++ === 0 })),
    });

    await store.login('editor@example.com', 'generated');
    expect(store.state).toMatchObject({ status: 'change-password', me: { must_change_password: true } });
    expect(store.hasAccessToken).toBe(true);

    await store.changePassword('generated', 'My-new-pass-123');

    const change = calls.find((c) => c.path === '/v1/auth/password/change')!;
    expect(change.method).toBe('POST');
    expect(change.headers.Authorization).toBe('Bearer tok-1');
    expect(change.body).toEqual({ current_password: 'generated', new_password: 'My-new-pass-123' });
    const lastMe = calls.filter((c) => c.path === '/v1/me').at(-1)!;
    expect(lastMe.headers.Authorization).toBe('Bearer tok-2');
    expect(store.state).toMatchObject({ status: 'signed-in', me: { must_change_password: false } });
  });

  it('changePassword with 400 same_as_current → ApiError with violations, state stays change-password', async () => {
    const { store } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/password/change': () => problem(400, 'validation-failed', { violations: ['same_as_current'] }),
      'GET /v1/me': ok(makeMe({ must_change_password: true })),
    });
    await store.login('editor@example.com', 'generated');

    await expect(store.changePassword('generated', 'generated')).rejects.toMatchObject({
      problem: { slug: 'validation-failed', violations: ['same_as_current'] },
    });
    expect(store.state.status).toBe('change-password');
    expect(store.hasAccessToken).toBe(true);
  });

  it('403 password-change-required → recheck → change-password, no refresh call', async () => {
    let meCalls = 0;
    const { store, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': () => Response.json(makeMe({ must_change_password: meCalls++ > 0 })),
      'GET /v1/admin/x': () => problem(403, 'password-change-required'),
    });
    await store.login('editor@example.com', 'pw');
    expect(store.state.status).toBe('signed-in');

    await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toMatchObject({
      problem: { slug: 'password-change-required' },
    });

    expect(count('POST', '/v1/auth/refresh')).toBe(0);
    expect(store.state).toMatchObject({ status: 'change-password' });
  });

  it('a failed login throws the ApiError and stays signed-out', async () => {
    const { store } = newStore({ 'POST /v1/auth/login': () => problem(401, 'invalid-credentials') });
    await expect(store.login('a@b.co', 'bad')).rejects.toBeInstanceOf(ApiError);
    expect(store.state.status).not.toBe('signed-in');
  });

  it('B25#4: bootstrap with a working refresh → signed-in; with refresh 401 → signed-out notice null', async () => {
    const good = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
    });
    expect(good.store.state.status).toBe('loading');
    await good.store.bootstrap();
    expect(good.store.state).toMatchObject({ status: 'signed-in', me: { staff_role: 'editor' } });
    const refresh = good.calls[0];
    expect(refresh.headers['X-CSRF-Protection']).toBe('1');
    expect(refresh.body).toEqual({});

    const bad = newStore({ 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    await bad.store.bootstrap();
    expect(bad.store.state).toEqual({ status: 'signed-out', notice: null });
    expect(bad.count('GET', '/v1/me')).toBe(0);
  });

  it('B25#5: three requests get 401 at once → exactly one POST /v1/auth/refresh, each request retried once', async () => {
    let issued = 0;
    const seen: string[] = [];
    const { store, count } = newStore({
      'POST /v1/auth/refresh': async () => {
        await new Promise((r) => setTimeout(r, 5));
        issued += 1;
        return tokenResponse(`tok-${issued}`);
      },
      'GET /v1/a': (c) => {
        seen.push(`a:${c.headers.Authorization}`);
        return c.headers.Authorization === 'Bearer tok-1' ? Response.json({ id: 'a' }) : problem(401, 'invalid-token');
      },
      'GET /v1/b': (c) => {
        seen.push(`b:${c.headers.Authorization}`);
        return c.headers.Authorization === 'Bearer tok-1' ? Response.json({ id: 'b' }) : problem(401, 'invalid-token');
      },
      'GET /v1/c': (c) => {
        seen.push(`c:${c.headers.Authorization}`);
        return c.headers.Authorization === 'Bearer tok-1' ? Response.json({ id: 'c' }) : problem(401, 'invalid-token');
      },
    });
    const api = createApiClient({ send: store.send });

    const results = await Promise.all([api.get('/v1/a'), api.get('/v1/b'), api.get('/v1/c')]);

    expect(results).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(count('POST', '/v1/auth/refresh')).toBe(1);
    for (const p of ['a', 'b', 'c']) expect(seen.filter((s) => s.startsWith(`${p}:`))).toHaveLength(2);
  });

  it('a 401 that arrives after another request already refreshed retries with the new token without a second refresh', async () => {
    let issued = 0;
    const { store, count } = newStore({
      'POST /v1/auth/refresh': () => {
        issued += 1;
        return tokenResponse(`tok-${issued}`);
      },
      'GET /v1/slow': async (c) => {
        await new Promise((r) => setTimeout(r, 20));
        return c.headers.Authorization === 'Bearer tok-1' ? Response.json({ id: 'slow' }) : problem(401, 'invalid-token');
      },
      'GET /v1/fast': (c) => (c.headers.Authorization === 'Bearer tok-1' ? Response.json({ id: 'fast' }) : problem(401, 'invalid-token')),
    });
    const api = createApiClient({ send: store.send });
    // first call has no token yet: both 401, the slow one answers after the fast one already refreshed
    const [slow, fast] = await Promise.all([api.get('/v1/slow'), api.get('/v1/fast')]);
    expect([slow, fast]).toEqual([{ id: 'slow' }, { id: 'fast' }]);
    expect(count('POST', '/v1/auth/refresh')).toBe(1);
  });

  it('B25#6: 403 forbidden → refresh then /me; me.staff_role null → signed-out no-access', async () => {
    const { store, calls } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
      'GET /v1/me': (() => {
        let n = 0;
        return () => Response.json(n++ === 0 ? makeMe() : makeMe({ staff_role: null, permissions: [] }));
      })(),
      'GET /v1/admin/x': () => problem(403, 'forbidden'),
      'POST /v1/auth/logout': noContent,
    });
    await store.login('s@example.com', 'pw');
    expect(store.state.status).toBe('signed-in');

    await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toMatchObject({ problem: { slug: 'forbidden' } });

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /v1/auth/login',
      'GET /v1/me',
      'GET /v1/admin/x',
      'POST /v1/auth/refresh',
      'GET /v1/me',
      'POST /v1/auth/logout',
    ]);
    expect(store.state).toEqual({ status: 'signed-out', notice: 'no-access' });
  });

  it('B25#6: 403 forbidden and the role is kept → state me updated with the new permissions and the ApiError is rethrown', async () => {
    const reduced = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });
    const { store } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
      'GET /v1/me': (() => {
        let n = 0;
        return () => Response.json(n++ === 0 ? makeMe() : reduced);
      })(),
      'GET /v1/admin/x': () => problem(403, 'forbidden'),
    });
    await store.login('s@example.com', 'pw');

    await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toBeInstanceOf(ApiError);

    expect(store.state).toEqual({ status: 'signed-in', me: reduced });
  });

  it.each(['profile-incomplete', 'csrf-header-required', 'staff-role-rule'])(
    'B25#6: 403 %s is rethrown without refresh or /me',
    async (slug) => {
      const { store, count } = newStore({
        'POST /v1/auth/login': () => tokenResponse('tok-1'),
        'GET /v1/me': ok(makeMe()),
        'GET /v1/admin/x': () => problem(403, slug),
      });
      await store.login('s@example.com', 'pw');
      await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toMatchObject({ problem: { slug } });
      expect(count('POST', '/v1/auth/refresh')).toBe(0);
      expect(count('GET', '/v1/me')).toBe(1); // only the one from login
      expect(store.state.status).toBe('signed-in');
    },
  );

  it('B25#6a: 403 forbidden and refresh 401 → signed-out notice expired, /me never called again', async () => {
    const { store, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/admin/x': () => problem(403, 'forbidden'),
      'POST /v1/auth/logout': noContent,
    });
    await store.login('s@example.com', 'pw');

    await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toMatchObject({ problem: { slug: 'forbidden' } });

    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
    expect(count('GET', '/v1/me')).toBe(1); // only the one from login
    expect(store.hasAccessToken).toBe(false);
  });

  it('a 401 whose refresh fails ends signed-out with notice expired', async () => {
    const { store } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => problem(401, 'invalid-token'),
      'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
      'POST /v1/auth/logout': noContent,
    });
    await store.login('s@example.com', 'pw');
    await expect(createApiClient({ send: store.send }).get('/v1/x')).rejects.toBeInstanceOf(ApiError);
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
  });

  it('B25#8: logout in store A posts {type:"logout"}; store B (same channel pair) becomes signed-out without any fetch', async () => {
    const hub = channelHub();
    const routes = {
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'POST /v1/auth/logout': noContent,
    };
    const a = newStore(routes, hub.create());
    const b = newStore(routes, hub.create());
    await a.store.bootstrap();
    await b.store.bootstrap();
    expect(b.store.state.status).toBe('signed-in');
    const before = b.calls.length;

    await a.store.logout();

    expect(a.store.state).toEqual({ status: 'signed-out', notice: null });
    expect(b.store.state).toEqual({ status: 'signed-out', notice: null });
    expect(b.store.hasAccessToken).toBe(false);
    expect(b.calls.length).toBe(before);
  });

  it('a login in tab A makes a signed-out tab B bootstrap again', async () => {
    const hub = channelHub();
    let refreshOk = false;
    const routes = {
      'POST /v1/auth/refresh': () => (refreshOk ? tokenResponse('tok-1') : problem(401, 'invalid-token')),
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
    };
    const a = newStore(routes, hub.create());
    const b = newStore(routes, hub.create());
    await b.store.bootstrap();
    expect(b.store.state.status).toBe('signed-out');

    refreshOk = true;
    await a.store.login('s@example.com', 'pw');
    await new Promise((r) => setTimeout(r, 0));
    await b.store.bootstrap(); // joins the in-flight/finished bootstrap started by the message

    expect(b.store.state.status).toBe('signed-in');
  });

  it('B25E13: channel null → logout still works', async () => {
    const { store } = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'POST /v1/auth/logout': noContent,
    });
    await store.bootstrap();
    await store.logout();
    expect(store.state).toEqual({ status: 'signed-out', notice: null });
  });

  it('logout clears the session even when the logout request fails', async () => {
    const { store } = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'POST /v1/auth/logout': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await store.bootstrap();
    await store.logout('expired');
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
    expect(store.hasAccessToken).toBe(false);
  });

  it('subscribe notifies on every state change and stops after unsubscribe', async () => {
    const { store } = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
    });
    let n = 0;
    const off = store.subscribe(() => (n += 1));
    await store.bootstrap();
    expect(n).toBeGreaterThan(0);
    const seen = n;
    off();
    store.subscribe(() => {})();
    await store.recheck();
    expect(n).toBe(seen);
  });

  it('B25E30 a 429 from the bootstrap refresh keeps the session: wait Retry-After, refresh again, signed in', async () => {
    let refreshes = 0;
    const waits: number[] = [];
    const f = makeFetch({
      'POST /v1/auth/refresh': () => (++refreshes === 1 ? rateLimited(2) : tokenResponse('tok-1')),
      'GET /v1/me': () => Response.json(makeMe()),
    });
    const store = new SessionStore({
      baseUrl: BASE,
      fetch: f.fetch,
      channel: null,
      wait: async (ms: number) => {
        waits.push(ms);
      },
    });

    await store.bootstrap();

    expect(waits).toEqual([2000]);
    expect(f.count('POST', '/v1/auth/refresh')).toBe(2);
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('B25E30 without Retry-After the store waits 10 s', async () => {
    let refreshes = 0;
    const waits: number[] = [];
    const f = makeFetch({
      'POST /v1/auth/refresh': () => (++refreshes === 1 ? problem(429, 'rate-limited') : tokenResponse('tok-1')),
      'GET /v1/me': () => Response.json(makeMe()),
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: async (ms: number) => void waits.push(ms) });
    await store.bootstrap();
    expect(waits).toEqual([10_000]);
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('B25E30 three 429s in a row end signed-out with notice rate-limited, no POST /v1/auth/logout and no broadcast', async () => {
    const hub = channelHub();
    const heard: unknown[] = [];
    hub.create().addEventListener('message', (e) => heard.push(e.data));
    const waits: number[] = [];
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(1) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: hub.create(), wait: async (ms: number) => void waits.push(ms) });
    await store.bootstrap();
    expect(f.count('POST', '/v1/auth/refresh')).toBe(3);
    expect(waits).toEqual([1000, 1000]);
    expect(store.state).toEqual({ status: 'signed-out', notice: 'rate-limited' });
    expect(f.count('POST', '/v1/auth/logout')).toBe(0);
    expect(heard).toEqual([]);
  });

  it('B25E30 mid-session a 401 whose refresh gets 429 waits, refreshes and retries the request once', async () => {
    let refreshes = 0;
    let reads = 0;
    const waits: number[] = [];
    const f = makeFetch({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': () => Response.json(makeMe()),
      'POST /v1/auth/refresh': () => (++refreshes === 1 ? rateLimited(3) : tokenResponse('tok-2')),
      'GET /v1/thing': () => (++reads === 1 ? problem(401, 'invalid-token') : Response.json({ ok: true })),
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: async (ms: number) => void waits.push(ms) });
    await store.login('editor@example.com', 'pw');

    const res = await store.send('/v1/thing', { method: 'GET', headers: {} });

    expect(res.status).toBe(200);
    expect(waits).toEqual([3000]);
    expect(f.count('GET', '/v1/thing')).toBe(2);
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('B25E30 while the store waits at start, the loading state carries retryAt', async () => {
    let refreshes = 0;
    const seen: unknown[] = [];
    const f = makeFetch({
      'POST /v1/auth/refresh': () => (++refreshes === 1 ? rateLimited(2) : tokenResponse('tok-1')),
      'GET /v1/me': () => Response.json(makeMe()),
    });
    const store: SessionStore = new SessionStore({
      baseUrl: BASE,
      fetch: f.fetch,
      channel: null,
      now: () => 1_000,
      wait: async () => void seen.push(store.state),
    });
    await store.bootstrap();
    expect(seen).toEqual([{ status: 'loading', retryAt: 3_000 }]);
  });

  // RKC1/RKC2 (keepalive design): a reload or page leave mid-refresh must not drop the rotated refresh cookie.
  const refreshTries = (calls: Call[]) =>
    calls.filter((c) => c.method === 'POST' && c.path === '/v1/auth/refresh').map((c) => c.keepalive);

  it('RKC1: the page-start refresh is sent with keepalive', async () => {
    const { store, calls } = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('tok-1'), 'GET /v1/me': ok(makeMe()) });
    await store.bootstrap();
    expect(refreshTries(calls)).toEqual([true]);
  });

  it('RKC1: the refresh after a 401 is sent with keepalive', async () => {
    let reads = 0;
    const { store, calls } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => (++reads === 1 ? problem(401, 'invalid-token') : Response.json({ ok: true })),
      'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
    });
    await store.login('s@example.com', 'pw');
    await store.send('/v1/x', { method: 'GET', headers: {} });
    expect(refreshTries(calls)).toEqual([true]);
  });

  it('RKC1: the refresh after a 403 forbidden is sent with keepalive', async () => {
    const { store, calls } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'POST /v1/auth/refresh': () => tokenResponse('tok-2'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/admin/x': () => problem(403, 'forbidden'),
    });
    await store.login('s@example.com', 'pw');
    await expect(createApiClient({ send: store.send }).get('/v1/admin/x')).rejects.toBeInstanceOf(ApiError);
    expect(refreshTries(calls)).toEqual([true]);
  });

  it('RKC1: every try after a 429 is sent with keepalive, at page start and mid-session', async () => {
    let startTries = 0;
    const atStart = makeFetch({
      'POST /v1/auth/refresh': () => (++startTries === 1 ? rateLimited(2) : tokenResponse('tok-1')),
      'GET /v1/me': () => Response.json(makeMe()),
    });
    await new SessionStore({ baseUrl: BASE, fetch: atStart.fetch, channel: null, wait: async () => {} }).bootstrap();
    expect(refreshTries(atStart.calls)).toEqual([true, true]);

    let midTries = 0;
    let reads = 0;
    const midSession = makeFetch({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': () => Response.json(makeMe()),
      'POST /v1/auth/refresh': () => (++midTries === 1 ? rateLimited(3) : tokenResponse('tok-2')),
      'GET /v1/thing': () => (++reads === 1 ? problem(401, 'invalid-token') : Response.json({ ok: true })),
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: midSession.fetch, channel: null, wait: async () => {} });
    await store.login('editor@example.com', 'pw');
    await store.send('/v1/thing', { method: 'GET', headers: {} });
    expect(refreshTries(midSession.calls)).toEqual([true, true]);
  });

  it('RK8: a keepalive refresh the browser rejects (TypeError) is sent once more without keepalive and the session starts', async () => {
    let tries = 0;
    const { store, calls } = newStore({
      'POST /v1/auth/refresh': () => {
        if (++tries === 1) throw new TypeError('Preflight request for request with keepalive specified is currently not supported');
        return tokenResponse('tok-1');
      },
      'GET /v1/me': ok(makeMe()),
    });
    await store.bootstrap();
    expect(refreshTries(calls)).toEqual([true, undefined]);
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('RK8: when the retry without keepalive also fails (offline), the refresh fails as before after exactly two tries', async () => {
    const { store, calls } = newStore({
      'POST /v1/auth/refresh': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await store.bootstrap();
    expect(refreshTries(calls)).toEqual([true, undefined]);
    expect(store.state).toEqual({ status: 'unavailable' });
  });

  it('RK8: once the page has fired pagehide, a rejected keepalive refresh is not sent again (the browser finishes the keepalive one)', async () => {
    const { store, calls } = newStore({
      'POST /v1/auth/refresh': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    window.dispatchEvent(new Event('pagehide'));
    await store.bootstrap();
    expect(refreshTries(calls)).toEqual([true]);
    window.dispatchEvent(new Event('pageshow'));
  });

  it('RK8: the keepalive refresh rejected before pagehide is not sent again when another pagehide listener runs first (RKC3)', async () => {
    const { store, calls } = newStore({
      'POST /v1/auth/refresh': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    // Chromium rejects the keepalive fetch before pagehide fires and runs a microtask checkpoint after each listener: an
    // earlier listener (React Router's) lets the rejection settle before ours sets `leaving`. jsdom has no such checkpoint.
    const started = store.bootstrap();
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    window.dispatchEvent(new Event('pagehide'));
    await started;
    expect(refreshTries(calls)).toEqual([true]);
    window.dispatchEvent(new Event('pageshow'));
  });

  it('RK8: after pageshow (back from the back/forward cache) the fallback works again', async () => {
    let tries = 0;
    const { store, calls } = newStore({
      'POST /v1/auth/refresh': () => {
        if (++tries === 1) throw new TypeError('Preflight request for request with keepalive specified is currently not supported');
        return tokenResponse('tok-1');
      },
      'GET /v1/me': ok(makeMe()),
    });
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pageshow'));
    await store.bootstrap();
    expect(refreshTries(calls)).toEqual([true, undefined]);
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('RKC2: login, /me, password change, other API calls and logout are sent without keepalive', async () => {
    let meCalls = 0;
    const { store, calls } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': () => Response.json(makeMe({ must_change_password: meCalls++ === 0 })),
      'POST /v1/auth/password/change': () => tokenResponse('tok-2'),
      'GET /v1/x': () => Response.json({ ok: true }),
      'POST /v1/auth/logout': noContent,
    });
    await store.login('editor@example.com', 'generated');
    await store.changePassword('generated', 'My-new-pass-123');
    await store.send('/v1/x', { method: 'GET', headers: {} });
    await store.logout();

    const others = calls.filter((c) => c.path !== '/v1/auth/refresh');
    expect(new Set(others.map((c) => c.path))).toEqual(
      new Set(['/v1/auth/login', '/v1/me', '/v1/auth/password/change', '/v1/x', '/v1/auth/logout']),
    );
    expect(others.every((c) => c.keepalive === undefined)).toBe(true);
  });
});

describe('SessionStore: API unavailable (FE35-FE37)', () => {
  const heardOn = (hub: ReturnType<typeof channelHub>) => {
    const heard: unknown[] = [];
    hub.create().addEventListener('message', (e) => heard.push(e.data));
    return heard;
  };

  it('FE35: 401 then refresh 503 → offline (NetworkError), no logout call, no broadcast, token cleared', async () => {
    const hub = channelHub();
    const heard = heardOn(hub);
    const f = makeFetch({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => problem(401, 'invalid-token'),
      'POST /v1/auth/refresh': () => problem(503, 'unavailable'),
      'POST /v1/auth/logout': noContent,
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: hub.create() });
    await store.login('s@example.com', 'pw');
    heard.length = 0;
    await expect(createApiClient({ send: store.send }).get('/v1/x')).rejects.toBeInstanceOf(NetworkError);
    expect(f.count('POST', '/v1/auth/logout')).toBe(0);
    expect(heard).toEqual([]);
    expect(store.hasAccessToken).toBe(false);
    expect(store.state.status).toBe('signed-in');
  });

  it('403 forbidden then refresh 503 → the response is returned, no logout', async () => {
    const f = makeFetch({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => problem(403, 'forbidden'),
      'POST /v1/auth/refresh': () => problem(503, 'unavailable'),
      'POST /v1/auth/logout': noContent,
    });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
    await store.login('s@example.com', 'pw');
    await expect(createApiClient({ send: store.send }).get('/v1/x')).rejects.toMatchObject({ problem: { slug: 'forbidden' } });
    expect(f.count('POST', '/v1/auth/logout')).toBe(0);
    expect(store.state.status).toBe('signed-in');
  });

  it('FE36: bootstrap with refresh 503 → unavailable; retry with refresh ok → signed-in', async () => {
    let up = false;
    const { store } = newStore({
      'POST /v1/auth/refresh': () => (up ? tokenResponse('tok-1') : problem(503, 'unavailable')),
      'GET /v1/me': ok(makeMe()),
    });
    await store.bootstrap();
    expect(store.state).toEqual({ status: 'unavailable' });
    up = true;
    await store.bootstrap();
    expect(store.state).toMatchObject({ status: 'signed-in' });
  });

  it('Review Focus 4: unavailable then retry with refresh 401 → signed-out "expired"', async () => {
    let up = false;
    const { store } = newStore({
      'POST /v1/auth/refresh': () => (up ? problem(401, 'invalid-token') : problem(503, 'unavailable')),
    });
    await store.bootstrap();
    expect(store.state).toEqual({ status: 'unavailable' });
    up = true;
    await store.bootstrap();
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
  });

  it('FE37 (control): refresh 401 mid-session → logout("expired") as before', async () => {
    const { store, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => problem(401, 'invalid-token'),
      'POST /v1/auth/refresh': () => problem(401, 'invalid-token'),
      'POST /v1/auth/logout': noContent,
    });
    await store.login('s@example.com', 'pw');
    await expect(createApiClient({ send: store.send }).get('/v1/x')).rejects.toBeInstanceOf(ApiError);
    expect(store.state).toEqual({ status: 'signed-out', notice: 'expired' });
    expect(count('POST', '/v1/auth/logout')).toBe(1);
  });

  it('control: 429 three times → rate-limited as before', async () => {
    const f = makeFetch({ 'POST /v1/auth/refresh': () => rateLimited(1) });
    const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null, wait: async () => {} });
    await store.bootstrap();
    expect(store.state).toEqual({ status: 'signed-out', notice: 'rate-limited' });
  });
});
