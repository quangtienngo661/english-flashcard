import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { AiBatchesService } from '../batches/ai-batches.service.js';
import { AdminAiBatchesController } from './admin-ai-batches.controller.js';

const ID = '11111111-1111-4111-8111-111111111111';
describe('admin AI batches HTTP', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const batches = { list: vi.fn(), get: vi.fn() };
  const auth = () => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused', controllers: [AdminAiBatchesController],
      providers: [{ provide: AiBatchesService, useValue: batches }] });
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockResolvedValue({ userId: actorId, revokedAt: null, user: { get staffRole() { return role; } } });
    batches.list.mockReset().mockResolvedValue({ items: [], next_page_token: null });
    batches.get.mockReset().mockResolvedValue({ id: ID, kind: 'eval', source_id: randomUUID(), items: [] });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('registers read-only list/detail with settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/batches'));
    expect(new Set(routes.map(({ method, path }) => `${method} ${path}`))).toEqual(new Set([
      'GET /v1/admin/ai/batches', 'GET /v1/admin/ai/batches/:id',
    ]));
    for (const route of routes) expect(route.permissions).toEqual(['settings.manage']);
  });

  it('lists with a default page size and passes the approved filter set', async () => {
    expect((await ctx.http().get('/v1/admin/ai/batches').set(auth())).status).toBe(200);
    expect(batches.list).toHaveBeenLastCalledWith({ page_size: 20 });
    const res = await ctx.http().get('/v1/admin/ai/batches?from=2026-10-31&to=2026-11-01&operation=generate_cloze&kind=eval&status=failed&page_size=5&page_token=token').set(auth());
    expect(res.status).toBe(200);
    expect(batches.list).toHaveBeenLastCalledWith({ from: '2026-10-31', to: '2026-11-01', operation: 'generate_cloze', kind: 'eval', status: 'failed', page_size: 5, page_token: 'token' });
  });

  it('normalizes a detail UUID and returns the source link', async () => {
    const id = 'abcdefab-cdef-4abc-8abc-abcdefabcdef';
    const response = await ctx.http().get(`/v1/admin/ai/batches/${id.toUpperCase()}`).set(auth());
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ID);
    expect(batches.get).toHaveBeenCalledWith(id);
  });

  it('rejects invalid filters and hidden-content side-channel queries before the service', async () => {
    for (const query of ['kind=learner', 'status=done', 'operation=nope', 'page_size=0', 'page_size=101',
      'from=2026-02-30', 'to=20261301', 'level=B1', 'search=hidden', 'split=held_out']) {
      const response = await ctx.http().get(`/v1/admin/ai/batches?${query}`).set(auth());
      expect(response.status, query).toBe(400);
      expect(response.body.type).toContain('validation-failed');
    }
    expect((await ctx.http().get('/v1/admin/ai/batches/not-a-uuid').set(auth())).status).toBe(400);
    expect(batches.list).not.toHaveBeenCalled();
    expect(batches.get).not.toHaveBeenCalled();
  });

  it('requires authentication and refuses an editor on list and detail', async () => {
    for (const path of ['/v1/admin/ai/batches', `/v1/admin/ai/batches/${ID}`]) {
      expect((await ctx.http().get(path)).status).toBe(401);
      role = 'editor';
      expect((await ctx.http().get(path).set(auth())).status).toBe(403);
    }
    expect(batches.list).not.toHaveBeenCalled();
    expect(batches.get).not.toHaveBeenCalled();
  });
});
