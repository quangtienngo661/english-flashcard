import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ModelsService } from '../models/models.service.js';
import { AdminAiModelsController } from './admin-ai-models.controller.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai models HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let list: ReturnType<typeof vi.spyOn>; let add: ReturnType<typeof vi.spyOn>; let update: ReturnType<typeof vi.spyOn>;
  let refresh: ReturnType<typeof vi.spyOn>; let remove: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const modelId = randomUUID();
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const models = ctx.app.get(ModelsService);
    list = vi.spyOn(models, 'list'); add = vi.spyOn(models, 'add'); update = vi.spyOn(models, 'update');
    refresh = vi.spyOn(models, 'refresh'); remove = vi.spyOn(models, 'remove');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    const view = { id: modelId };
    list.mockReset().mockResolvedValue({ items: [view] }); add.mockReset().mockResolvedValue(view);
    update.mockReset().mockResolvedValue(view); refresh.mockReset().mockResolvedValue(view); remove.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/models'));
    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /v1/admin/ai/models', 'POST /v1/admin/ai/models', 'DELETE /v1/admin/ai/models/:id', 'PATCH /v1/admin/ai/models/:id',
      'POST /v1/admin/ai/models/:id/refresh',
    ]);
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['settings.manage']);
  });

  it('writes carry user.write; reads do not; no route is @Idempotent', async () => {
    expect((await http().get('/v1/admin/ai/models').set(auth()).query({ provider: 'openai' })).status).toBe(200);
    expect(list).toHaveBeenCalledWith('openai');
    expect(hit).not.toHaveBeenCalled();
    const body = { provider: 'fake', model_id: 'fake:ok' };
    expect((await http().post('/v1/admin/ai/models').set(auth()).send(body)).status).toBe(201);
    expect(add).toHaveBeenCalledWith(actorId, body);
    expect((await http().patch(`/v1/admin/ai/models/${modelId.toUpperCase()}`).set(auth()).send({ note: 'x' })).status).toBe(200);
    expect(update).toHaveBeenCalledWith(modelId, { note: 'x' });
    expect((await http().post(`/v1/admin/ai/models/${modelId}/refresh`).set(auth())).status).toBe(200);
    expect(refresh).toHaveBeenCalledWith(modelId);
    expect((await http().delete(`/v1/admin/ai/models/${modelId}`).set(auth())).status).toBe(204);
    expect(remove).toHaveBeenCalledWith(modelId);
    expect(hit).toHaveBeenCalledTimes(4);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    for (const name of ['list', 'add', 'update', 'refresh', 'remove'] as const) {
      expect(new Reflector().get(IDEMPOTENT_KEY, AdminAiModelsController.prototype[name]), name).toBeUndefined();
    }
  });

  it('B6E96 and bad bodies, params, queries → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().post('/v1/admin/ai/models').set(auth()).send({ provider: 'openai', model_id: 'gpt-6-luna/../x' }),
      () => http().post('/v1/admin/ai/models').set(auth()).send({ provider: 'mistral', model_id: 'm' }),
      () => http().post('/v1/admin/ai/models').set(auth()).send({ provider: 'openai', model_id: 'm', extra: 1 }),
      () => http().patch('/v1/admin/ai/models/not-a-uuid').set(auth()).send({ note: 'x' }),
      () => http().patch(`/v1/admin/ai/models/${modelId}`).set(auth()).send({ price_input: 0.12345 }),
      () => http().get('/v1/admin/ai/models').set(auth()).query({ provider: 'x' }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(add).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/ai/models').set(auth());
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    expect(list).not.toHaveBeenCalled();
  });
});
