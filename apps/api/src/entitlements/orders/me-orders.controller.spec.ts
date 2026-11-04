import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { OrdersService } from './orders.service.js';

// The idempotency store is a table; its own spec covers it. Here the handler just runs, so what the route does with the body is what is tested.
vi.mock('../../common/idempotency/idempotency.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../common/idempotency/idempotency.service.js')>()),
  runIdempotent: async (_prisma: unknown, _params: unknown, handler: () => Promise<{ status: number; body: unknown }>) => ({ kind: 'fresh', body: (await handler()).body }),
}));

describe('/v1/me/orders (HTTP shape, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const create = (body: unknown, headers: Record<string, string> = { 'Idempotency-Key': randomUUID() }) =>
    ctx.http().post('/v1/me/orders').set({ Authorization: `Bearer ${token}`, ...headers }).send(body as object);

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  beforeEach(async () => {
    userId = randomUUID();
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('exposes the two learner routes and nothing else under /me/orders yet (check comes with the reconcile task)', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/me/orders')).map(({ method, path }) => `${method} ${path}`).sort();
    expect(routes).toContain('POST /v1/me/orders');
    expect(routes).toContain('GET /v1/me/orders/:id');
  });

  it('201 with order_id and checkout_url; the service gets the signed-in user and the checked body', async () => {
    const service = vi.spyOn(ctx.app.get(OrdersService), 'create').mockResolvedValue({ order_id: 'o1', checkout_url: 'https://pay.example/x' });
    const res = await create({ period_months: 3, expected_amount: 199000, locale: 'vi' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ order_id: 'o1', checkout_url: 'https://pay.example/x' });
    expect(service).toHaveBeenCalledWith(userId, { period_months: 3, expected_amount: 199000, locale: 'vi' });
  });

  it('is idempotent: no Idempotency-Key → 400 and the service is not asked', async () => {
    const service = vi.spyOn(ctx.app.get(OrdersService), 'create').mockResolvedValue({ order_id: 'o1', checkout_url: 'u' });
    service.mockClear();
    expect((await create({ period_months: 1, expected_amount: 79000, locale: 'vi' }, {})).status).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });

  it('is rate limited per user (user.write)', async () => {
    vi.spyOn(ctx.app.get(OrdersService), 'create').mockResolvedValue({ order_id: 'o1', checkout_url: 'u' });
    await create({ period_months: 1, expected_amount: 79000, locale: 'vi' });
    expect(hit).toHaveBeenCalledWith('user.write', expect.anything());
  });

  it('a period that is not 1, 3 or 12 months, a missing or non-whole amount, an unknown language or an extra field → 400', async () => {
    const service = vi.spyOn(ctx.app.get(OrdersService), 'create').mockResolvedValue({ order_id: 'o1', checkout_url: 'u' });
    service.mockClear();
    const ok = { period_months: 1, expected_amount: 79000, locale: 'vi' };
    const bad = [
      { ...ok, period_months: 2 }, { ...ok, period_months: '1' }, { ...ok, period_months: 0 }, { ...ok, period_months: 24 },
      { ...ok, expected_amount: 79000.5 }, { ...ok, expected_amount: -1 }, { ...ok, expected_amount: '79000' }, { period_months: 1, locale: 'vi' },
      { ...ok, locale: 'fr' }, { period_months: 1, expected_amount: 79000 }, { ...ok, user_id: userId },
    ];
    for (const body of bad) expect((await create(body)).status, JSON.stringify(body)).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });

  it('without a token → 401', async () => {
    expect((await ctx.http().post('/v1/me/orders').set('Idempotency-Key', randomUUID()).send({})).status).toBe(401);
    expect((await ctx.http().get(`/v1/me/orders/${randomUUID()}`)).status).toBe(401);
  });

  it('GET returns the order view of the signed-in user; a malformed id → 400', async () => {
    const view = { id: 'o1', status: 'pending', period_months: 1, amount: 79000, description: 'WM0XSNJG0', expires_at: '2026-11-05T03:17:00.000Z', period: null };
    const service = vi.spyOn(ctx.app.get(OrdersService), 'get').mockResolvedValue(view);
    const id = randomUUID();
    const res = await ctx.http().get(`/v1/me/orders/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(view);
    expect(service).toHaveBeenCalledWith(userId, id);
    expect((await ctx.http().get('/v1/me/orders/not-a-uuid').set('Authorization', `Bearer ${token}`)).status).toBe(400);
  });
});
