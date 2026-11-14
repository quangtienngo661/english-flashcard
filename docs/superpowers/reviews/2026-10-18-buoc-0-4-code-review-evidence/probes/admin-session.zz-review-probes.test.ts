// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { describe, expect, it } from 'vitest';
import { createApiClient } from '../api/client';
import { ApiError } from '../api/problem';
import { SessionStore } from './session-store';
import { BASE, channelHub, makeFetch, makeMe, problem, tokenResponse, type Route } from './test-support';

const ok = (body: unknown): Route => () => Response.json(body);
const noContent: Route = () => new Response(null, { status: 204 });

function newStore(routes: Record<string, Route>, channel: ReturnType<ReturnType<typeof channelHub>['create']> | null = null) {
  const f = makeFetch(routes);
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel });
  return { store, ...f };
}

describe('review probes (admin session)', () => {
  it('AD1: mid-session, a 401 whose refresh gets 503 → what happens to this tab, the server session and the other tab', async () => {
    const hub = channelHub();
    const other = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('t-other'), 'GET /v1/me': ok(makeMe()) }, hub.create());
    await other.store.bootstrap();
    const { store, count } = newStore({
      'POST /v1/auth/login': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'GET /v1/x': () => problem(401, 'invalid-token'),
      'POST /v1/auth/refresh': () => problem(503, ''),
      'POST /v1/auth/logout': noContent,
    }, hub.create());
    await store.login('s@example.com', 'pw');
    const err = await createApiClient({ send: store.send }).get('/v1/x').catch((e: unknown) => e);
    console.log('AD1 request error is ApiError:', err instanceof ApiError);
    console.log('AD1 POST /v1/auth/logout sent:', count('POST', '/v1/auth/logout'));
    console.log('AD1 this tab state:', JSON.stringify(store.state));
    console.log('AD1 other tab state:', JSON.stringify(other.store.state));
    expect(true).toBe(true);
  });

  it('AD1 (start): page start with refresh 503 → state', async () => {
    const { store } = newStore({ 'POST /v1/auth/refresh': () => problem(503, '') });
    await store.bootstrap();
    console.log('AD1-start state after refresh 503 at page start:', JSON.stringify(store.state));
  });

  it('AD2: logout answered 503 → local state; a reload (new store, cookie still valid) bootstraps back in', async () => {
    const { store, count } = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': ok(makeMe()),
      'POST /v1/auth/logout': () => problem(503, ''),
    });
    await store.bootstrap();
    let thrown: unknown = null;
    await store.logout().catch((e: unknown) => { thrown = e; });
    console.log('AD2 logout sent:', count('POST', '/v1/auth/logout'), 'threw:', thrown !== null, 'state:', JSON.stringify(store.state));
    // The server never revoked the chain, so the httpOnly cookie still refreshes: model the reload as a new store.
    const reload = newStore({ 'POST /v1/auth/refresh': () => tokenResponse('tok-2'), 'GET /v1/me': ok(makeMe()) });
    await reload.store.bootstrap();
    console.log('AD2 after reload:', JSON.stringify({ status: reload.store.state.status }));
  });

  it('AD8: logout while recheck() waits for /me', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    let meCalls = 0;
    const { store } = newStore({
      'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
      'GET /v1/me': async () => {
        meCalls += 1;
        if (meCalls === 2) await gate;
        return Response.json(makeMe());
      },
      'POST /v1/auth/logout': noContent,
    });
    await store.bootstrap();
    const p = store.recheck();
    await new Promise((r) => setTimeout(r, 0));
    await store.logout();
    console.log('AD8 state right after logout:', store.state.status);
    release();
    await p;
    console.log('AD8 state after the slow /me returned:', store.state.status, 'hasAccessToken:', store.hasAccessToken);
  });
});
