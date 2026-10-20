import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { OperationSettingsService } from '../models/operation-settings.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai operations HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let list: ReturnType<typeof vi.spyOn>; let put: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const modelId = randomUUID();
  const valid = { expected_version: 0, model_ref: modelId.toUpperCase(), effort: null, thinking: null, max_output_tokens: 1200 };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const operations = ctx.app.get(OperationSettingsService);
    list = vi.spyOn(operations, 'list'); put = vi.spyOn(operations, 'put');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    list.mockReset().mockResolvedValue({ items: [] }); put.mockReset().mockResolvedValue({ operation: 'generate_cloze', version: 1 });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/operations'));
    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual(['GET /v1/admin/ai/operations', 'PUT /v1/admin/ai/operations/:op']);
    for (const route of routes) expect(route.permissions).toEqual(['settings.manage']);
  });

  it('PUT carries user.write and passes the actor, the operation and the lower-cased model id; GET does not', async () => {
    expect((await http().get('/v1/admin/ai/operations').set(auth())).status).toBe(200);
    expect(hit).not.toHaveBeenCalled();
    const res = await http().put('/v1/admin/ai/operations/generate_cloze').set(auth()).send(valid);
    expect(res.status).toBe(200);
    expect(put).toHaveBeenCalledWith(actorId, 'generate_cloze', { ...valid, model_ref: modelId });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('an unknown operation or a bad body → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().put('/v1/admin/ai/operations/summarize').set(auth()).send(valid),
      () => http().put('/v1/admin/ai/operations/generate_cloze').set(auth()).send({ ...valid, expected_version: undefined }),
      () => http().put('/v1/admin/ai/operations/generate_cloze').set(auth()).send({ ...valid, thinking: 'on' }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(put).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    expect((await http().put('/v1/admin/ai/operations/generate_cloze').set(auth()).send(valid)).status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });
});
