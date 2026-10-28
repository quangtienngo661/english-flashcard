import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { EntitlementsService, type EntitlementsSnapshot } from '../entitlements.service.js';
import { GrantsService } from '../grants/grants.service.js';
import { alertReached } from './ai-usage.js';
import { AdminEntitlementsController } from './admin-entitlements.controller.js';

const PROBLEM = 'https://api.example.com/problems/';
const SNAPSHOT = { plan: 'free' } as unknown as EntitlementsSnapshot;

describe('alertReached (D36)', () => {
  it('cap 1000, percent 75: used 749 → false, 750 → true; percent null → false; cap 0 → false; cap 2, used 2 → true', () => {
    expect(alertReached(749, 1000, 75)).toBe(false);
    expect(alertReached(750, 1000, 75)).toBe(true);
    expect(alertReached(1000, 1000, null)).toBe(false);
    expect(alertReached(5, 0, 75)).toBe(false);
    expect(alertReached(2, 2, 75)).toBe(true);
    expect(alertReached(1, 2, 75)).toBe(false);
  });
});

describe('entitlements read APIs (unit, mocked services)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  let role: 'admin' | 'editor' | null; let nativeLanguage: string | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  let snapshot: ReturnType<typeof vi.spyOn>; let aiUsage: ReturnType<typeof vi.spyOn>; let forUser: ReturnType<typeof vi.spyOn>; let lookup: ReturnType<typeof vi.spyOn>;
  let aiUsagePro: ReturnType<typeof vi.spyOn>;
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const entitlements = ctx.app.get(EntitlementsService);
    snapshot = vi.spyOn(entitlements, 'snapshot'); aiUsage = vi.spyOn(entitlements, 'aiUsage'); aiUsagePro = vi.spyOn(entitlements, 'aiUsagePro');
    forUser = vi.spyOn(ctx.app.get(GrantsService), 'forUser');
    lookup = vi.spyOn(ctx.app.get(GrantsService), 'lookup');
  });
  beforeEach(async () => {
    userId = randomUUID(); role = null; nativeLanguage = null;
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({
      userId, revokedAt: null, user: { staffRole: role, nativeLanguage },
    }));
    snapshot.mockReset().mockResolvedValue(SNAPSHOT);
    aiUsage.mockReset().mockResolvedValue({ date: '2026-11-10' });
    forUser.mockReset().mockResolvedValue([{ id: 'grant-1', changes: [] }]);
    hit.mockReset().mockResolvedValue(undefined);
    lookup.mockReset().mockResolvedValue({ user: { id: 'u', email: 'lan@example.test' }, grantable: true, reason: null });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('B5E91: an account without native_language and a staff account both get 200 from /v1/me/entitlements', async () => {
    const learner = await http().get('/v1/me/entitlements').set(auth());
    expect(learner.status).toBe(200);
    expect(learner.body).toEqual(SNAPSHOT);
    role = 'admin';
    expect((await http().get('/v1/me/entitlements').set(auth())).status).toBe(200);
  });

  it('B5E63: /v1/me/entitlements writes nothing (only snapshot is called, for the signed-in user)', async () => {
    await http().get('/v1/me/entitlements').set(auth());
    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(snapshot).toHaveBeenCalledWith(userId);
    expect(aiUsage).not.toHaveBeenCalled(); expect(forUser).not.toHaveBeenCalled();
  });

  it('/v1/me/entitlements needs a signed-in user', async () => {
    expect((await http().get('/v1/me/entitlements')).status).toBe(401);
  });

  it('user view: the snapshot plus every grant with its changes; 404 for an unknown id', async () => {
    role = 'editor';
    const target = randomUUID();
    const res = await http().get(`/v1/admin/entitlements/users/${target.toUpperCase()}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ plan: 'free', grants: [{ id: 'grant-1', changes: [] }] });
    expect(snapshot).toHaveBeenCalledWith(target);
    expect(forUser).toHaveBeenCalledWith(target);
    snapshot.mockResolvedValue(null);
    const missing = await http().get(`/v1/admin/entitlements/users/${target}`).set(auth());
    expect(missing.status).toBe(404);
    expect(missing.body.type).toBe(`${PROBLEM}not-found`);
    expect((await http().get('/v1/admin/entitlements/users/nope').set(auth())).status).toBe(400);
  });

  it('B5#27: an editor gets 403 forbidden on ai-usage; a learner on the user view', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/entitlements/ai-usage').set(auth());
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    role = null;
    expect((await http().get(`/v1/admin/entitlements/users/${randomUUID()}`).set(auth())).status).toBe(403);
    expect(aiUsage).not.toHaveBeenCalled();
  });

  it('ai-usage passes the date, defaults to undefined (the Vietnam day is chosen by the service) and rejects 2026-13-01', async () => {
    role = 'admin';
    expect((await http().get('/v1/admin/entitlements/ai-usage').set(auth())).status).toBe(200);
    expect(aiUsage).toHaveBeenLastCalledWith(undefined);
    expect((await http().get('/v1/admin/entitlements/ai-usage').set(auth()).query({ date: '2026-11-09' })).status).toBe(200);
    expect(aiUsage).toHaveBeenLastCalledWith('2026-11-09');
    for (const date of ['2026-13-01', '2026-02-30', '09/11/2026']) {
      const bad = await http().get('/v1/admin/entitlements/ai-usage').set(auth()).query({ date });
      expect(bad.status).toBe(400);
      expect(bad.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(aiUsage).toHaveBeenCalledTimes(2);
  });

  it('lookup: passes the actor and the address; staff only; the address is validated', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/entitlements/lookup').set(auth()).query({ email: 'Lan@example.test' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: 'u', email: 'lan@example.test' }, grantable: true, reason: null });
    expect(lookup).toHaveBeenCalledWith(userId, 'Lan@example.test');
    expect(hit).toHaveBeenCalledWith('entitlements.lookup', userId);
    for (const query of [{}, { email: 'ab' }, { email: 'a@example.test', extra: '1' }]) {
      expect((await http().get('/v1/admin/entitlements/lookup').set(auth()).query(query)).status).toBe(400);
    }
    expect(lookup).toHaveBeenCalledTimes(1);
    role = null;
    expect((await http().get('/v1/admin/entitlements/lookup').set(auth()).query({ email: 'lan@example.test' })).status).toBe(403);
  });

  it('lookup carries the entitlements.grant permission and the entitlements.lookup rate rule', () => {
    expect(listRoutes(ctx.app)).toContainEqual({ method: 'GET', path: '/v1/admin/entitlements/lookup', permissions: ['entitlements.grant'] });
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, AdminEntitlementsController.prototype.lookup)).toEqual(['entitlements.lookup']);
  });

  it('ai-usage/pro: ai.view is enough (an editor reads it), a learner gets 403, and the view is the service’s own', async () => {
    const view = { pro_learners: 2, no_limit: 0, truncated: false, buckets: [{ key: '0', learners: 2 }] };
    aiUsagePro.mockReset().mockResolvedValue(view);
    role = 'editor';
    const res = await http().get('/v1/admin/entitlements/ai-usage/pro').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(view);
    role = 'admin';
    expect((await http().get('/v1/admin/entitlements/ai-usage/pro').set(auth())).status).toBe(200);
    role = null;
    const learner = await http().get('/v1/admin/entitlements/ai-usage/pro').set(auth());
    expect(learner.status).toBe(403);
    expect(learner.body.type).toBe(`${PROBLEM}forbidden`);
    expect(aiUsagePro).toHaveBeenCalledTimes(2);
    expect((await http().get('/v1/admin/entitlements/ai-usage/pro')).status).toBe(401);
  });

  it('listRoutes: users/:user_id needs entitlements.grant, ai-usage needs settings.manage, /me needs no staff permission', () => {
    const routes = listRoutes(ctx.app);
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/admin/entitlements/users/:user_id', permissions: ['entitlements.grant'] });
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/admin/entitlements/ai-usage', permissions: ['settings.manage'] });
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/admin/entitlements/ai-usage/pro', permissions: ['ai.view'] });
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/me/entitlements', permissions: null });
  });
});

