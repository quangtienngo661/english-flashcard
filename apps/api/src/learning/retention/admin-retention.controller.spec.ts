import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { RetentionService, type RetentionView } from './retention.service.js';

const PROBLEM = 'https://api.example.com/problems/';
const VIEW: RetentionView = {
  from: '2026-10-26', to: '2026-11-03', window_days: 7, today: { date: '2026-12-15', active: 2, stopped: 1 },
  cohorts: [{ week_start: '2026-10-26', size: 1, d7: 1, d30: 0 }, { week_start: '2026-11-02', size: 0, d7: null, d30: null }],
};

describe('GET /v1/admin/learning/retention (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  let report: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    // Not mocked by default: a bad range makes the real service throw before it reads anything.
    report = vi.spyOn(ctx.app.get(RetentionService), 'report');
  });
  beforeEach(async () => {
    role = 'editor';
    const actorId = randomUUID();
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    report.mockClear();
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('the route needs ai.view and nothing else: the dashboard is readable by an editor (design §9 row P6)', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path === '/v1/admin/learning/retention');
    expect(routes.map(({ method, path, permissions }) => ({ method, path, permissions }))).toEqual([
      { method: 'GET', path: '/v1/admin/learning/retention', permissions: ['ai.view'] },
    ]);
  });

  it('an editor gets 200 and the view as the service returned it; the range is passed as sent, with the clock\'s now', async () => {
    report.mockResolvedValueOnce(VIEW);
    const res = await ctx.http().get('/v1/admin/learning/retention?from=2026-10-28&to=2026-11-03').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(VIEW);
    expect(report).toHaveBeenCalledExactlyOnceWith({ from: '2026-10-28', to: '2026-11-03' }, expect.any(Date));
  });

  it('an admin gets 200 too; no query means no range is passed', async () => {
    role = 'admin';
    report.mockResolvedValueOnce(VIEW);
    expect((await ctx.http().get('/v1/admin/learning/retention').set(auth())).status).toBe(200);
    expect(report).toHaveBeenCalledExactlyOnceWith({}, expect.any(Date));
  });

  it('a learner (no staff role) gets 403 and the service is not called', async () => {
    role = null;
    expect((await ctx.http().get('/v1/admin/learning/retention').set(auth())).status).toBe(403);
    expect(report).not.toHaveBeenCalled();
  });

  it('no token gets 401', async () => {
    expect((await ctx.http().get('/v1/admin/learning/retention')).status).toBe(401);
  });

  it('a reversed range is 400 validation-failed, and so is a range over 366 days', async () => {
    for (const query of ['from=2026-11-04&to=2026-11-03', 'from=2025-01-01&to=2026-11-03']) {
      const res = await ctx.http().get(`/v1/admin/learning/retention?${query}`).set(auth());
      expect(res.status, query).toBe(400);
      expect(res.body.type, query).toBe(`${PROBLEM}validation-failed`);
    }
  });

  it('a malformed date or an unknown parameter is 400 validation-failed before the service', async () => {
    for (const query of ['from=nope', 'to=2026-13-01', 'from=20261001', 'window=3']) {
      const res = await ctx.http().get(`/v1/admin/learning/retention?${query}`).set(auth());
      expect(res.status, query).toBe(400);
      expect(res.body.type, query).toBe(`${PROBLEM}validation-failed`);
    }
    expect(report).not.toHaveBeenCalled();
  });
});
