import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { IDEMPOTENT_KEY } from '../../common/idempotency/idempotent.decorator.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RATE_LIMIT_KEY } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { EvalExamplesService } from '../eval/eval-examples.service.js';
import { EvalRunsService } from '../eval/eval-runs.service.js';
import { EvalSetsService } from '../eval/eval-sets.service.js';
import { AdminAiEvalController } from './admin-ai-eval.controller.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai eval HTTP (unit, mocked services)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let examples: Record<'list' | 'create' | 'createMany' | 'update' | 'remove' | 'forms' | 'reveal', ReturnType<typeof vi.spyOn>>;
  let sets: Record<'freeze' | 'list' | 'get', ReturnType<typeof vi.spyOn>>;
  let runs: Record<'list' | 'get' | 'cancel' | 'remove' | 'items' | 'compare', ReturnType<typeof vi.spyOn>>;
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
      list: vi.spyOn(ex, 'list'), create: vi.spyOn(ex, 'create'), createMany: vi.spyOn(ex, 'createMany'), update: vi.spyOn(ex, 'update'), remove: vi.spyOn(ex, 'remove'),
      forms: vi.spyOn(ex, 'forms'), reveal: vi.spyOn(ex, 'reveal'),
    };
    const ss = ctx.app.get(EvalSetsService);
    sets = { freeze: vi.spyOn(ss, 'freeze'), list: vi.spyOn(ss, 'list'), get: vi.spyOn(ss, 'get') };
    runs = { list: vi.spyOn(rs, 'list'), get: vi.spyOn(rs, 'get'), cancel: vi.spyOn(rs, 'cancel'), remove: vi.spyOn(rs, 'remove'),
      items: vi.spyOn(rs, 'items'), compare: vi.spyOn(rs, 'compare') };
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    examples.list.mockReset().mockResolvedValue({ items: [] }); examples.create.mockReset().mockResolvedValue({ id });
    examples.createMany.mockReset().mockResolvedValue({ total: 1, valid: 1, created: 1, invalid: [] });
    examples.update.mockReset().mockResolvedValue({ id }); examples.remove.mockReset().mockResolvedValue(undefined);
    examples.forms.mockReset().mockResolvedValue({ forms: ['deploy', 'deployed'] });
    examples.reveal.mockReset().mockResolvedValue({ id });
    sets.freeze.mockReset().mockResolvedValue({ id }); sets.list.mockReset().mockResolvedValue({ items: [] }); sets.get.mockReset().mockResolvedValue({ id, items: [] });
    runs.list.mockReset().mockResolvedValue({ items: [], next_page_token: null }); runs.get.mockReset().mockResolvedValue({ id });
    runs.cancel.mockReset().mockResolvedValue({ id, status: 'failed', error: 'cancelled' }); runs.remove.mockReset().mockResolvedValue(undefined);
    runs.items.mockReset().mockResolvedValue({ items: [], stats: {} }); runs.compare.mockReset().mockResolvedValue({ regressions: {} });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/eval'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'DELETE /v1/admin/ai/eval/examples/:id', 'DELETE /v1/admin/ai/eval/runs/:id', 'GET /v1/admin/ai/eval/examples',
      'GET /v1/admin/ai/eval/examples/forms', 'GET /v1/admin/ai/eval/sets', 'GET /v1/admin/ai/eval/sets/:id', 'POST /v1/admin/ai/eval/sets',
      'POST /v1/admin/ai/eval/examples/:id/reveal',
      'GET /v1/admin/ai/eval/runs', 'GET /v1/admin/ai/eval/runs/:id', 'GET /v1/admin/ai/eval/runs/:id/items', 'GET /v1/admin/ai/eval/runs/compare', 'PATCH /v1/admin/ai/eval/examples/:id',
      'POST /v1/admin/ai/eval/examples', 'POST /v1/admin/ai/eval/examples/bulk', 'POST /v1/admin/ai/eval/runs',
      'POST /v1/admin/ai/eval/runs/:id/cancel',
    ].sort());
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['settings.manage']);
  });

  it('B6E74: POST /runs carries the idempotent metadata and the interceptor; ai.test is counted by the service, not the guard', () => {
    const handler = AdminAiEvalController.prototype.createRun;
    const reflector = new Reflector();
    expect(reflector.get(IDEMPOTENT_KEY, handler)).toBeDefined();
    expect(reflector.get(INTERCEPTORS_METADATA, handler)).toContain(IdempotencyInterceptor);
    expect(reflector.get(RATE_LIMIT_KEY, handler)).toBeUndefined();
  });

  it('POST /examples/bulk: 200, user.write, the service gets the rows; a body far over 100 kB (1000 rows) is read', async () => {
    const row = { input: { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'x'.repeat(400), context_label: null }, note: 'n' };
    const body = { operation: 'generate_cloze', rows: Array.from({ length: 1000 }, () => row) };
    expect(JSON.stringify(body).length).toBeGreaterThan(400_000);
    const res = await http().post('/v1/admin/ai/eval/examples/bulk').set(auth()).send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 1, valid: 1, created: 1, invalid: [] });
    expect(examples.createMany).toHaveBeenCalledWith(actorId, body);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('a body over 100 kB is still refused on another route (only the bulk route has the larger limit)', async () => {
    const big = { operation: 'translate_sentence', input: { sentence: 'x'.repeat(150_000) } };
    expect((await http().post('/v1/admin/ai/eval/examples').set(auth()).send(big)).status).toBe(413);
    expect(examples.create).not.toHaveBeenCalled();
  });

  it('B2: GET /examples/forms passes the word and the part of speech; a part of speech outside the list → 400; no write limit', async () => {
    const res = await http().get('/v1/admin/ai/eval/examples/forms').set(auth()).query({ word: 'deploy', part_of_speech: 'verb' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ forms: ['deploy', 'deployed'] });
    expect(examples.forms).toHaveBeenCalledWith('deploy', 'verb');
    expect((await http().get('/v1/admin/ai/eval/examples/forms').set(auth()).query({ word: 'deploy', part_of_speech: 'unspecified' })).status).toBe(200);
    expect((await http().get('/v1/admin/ai/eval/examples/forms').set(auth()).query({ word: 'deploy', part_of_speech: 'gerund' })).status).toBe(400);
    expect((await http().get('/v1/admin/ai/eval/examples/forms').set(auth()).query({ word: '', part_of_speech: 'verb' })).status).toBe(400);
    expect((await http().get('/v1/admin/ai/eval/examples/forms').set(auth()).query({ word: 'x'.repeat(101), part_of_speech: 'verb' })).status).toBe(400);
    expect(examples.forms).toHaveBeenCalledTimes(2);
    expect(hit).not.toHaveBeenCalled();
  });

  it('D10: POST /examples/:id/reveal is a 200 write that reaches the service with the lower-cased id', async () => {
    const res = await http().post(`/v1/admin/ai/eval/examples/${id.toUpperCase()}/reveal`).set(auth());
    expect(res.status).toBe(200);
    expect(examples.reveal).toHaveBeenCalledWith(id);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('D9: POST /sets freezes the operation (201, a write); GET /sets and GET /sets/:id are reads', async () => {
    const created = await http().post('/v1/admin/ai/eval/sets').set(auth()).send({ operation: 'generate_cloze' });
    expect(created.status).toBe(201);
    expect(sets.freeze).toHaveBeenCalledWith(actorId, 'generate_cloze');
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    hit.mockClear();
    expect((await http().get('/v1/admin/ai/eval/sets').set(auth()).query({ operation: 'lookup_word' })).status).toBe(200);
    expect(sets.list).toHaveBeenCalledWith('lookup_word');
    expect((await http().get(`/v1/admin/ai/eval/sets/${id}`).set(auth())).status).toBe(200);
    expect(sets.get).toHaveBeenCalledWith(id);
    expect(hit).not.toHaveBeenCalled();
    expect((await http().post('/v1/admin/ai/eval/sets').set(auth()).send({ operation: 'nope' })).status).toBe(400);
  });

  it('B3: GET /runs/:id/items reaches items with the lower-cased id; set_id narrows the list of runs', async () => {
    expect((await http().get(`/v1/admin/ai/eval/runs/${id.toUpperCase()}/items`).set(auth())).status).toBe(200);
    expect(runs.items).toHaveBeenCalledWith(id);
    const set = randomUUID();
    expect((await http().get('/v1/admin/ai/eval/runs').set(auth()).query({ operation: 'generate_cloze', set_id: set })).status).toBe(200);
    expect(runs.list).toHaveBeenCalledWith('generate_cloze', 20, undefined, set);
    expect((await http().get('/v1/admin/ai/eval/runs').set(auth()).query({ operation: 'generate_cloze', set_id: 'nope' })).status).toBe(400);
  });

  it('B10: GET /runs/compare is not read as a run id; it needs two uuids', async () => {
    const [a, b] = [randomUUID(), randomUUID()];
    expect((await http().get('/v1/admin/ai/eval/runs/compare').set(auth()).query({ a, b })).status).toBe(200);
    expect(runs.compare).toHaveBeenCalledWith(a, b);
    expect(runs.get).not.toHaveBeenCalled();
    expect((await http().get('/v1/admin/ai/eval/runs/compare').set(auth()).query({ a })).status).toBe(400);
    expect((await http().get('/v1/admin/ai/eval/runs/compare').set(auth()).query({ a, b: 'x' })).status).toBe(400);
  });

  it('an editor gets 403 on the bulk route', async () => {
    role = 'editor';
    const res = await http().post('/v1/admin/ai/eval/examples/bulk').set(auth()).send({ operation: 'generate_cloze', rows: [{ input: {} }] });
    expect(res.status).toBe(403);
    expect(examples.createMany).not.toHaveBeenCalled();
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
    expect(runs.list).toHaveBeenCalledWith('generate_cloze', 5, undefined, undefined);
    expect((await http().get(`/v1/admin/ai/eval/runs/${id}`).set(auth())).status).toBe(200);
    expect(runs.get).toHaveBeenCalledWith(id);
  });

  it('POST /runs/:id/cancel: 200 with the run detail, user.write, the service gets the lower-cased id', async () => {
    const res = await http().post(`/v1/admin/ai/eval/runs/${id.toUpperCase()}/cancel`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, status: 'failed', error: 'cancelled' });
    expect(runs.cancel).toHaveBeenCalledWith(id);
    expect(hit).toHaveBeenCalledExactlyOnceWith('user.write', actorId);
    expect(new Reflector().get(IDEMPOTENT_KEY, AdminAiEvalController.prototype.cancelRun)).toBeUndefined();
  });

  it('DELETE /runs/:id: 204 with no body, user.write, the service gets the id', async () => {
    const res = await http().delete(`/v1/admin/ai/eval/runs/${id}`).set(auth());
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(runs.remove).toHaveBeenCalledWith(id);
    expect(hit).toHaveBeenCalledExactlyOnceWith('user.write', actorId);
  });

  it('the service\'s 409s and 404 reach the client as problems (run-not-active, run-active, not-found)', async () => {
    const problem = (status: number, type: string) => new ProblemDetailsException({ status, type, title: type });
    runs.cancel.mockRejectedValueOnce(problem(409, 'run-not-active'));
    const notActive = await http().post(`/v1/admin/ai/eval/runs/${id}/cancel`).set(auth());
    expect([notActive.status, notActive.body.type]).toEqual([409, `${PROBLEM}run-not-active`]);
    runs.remove.mockRejectedValueOnce(problem(409, 'run-active'));
    const active = await http().delete(`/v1/admin/ai/eval/runs/${id}`).set(auth());
    expect([active.status, active.body.type]).toEqual([409, `${PROBLEM}run-active`]);
    runs.cancel.mockRejectedValueOnce(problem(404, 'not-found'));
    const missing = await http().post(`/v1/admin/ai/eval/runs/${id}/cancel`).set(auth());
    expect([missing.status, missing.body.type]).toEqual([404, `${PROBLEM}not-found`]);
  });

  it('bad queries, params and bodies → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().get('/v1/admin/ai/eval/examples').set(auth()),
      () => http().get('/v1/admin/ai/eval/examples').set(auth()).query({ operation: 'x' }),
      () => http().post('/v1/admin/ai/eval/examples').set(auth()).send({ operation: 'lookup_word', input: {}, extra: 1 }),
      () => http().patch('/v1/admin/ai/eval/examples/not-a-uuid').set(auth()).send({ note: 'x' }),
      () => http().get('/v1/admin/ai/eval/runs').set(auth()).query({ operation: 'generate_cloze', page_size: '101' }),
      () => http().get('/v1/admin/ai/eval/runs/not-a-uuid').set(auth()),
      () => http().post('/v1/admin/ai/eval/runs/not-a-uuid/cancel').set(auth()),
      () => http().delete('/v1/admin/ai/eval/runs/not-a-uuid').set(auth()),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(examples.list).not.toHaveBeenCalled(); expect(examples.create).not.toHaveBeenCalled();
    expect(examples.update).not.toHaveBeenCalled(); expect(runs.list).not.toHaveBeenCalled(); expect(runs.get).not.toHaveBeenCalled();
    expect(runs.cancel).not.toHaveBeenCalled(); expect(runs.remove).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    const res = await http().get('/v1/admin/ai/eval/examples').set(auth()).query({ operation: 'lookup_word' });
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(`${PROBLEM}forbidden`);
  });

  it('an editor cannot cancel or delete a run', async () => {
    role = 'editor';
    expect((await http().post(`/v1/admin/ai/eval/runs/${id}/cancel`).set(auth())).status).toBe(403);
    expect((await http().delete(`/v1/admin/ai/eval/runs/${id}`).set(auth())).status).toBe(403);
    expect(runs.cancel).not.toHaveBeenCalled(); expect(runs.remove).not.toHaveBeenCalled();
  });
});
