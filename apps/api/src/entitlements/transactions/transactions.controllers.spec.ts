import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { TransactionsService } from './transactions.service.js';

const PROBLEM = 'https://api.example.com/problems/';
const PAGE = { items: [], next_page_token: null };

describe('transaction read APIs (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let userId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  let forLearner: ReturnType<typeof vi.spyOn>; let forAdmin: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const service = ctx.app.get(TransactionsService);
    forLearner = vi.spyOn(service, 'forLearner'); forAdmin = vi.spyOn(service, 'forAdmin');
  });
  beforeEach(async () => {
    userId = randomUUID(); role = null;
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({
      userId, revokedAt: null, user: { staffRole: role, nativeLanguage: null },
    }));
    forLearner.mockReset().mockResolvedValue(PAGE); forAdmin.mockReset().mockResolvedValue(PAGE);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('GI8: /v1/me/transactions lists the signed-in learner\'s rows; page_size defaults to 20 and stops at 100', async () => {
    const res = await http().get('/v1/me/transactions').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PAGE);
    expect(forLearner).toHaveBeenLastCalledWith(userId, { page_size: 20 });
    await http().get('/v1/me/transactions').set(auth()).query({ page_size: '5', page_token: 'abc' });
    expect(forLearner).toHaveBeenLastCalledWith(userId, { page_size: 5, page_token: 'abc' });
    const bad = await http().get('/v1/me/transactions').set(auth()).query({ page_size: '101' });
    expect(bad.status).toBe(400);
    expect(bad.body.type).toBe(`${PROBLEM}validation-failed`);
    expect((await http().get('/v1/me/transactions')).status).toBe(401);
  });

  it('GI9: an editor and a learner get 403 on /v1/admin/transactions; an admin gets the filtered list', async () => {
    role = 'editor';
    const denied = await http().get('/v1/admin/transactions').set(auth());
    expect(denied.status).toBe(403);
    expect(denied.body.type).toBe(`${PROBLEM}forbidden`);
    role = null;
    expect((await http().get('/v1/admin/transactions').set(auth())).status).toBe(403);
    expect(forAdmin).not.toHaveBeenCalled();
    role = 'admin';
    const res = await http().get('/v1/admin/transactions').set(auth())
      .query({ email: 'lan@example.com', kind: 'grant', from: '2026-10-01T00:00:00+07:00', to: '2026-10-24T00:00:00+07:00' });
    expect(res.status).toBe(200);
    expect(forAdmin).toHaveBeenLastCalledWith({ email: 'lan@example.com', kind: 'grant', from: '2026-10-01T00:00:00+07:00',
      to: '2026-10-24T00:00:00+07:00', page_size: 20 });
  });

  it('admin filters are validated: an unknown kind, a date without offset or from after to are 400', async () => {
    role = 'admin';
    for (const query of [{ kind: 'gift' }, { from: '2026-10-01' }, { from: '2026-10-02T00:00:00Z', to: '2026-10-01T00:00:00Z' }, { other: 'x' }]) {
      const res = await http().get('/v1/admin/transactions').set(auth()).query(query);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(forAdmin).not.toHaveBeenCalled();
  });

  it('listRoutes: the admin list needs settings.manage, the learner list no staff permission', () => {
    const routes = listRoutes(ctx.app);
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/admin/transactions', permissions: ['settings.manage'] });
    expect(routes).toContainEqual({ method: 'GET', path: '/v1/me/transactions', permissions: null });
  });
});
