import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { SubscriptionCancelService } from './subscription-cancel.service.js';

describe('POST /v1/me/subscriptions/:id/cancel (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const post = (id: string, headers: Record<string, string> = {}) =>
    ctx.http().post(`/v1/me/subscriptions/${id}/cancel`).set({ Authorization: `Bearer ${token}`, ...headers });

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

  it('is one signed-in route, idempotent (an Idempotency-Key is required), and not behind the learner profile guard', async () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/me/subscriptions'));
    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual(['POST /v1/me/subscriptions/:id/cancel']);
    const service = vi.spyOn(ctx.app.get(SubscriptionCancelService), 'cancel').mockResolvedValue({ status: 'requested' });
    const noKey = await post(randomUUID());
    expect(noKey.status).toBe(400);
    expect(service).not.toHaveBeenCalled();
  });

  it('a malformed id (and no key) is 400 and without a token it is 401', async () => {
    expect((await post('not-a-uuid')).status).toBe(400);
    expect((await ctx.http().post(`/v1/me/subscriptions/${randomUUID()}/cancel`)).status).toBe(401);
  });
});
