import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { EvalExamplesService } from '../eval/eval-examples.service.js';
import { EvalRunsService } from '../eval/eval-runs.service.js';
import { AdminAiEvalController } from './admin-ai-eval.controller.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai eval HTTP (unit, mocked services)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let examples: Record<'list' | 'create' | 'update' | 'remove', ReturnType<typeof vi.spyOn>>;
  let runs: Record<'list' | 'get', ReturnType<typeof vi.spyOn>>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const id = randomUUID();
  const http = () => ctx.http();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const ex = ctx.app.get(EvalExamplesService);
    const rs = ctx.app.get(EvalRunsService);
    examples = {
      list: vi.spyOn(ex, 'list'), create: vi.spyOn(ex, 'create'), update: vi.spyOn(ex, 'update'), remove: vi.spyOn(ex, 'remove'),
    };
    runs = { list: vi.spyOn(rs, 'list'), get: vi.spyOn(rs, 'get') };
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    examples.list.mockReset().mockResolvedValue({ items: [] }); examples.create.mockReset().mockResolvedValue({ id });
    examples.update.mockReset().mockResolvedValue({ id }); examples.remove.mockReset().mockResolvedValue(undefined);
    runs.list.mockReset().mockResolvedValue({ items: [], next_page_token: null }); runs.get.mockReset().mockResolvedValue({ id });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/eval'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'DELETE /v1/admin/ai/eval/examples/:id', 'GET /v1/admin/ai/eval/examples', 'GET /v1/admin/ai/eval/runs',
      'GET /v1/admin/ai/eval/runs/:id', 'PATCH /v1/admin/ai/eval/examples/:id', 'POST /v1/admin/ai/eval/examples',
      'POST /v1/admin/ai/eval/runs',
    ]);
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['settings.manage']);
  });

  it('B6E74: POST /runs carries the idempotent metadata, the interceptor and the ai.test rate rule', () => {
    const handler = AdminAiEvalController.prototype.createRun;
    const reflector = new Reflector();
    expect(reflector.get(IDEMPOTENT_KEY, handler)).toBeDefined();
    expect(reflector.get(INTERCEPTORS_METADATA, handler)).toContain(IdempotencyInterceptor);
    expect(reflector.get(RATE_LIMIT_KEY, handler)).toEqual(['ai.test']);
  });

  it('example routes call the service; writes carry user.write; reads do not', async () => {
    expect((await http().get('/v1/admin/ai/eval/examples').set(auth()).query({ operation: 'lookup_word' })).status).toBe(200);
    expect(examples.list).toHaveBeenCalledWith('lookup_word');
    expect(hit).not.toHaveBeenCalled();
    const body = { operation: 'translate_sentence', input: { sentence: 'Hi.' }, note: 'short' };
    expect((await http().post('/v1/admin/ai/eval/examples').set(auth()).send(body)).status).toBe(201);
    expect(examples.create).toHaveBeenCalledWith(actorId, body);
    expect((await http().patch(`/v1/admin/ai/eval/examples/${id.toUpperCase()}`).set(auth()).send({ note: 'x' })).status).toBe(200);
    expect(examples.update).toHaveBeenCalledWith(id, { note: 'x' });
    expect((await http().delete(`/v1/admin/ai/eval/examples/${id}`).set(auth())).status).toBe(204);
    expect(examples.remove).toHaveBeenCalledWith(id);
    expect(hit).toHaveBeenCalledTimes(3);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('run reads: list with paging, get by id', async () => {
    const list = await http().get('/v1/admin/ai/eval/runs').set(auth()).query({ operation: 'generate_cloze', page_size: '5' });
    expect(list.status).toBe(200);
    expect(runs.list).toHaveBeenCalledWith('generate_cloze', 5, undefined);
    expect((await http().get(`/v1/admin/ai/eval/runs/${id}`).set(auth())).status).toBe(200);
    expect(runs.get).toHaveBeenCalledWith(id);
  });

  it('bad queries, params and bodies → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().get('/v1/admin/ai/eval/examples').set(auth()),
      () => http().get('/v1/admin/ai/eval/examples').set(auth()).query({ operation: 'x' }),
      () => http().post('/v1/admin/ai/eval/examples').set(auth()).send({ operation: 'lookup_word', input: {}, extra: 1 }),
      () => http().patch('/v1/admin/ai/eval/examples/not-a-uuid').set(auth()).send({ note: 'x' }),
      () => http().get('/v1/admin/ai/eval/runs').set(auth()).query({ operation: 'generate_cloze', page_size: '101' }),
      () => http().get('/v1/admin/ai/eval/runs/not-a-uuid').set(auth()),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(examples.list).not.toHaveBeenCalled(); expect(examples.create).not.toHaveBeenCalled();
    expect(examples.update).not.toHaveBeenCalled(); expect(runs.list).not.toHaveBeenCalled(); expect(runs.get).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/ai/eval/examples').set(auth()).query({ operation: 'lookup_word' });
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
  });
});
