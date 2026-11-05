import { randomUUID } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin orders HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let service: Record<'list' | 'get' | 'confirmPayment' | 'cancel' | 'resolve' | 'revokePeriod', ReturnType<typeof vi.spyOn>>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const orderId = randomUUID();
  const periodId = randomUUID();
  const view = { id: orderId };
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const real = ctx.app.get(AdminOrdersService);
    service = {
      list: vi.spyOn(real, 'list'), get: vi.spyOn(real, 'get'), confirmPayment: vi.spyOn(real, 'confirmPayment'), cancel: vi.spyOn(real, 'cancel'),
      resolve: vi.spyOn(real, 'resolve'), revokePeriod: vi.spyOn(real, 'revokePeriod'),
    };
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    for (const spy of Object.values(service)) spy.mockReset().mockResolvedValue(view as never);
    service.list.mockResolvedValue({ items: [view], next_page_token: null } as never);
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('lists exactly the six staff routes', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/orders') || path.startsWith('/v1/admin/prepaid-periods'))
      .map(({ method, path }) => `${method} ${path}`).sort();
    expect(routes).toEqual([
      'GET /v1/admin/orders', 'GET /v1/admin/orders/:id', 'POST /v1/admin/orders/:id/cancel', 'POST /v1/admin/orders/:id/confirm-payment',
      'POST /v1/admin/orders/:id/resolve', 'POST /v1/admin/prepaid-periods/:id/revoke',
    ]);
  });

  it('valid requests bind their schemas and pass the signed-in admin; the four writes are limited per user', async () => {
    expect((await http().get('/v1/admin/orders').set(auth()).query({ status: 'needs_review', needs_attention: 'true', q: 'wm0x', page_size: '5' })).status).toBe(200);
    expect(service.list).toHaveBeenCalledWith({ status: 'needs_review', needs_attention: true, q: 'wm0x', page_size: 5 });
    expect((await http().get(`/v1/admin/orders/${orderId}`).set(auth())).status).toBe(200);
    expect(service.get).toHaveBeenCalledWith(orderId);
    const body = { reference: ' FT2611-BANK ', amount: 199000, reason: ' saw it ' };
    expect((await http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k1').send(body)).status).toBe(200);
    expect(service.confirmPayment).toHaveBeenCalledWith(actorId, orderId, { reference: 'FT2611-BANK', amount: 199000, reason: 'saw it' });
    expect((await http().post(`/v1/admin/orders/${orderId}/cancel`).set(auth())).status).toBe(200);
    expect(service.cancel).toHaveBeenCalledWith(actorId, orderId);
    expect((await http().post(`/v1/admin/orders/${orderId}/resolve`).set(auth()).send({ note: ' refunded ' })).status).toBe(200);
    expect(service.resolve).toHaveBeenCalledWith(actorId, orderId, 'refunded');
    expect((await http().post(`/v1/admin/prepaid-periods/${periodId}/revoke`).set(auth()).set('Idempotency-Key', 'k2').send({ reason: 'wrong learner' })).status).toBe(200);
    expect(service.revokePeriod).toHaveBeenCalledWith(actorId, periodId, 'wrong learner');
    expect(hit).toHaveBeenCalledTimes(4);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('confirm and revoke are idempotent routes; cancel and resolve are repeatable by their own state', () => {
    const reflector = new Reflector();
    const meta = (name: keyof AdminOrdersController) => reflector.get(IDEMPOTENT_KEY, AdminOrdersController.prototype[name]);
    expect(meta('confirm')).toBeDefined();
    expect(meta('revoke')).toBeDefined();
    expect(meta('cancel')).toBeUndefined();
    expect(meta('resolve')).toBeUndefined();
  });

  it('bad bodies, params and queries → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().get(`/v1/admin/orders/not-a-uuid`).set(auth()),
      () => http().get('/v1/admin/orders').set(auth()).query({ status: 'weird' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ needs_attention: 'yes' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ page_size: '0' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ page_size: '101' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ from: '2026-12-01T00:00:00Z', to: '2026-11-01T00:00:00Z' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ from: 'yesterday' }),
      () => http().get('/v1/admin/orders').set(auth()).query({ unknown: '1' }),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: 'r', amount: 0, reason: 'x' }),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: 'r', amount: 79000.5, reason: 'x' }),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: '', amount: 79000, reason: 'x' }),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: 'r', amount: 79000 }),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: 'r', amount: 79000, reason: 'x', extra: 1 }),
      () => http().post(`/v1/admin/orders/${orderId}/resolve`).set(auth()).send({}),
      () => http().post(`/v1/admin/orders/${orderId}/resolve`).set(auth()).send({ note: 'x'.repeat(301) }),
      () => http().post(`/v1/admin/prepaid-periods/${periodId}/revoke`).set(auth()).set('Idempotency-Key', 'k').send({}),
      () => http().post(`/v1/admin/prepaid-periods/not-a-uuid/revoke`).set(auth()).set('Idempotency-Key', 'k').send({ reason: 'r' }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    for (const spy of Object.values(service)) expect(spy).not.toHaveBeenCalled();
  });

  it('an editor and a learner get 403 forbidden on every route (money is admin only); no token → 401', async () => {
    const requests = [
      () => http().get('/v1/admin/orders').set(auth()),
      () => http().get(`/v1/admin/orders/${orderId}`).set(auth()),
      () => http().post(`/v1/admin/orders/${orderId}/confirm-payment`).set(auth()).set('Idempotency-Key', 'k').send({ reference: 'r', amount: 79000, reason: 'x' }),
      () => http().post(`/v1/admin/orders/${orderId}/cancel`).set(auth()),
      () => http().post(`/v1/admin/orders/${orderId}/resolve`).set(auth()).send({ note: 'n' }),
      () => http().post(`/v1/admin/prepaid-periods/${periodId}/revoke`).set(auth()).set('Idempotency-Key', 'k').send({ reason: 'r' }),
    ];
    for (const who of ['editor', null] as const) {
      role = who;
      for (const request of requests) {
        const res = await request();
        expect(res.status, String(who)).toBe(403);
        expect(res.body.type).toBe(`${PROBLEM}forbidden`);
      }
    }
    for (const spy of Object.values(service)) expect(spy).not.toHaveBeenCalled();
    expect((await http().get('/v1/admin/orders')).status).toBe(401);
  });
});
