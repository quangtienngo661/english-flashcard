import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ReportsService } from '../reports/reports.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai reports HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const peekSpy = vi.spyOn(RateLimiter.prototype, 'peek');
  let status: ReturnType<typeof vi.spyOn>; let costs: ReturnType<typeof vi.spyOn>; let calls: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const reports = ctx.app.get(ReportsService);
    status = vi.spyOn(reports, 'status'); costs = vi.spyOn(reports, 'costs'); calls = vi.spyOn(reports, 'calls');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    status.mockReset().mockResolvedValue({ operations: [] });
    costs.mockReset().mockResolvedValue({ items: [], total: {} });
    calls.mockReset().mockResolvedValue({ items: [] });
    hit.mockReset().mockResolvedValue(undefined);
    peekSpy.mockReset().mockResolvedValue({ limit: 20, used: 23, resetsAt: new Date('2026-10-07T13:00:00.000Z') });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => ['/v1/admin/ai/status', '/v1/admin/ai/costs', '/v1/admin/ai/calls', '/v1/admin/ai/test-quota'].includes(path));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'GET /v1/admin/ai/calls', 'GET /v1/admin/ai/costs', 'GET /v1/admin/ai/status', 'GET /v1/admin/ai/test-quota',
    ]);
    for (const route of routes) expect(route.permissions).toEqual(['settings.manage']);
  });

  it('GET test-quota reads the caller quota without counting; remaining never goes below 0', async () => {
    const res = await http().get('/v1/admin/ai/test-quota').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ limit: 20, remaining: 0, resets_at: '2026-10-07T13:00:00.000Z' });
    expect(peekSpy).toHaveBeenCalledWith('ai.test', actorId);
    expect(hit).not.toHaveBeenCalled();
  });

  it('GET test-quota answers 403 for an editor', async () => {
    role = 'editor';
    expect((await http().get('/v1/admin/ai/test-quota').set(auth())).status).toBe(403);
    expect(peekSpy).not.toHaveBeenCalled();
  });

  it('GET status passes now; no rate rule', async () => {
    expect((await http().get('/v1/admin/ai/status').set(auth())).status).toBe(200);
    expect(status).toHaveBeenCalledWith(expect.any(Date));
    expect(hit).not.toHaveBeenCalled();
  });

  it('GET costs defaults group_by to day and passes the dates', async () => {
    await http().get('/v1/admin/ai/costs').set(auth());
    expect(costs).toHaveBeenLastCalledWith({ group_by: 'day' }, expect.any(Date));
    await http().get('/v1/admin/ai/costs?from=2026-10-01&to=2026-10-20&group_by=model').set(auth());
    expect(costs).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-20', group_by: 'model' }, expect.any(Date));
  });

  it('GET calls passes the operation id', async () => {
    await http().get('/v1/admin/ai/calls?operation_id=q1%232').set(auth());
    expect(calls).toHaveBeenCalledWith('q1#2', expect.any(Date));
  });

  it('bad queries → 400 validation-failed before the service', async () => {
    for (const path of [
      '/v1/admin/ai/costs?group_by=week', '/v1/admin/ai/costs?from=2026-13-01', '/v1/admin/ai/costs?from=20261001',
      '/v1/admin/ai/calls', `/v1/admin/ai/calls?operation_id=${'x'.repeat(201)}`, '/v1/admin/ai/status?x=1',
    ]) {
      const res = await http().get(path).set(auth());
      expect(res.status, path).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(costs).not.toHaveBeenCalled();
    expect(calls).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    expect((await http().get('/v1/admin/ai/status').set(auth())).status).toBe(403);
    expect(status).not.toHaveBeenCalled();
  });
});
