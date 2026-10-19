import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { AdminGrantsController } from './admin-grants.controller.js';
import { GrantsService } from './grants.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin grants HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let create: ReturnType<typeof vi.spyOn>; let revoke: ReturnType<typeof vi.spyOn>;
  let update: ReturnType<typeof vi.spyOn>; let list: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const learner = randomUUID();
  const grantId = randomUUID();
  const validCreate = { user_id: learner, kind: 'plan', plan: 'pro', ends_at: '2026-12-31T00:00:00Z', reason: 'test' };
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const grants = ctx.app.get(GrantsService);
    create = vi.spyOn(grants, 'create'); revoke = vi.spyOn(grants, 'revoke');
    update = vi.spyOn(grants, 'update'); list = vi.spyOn(grants, 'list');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    const view = { id: grantId };
    create.mockReset().mockResolvedValue(view); revoke.mockReset().mockResolvedValue(view);
    update.mockReset().mockResolvedValue(view); list.mockReset().mockResolvedValue({ items: [view], next_page_token: null });
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('valid requests bind their schemas, pass the actor, and limit the three writes', async () => {
    const created = await http().post('/v1/admin/entitlements/grants').set(auth()).set('Idempotency-Key', 'k1').send(validCreate);
    expect(created.status).toBe(201);
    expect(create).toHaveBeenCalledWith(actorId, validCreate);
    const revoked = await http().post(`/v1/admin/entitlements/grants/${grantId}/revoke`).set(auth()).send({ reason: ' stop ' });
    expect(revoked.status).toBe(200);
    expect(revoke).toHaveBeenCalledWith(actorId, grantId, 'stop');
    const patched = await http().patch(`/v1/admin/entitlements/grants/${grantId.toUpperCase()}`).set(auth())
      .send({ ends_at: '2027-01-31T00:00:00Z', reason: 'longer' });
    expect(patched.status).toBe(200);
    expect(update).toHaveBeenCalledWith(actorId, grantId, { ends_at: '2027-01-31T00:00:00Z', reason: 'longer' });
    expect(hit).toHaveBeenCalledTimes(3);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('B5#21: the list passes granted_by and expiring_within_days', async () => {
    const editor = randomUUID();
    const res = await http().get('/v1/admin/entitlements/grants').set(auth()).query({ granted_by: editor, expiring_within_days: '7' });
    expect(res.status).toBe(200);
    expect(list).toHaveBeenCalledWith({ granted_by: editor, expiring_within_days: 7, page_size: 20 });
    expect(hit).not.toHaveBeenCalled();
  });

  it('bad bodies, params and queries → 400 validation-failed before the service (PATCH with no date too)', async () => {
    for (const request of [
      () => http().post('/v1/admin/entitlements/grants').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, ends_at: undefined }),
      () => http().post('/v1/admin/entitlements/grants').set(auth()).set('Idempotency-Key', 'k').send({ ...validCreate, extra: 1 }),
      () => http().post('/v1/admin/entitlements/grants').set(auth()).set('Idempotency-Key', 'k')
        .send({ ...validCreate, kind: 'limits', plan: undefined, limits: { practice_sessions_per_day: 201 } }),
      () => http().post('/v1/admin/entitlements/grants/not-a-uuid/revoke').set(auth()).send({ reason: 'r' }),
      () => http().post(`/v1/admin/entitlements/grants/${grantId}/revoke`).set(auth()).send({}),
      () => http().patch(`/v1/admin/entitlements/grants/${grantId}`).set(auth()).send({ reason: 'no date' }),
      () => http().get('/v1/admin/entitlements/grants').set(auth()).query({ expiring_within_days: '0' }),
      () => http().get('/v1/admin/entitlements/grants').set(auth()).query({ active: 'yes' }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(create).not.toHaveBeenCalled(); expect(revoke).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });

  it('B5E40: a learner gets 403 forbidden on all four routes', async () => {
    role = null;
    for (const request of [
      () => http().post('/v1/admin/entitlements/grants').set(auth()).set('Idempotency-Key', 'k').send(validCreate),
      () => http().post(`/v1/admin/entitlements/grants/${grantId}/revoke`).set(auth()).send({ reason: 'r' }),
      () => http().patch(`/v1/admin/entitlements/grants/${grantId}`).set(auth()).send({ ends_at: '2027-01-31T00:00:00Z', reason: 'r' }),
      () => http().get('/v1/admin/entitlements/grants').set(auth()),
    ]) {
      const res = await request();
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    }
    expect(create).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });

  it('B5E37: POST is idempotent — marked @Idempotent and run through the real interceptor, which needs an Idempotency-Key', async () => {
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminGrantsController.prototype.create)).toBeDefined();
    passThrough.mockRestore();
    const res = await http().post('/v1/admin/entitlements/grants').set(auth()).send(validCreate);
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('listRoutes shows entitlements.grant on the four routes', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/entitlements/grants'))).toEqual([
      { method: 'GET', path: '/v1/admin/entitlements/grants', permissions: ['entitlements.grant'] },
      { method: 'POST', path: '/v1/admin/entitlements/grants', permissions: ['entitlements.grant'] },
      { method: 'PATCH', path: '/v1/admin/entitlements/grants/:id', permissions: ['entitlements.grant'] },
      { method: 'POST', path: '/v1/admin/entitlements/grants/:id/revoke', permissions: ['entitlements.grant'] },
    ]);
  });
});
