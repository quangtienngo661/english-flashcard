import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ReportsService } from './reports.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin reports HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  const passThrough = vi.spyOn(IdempotencyInterceptor.prototype, 'intercept');
  let get: ReturnType<typeof vi.spyOn>;
  let list: ReturnType<typeof vi.spyOn>; let resolve: ReturnType<typeof vi.spyOn>; let listRefunds: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const reportId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const reports = ctx.app.get(ReportsService);
    get = vi.spyOn(reports, 'get'); list = vi.spyOn(reports, 'list'); resolve = vi.spyOn(reports, 'resolve'); listRefunds = vi.spyOn(reports, 'listRefunds');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'editor';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    list.mockReset().mockResolvedValue({ items: [], next_page_token: null }); resolve.mockReset().mockResolvedValue({ id: reportId });
    get.mockReset().mockResolvedValue({ id: reportId });
    listRefunds.mockReset().mockResolvedValue({ items: [], next_page_token: null });
    hit.mockReset().mockResolvedValue(undefined);
    passThrough.mockReset().mockImplementation((_context, next) => next.handle());
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('refunds needs settings.manage; the reports list and resolve keep content.edit', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => /^\/v1\/admin\/practice\/(reports|refunds)/.test(path))).toEqual([
      { method: 'GET', path: '/v1/admin/practice/refunds', permissions: ['settings.manage'] },
      { method: 'GET', path: '/v1/admin/practice/reports', permissions: ['content.edit'] },
      { method: 'GET', path: '/v1/admin/practice/reports/:id', permissions: ['content.edit'] },
      { method: 'POST', path: '/v1/admin/practice/reports/:id/resolve', permissions: ['content.edit'] },
    ]);
  });

  it('an editor lists with reason and source, and confirms', async () => {
    expect((await http().get('/v1/admin/practice/reports').set(auth())
      .query({ status: 'confirmed', reason: 'ai_wrong_meaning', source: 'ai' })).status).toBe(200);
    expect(list).toHaveBeenCalledWith({ status: 'confirmed', reason: 'ai_wrong_meaning', source: 'ai', pageSize: 20, pageToken: undefined });
    const res = await http().post(`/v1/admin/practice/reports/${reportId}/resolve`).set(auth()).set('Idempotency-Key', 'k')
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledWith(actorId, reportId, 'confirmed');
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('an editor reads one report by id; a bad id → 400 before the service', async () => {
    expect((await http().get(`/v1/admin/practice/reports/${reportId}`).set(auth())).status).toBe(200);
    expect(get).toHaveBeenCalledWith(reportId);
    get.mockClear();
    expect((await http().get('/v1/admin/practice/reports/nope').set(auth())).status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('an editor gets 403 on refunds; an admin reads it with its filters', async () => {
    const res = await http().get('/v1/admin/practice/refunds').set(auth());
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    role = 'admin';
    const staff = randomUUID();
    expect((await http().get('/v1/admin/practice/refunds').set(auth())
      .query({ resolved_by: staff, from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00+07:00' })).status).toBe(200);
    expect(listRefunds).toHaveBeenCalledWith({
      resolvedBy: staff, from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-31T17:00:00Z'), pageSize: 20, pageToken: undefined,
    });
  });

  it('refunds passes resolved_by_email through; an over-long one → 400', async () => {
    role = 'admin';
    expect((await http().get('/v1/admin/practice/refunds').set(auth()).query({ resolved_by_email: 'Staff@Example.com' })).status).toBe(200);
    expect(listRefunds).toHaveBeenCalledWith(expect.objectContaining({ resolvedByEmail: 'Staff@Example.com' }));
    listRefunds.mockClear();
    expect((await http().get('/v1/admin/practice/refunds').set(auth()).query({ resolved_by_email: 'a'.repeat(321) })).status).toBe(400);
    expect(listRefunds).not.toHaveBeenCalled();
  });

  it('bad statuses and filters → 400 validation-failed before the service', async () => {
    role = 'admin';
    for (const request of [
      () => http().post(`/v1/admin/practice/reports/${reportId}/resolve`).set(auth()).set('Idempotency-Key', 'k').send({ status: 'open' }),
      () => http().get('/v1/admin/practice/reports').set(auth()).query({ source: 'own_sentence' }),
      () => http().get('/v1/admin/practice/refunds').set(auth()).query({ from: 'yesterday' }),
      () => http().get('/v1/admin/practice/refunds').set(auth()).query({ resolved_by: 'someone' }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(resolve).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(listRefunds).not.toHaveBeenCalled();
  });
});
