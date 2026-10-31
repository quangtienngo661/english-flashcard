import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { OperationSettingsService } from '../models/operation-settings.service.js';

describe('admin ai operations HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let list: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    list = vi.spyOn(ctx.app.get(OperationSettingsService), 'list');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    list.mockReset().mockResolvedValue({ items: [] });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('the only route left is the read, and it requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/operations'));
    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual(['GET /v1/admin/ai/operations']);
    for (const route of routes) expect(route.permissions).toEqual(['settings.manage']);
  });

  it('GET reads without a rate rule', async () => {
    expect((await http().get('/v1/admin/ai/operations').set(auth())).status).toBe(200);
    expect(list).toHaveBeenCalledTimes(1);
    expect(hit).not.toHaveBeenCalled();
  });

  it('design §6.6: PUT of an operation is gone → 404 (a model is chosen by publishing a config)', async () => {
    const body = { expected_version: 0, model_ref: randomUUID(), effort: null, thinking: null, max_output_tokens: 1200 };
    expect((await http().put('/v1/admin/ai/operations/generate_cloze').set(auth()).send(body)).status).toBe(404);
  });

  it('an editor gets 403 forbidden on the read', async () => {
    role = 'editor';
    expect((await http().get('/v1/admin/ai/operations').set(auth())).status).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });
});
