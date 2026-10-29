import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { ConfigsService } from '../configs/configs.service.js';
import { PublishService } from '../configs/publish.service.js';

describe('admin ai configs HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let service: Record<'get' | 'createDraft' | 'saveDraft' | 'deleteDraft' | 'testDraft' | 'check' | 'publish' | 'rollback' | 'history', ReturnType<typeof vi.spyOn>>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const publishBody = { expected_version: 1, candidate_run_id: null, baseline_run_id: null, acknowledge_warnings: false };
  const saveBody = {
    expected_version: 1, instructions: 'New.', examples: [], model_ref: null, effort: null, thinking: null, max_output_tokens: null, note: null,
  };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const configs = ctx.app.get(ConfigsService);
    const publish = ctx.app.get(PublishService);
    service = {
      get: vi.spyOn(configs, 'get'), createDraft: vi.spyOn(configs, 'createDraft'), saveDraft: vi.spyOn(configs, 'saveDraft'),
      deleteDraft: vi.spyOn(configs, 'deleteDraft'), testDraft: vi.spyOn(configs, 'testDraft'),
      check: vi.spyOn(publish, 'check'), publish: vi.spyOn(publish, 'publish'), rollback: vi.spyOn(publish, 'rollback'), history: vi.spyOn(publish, 'history'),
    };
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    service.get.mockReset().mockResolvedValue({ operation: 'generate_cloze' });
    service.createDraft.mockReset().mockResolvedValue({ id: 'd' });
    service.saveDraft.mockReset().mockResolvedValue({ id: 'd', version: 2 });
    service.deleteDraft.mockReset().mockResolvedValue(undefined);
    service.testDraft.mockReset().mockResolvedValue({ items: [] });
    service.check.mockReset().mockResolvedValue({ turn_off: false });
    service.publish.mockReset().mockResolvedValue({ operation: 'generate_cloze' });
    service.rollback.mockReset().mockResolvedValue({ operation: 'generate_cloze' });
    service.history.mockReset().mockResolvedValue({ items: [], next_page_token: null });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/configs'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'DELETE /v1/admin/ai/configs/:op/draft', 'GET /v1/admin/ai/configs/:op', 'GET /v1/admin/ai/configs/:op/history',
      'GET /v1/admin/ai/configs/:op/publish-check', 'POST /v1/admin/ai/configs/:op/draft', 'POST /v1/admin/ai/configs/:op/draft/test',
      'POST /v1/admin/ai/configs/:op/publish', 'POST /v1/admin/ai/configs/:op/rollback', 'PUT /v1/admin/ai/configs/:op/draft',
    ].sort());
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['settings.manage']);
  });

  it('an editor gets 403 on each route and nothing runs', async () => {
    role = 'editor';
    const base = '/v1/admin/ai/configs/generate_cloze';
    expect((await http().get(base).set(auth())).status).toBe(403);
    expect((await http().post(`${base}/draft`).set(auth()).send({})).status).toBe(403);
    expect((await http().put(`${base}/draft`).set(auth()).send(saveBody)).status).toBe(403);
    expect((await http().delete(`${base}/draft`).set(auth())).status).toBe(403);
    expect((await http().post(`${base}/draft/test`).set(auth()).send({})).status).toBe(403);
    expect((await http().get(`${base}/publish-check`).set(auth())).status).toBe(403);
    expect((await http().post(`${base}/publish`).set(auth()).send(publishBody)).status).toBe(403);
    expect((await http().post(`${base}/rollback`).set(auth()).send({ expected_live_version: 1 })).status).toBe(403);
    expect((await http().get(`${base}/history`).set(auth())).status).toBe(403);
    for (const spy of Object.values(service)) expect(spy).not.toHaveBeenCalled();
  });

  it('an unknown operation name → 400', async () => {
    expect((await http().get('/v1/admin/ai/configs/nope').set(auth())).status).toBe(400);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('GET reads without a rate rule', async () => {
    expect((await http().get('/v1/admin/ai/configs/lookup_word').set(auth())).status).toBe(200);
    expect(service.get).toHaveBeenCalledWith('lookup_word');
    expect(hit).not.toHaveBeenCalled();
  });

  it('POST /draft is a 201 write that passes the actor, the operation and the body', async () => {
    const source = randomUUID();
    const res = await http().post('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send({ from_config_id: source.toUpperCase() });
    expect(res.status).toBe(201);
    expect(service.createDraft).toHaveBeenCalledWith(actorId, 'generate_cloze', { from_config_id: source });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send({ from_config_id: 'x' })).status).toBe(400);
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send({ extra: 1 })).status).toBe(400);
  });

  it('PUT /draft is a write; every key is required and no key may be added', async () => {
    const res = await http().put('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send(saveBody);
    expect(res.status).toBe(200);
    expect(service.saveDraft).toHaveBeenCalledWith(actorId, 'generate_cloze', saveBody);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    const { note: _note, ...withoutNote } = saveBody;
    expect((await http().put('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send(withoutNote)).status).toBe(400);
    expect((await http().put('/v1/admin/ai/configs/generate_cloze/draft').set(auth()).send({ ...saveBody, extra: 1 })).status).toBe(400);
  });

  it('DELETE /draft is a 204 write', async () => {
    expect((await http().delete('/v1/admin/ai/configs/generate_cloze/draft').set(auth())).status).toBe(204);
    expect(service.deleteDraft).toHaveBeenCalledWith('generate_cloze');
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('POST /draft/test is a 200 with no write limit of its own (the service takes the ai.test slot) and no idempotency key', async () => {
    const exampleId = randomUUID();
    const res = await http().post('/v1/admin/ai/configs/generate_cloze/draft/test').set(auth()).send({ example_ids: [exampleId.toUpperCase()] });
    expect(res.status).toBe(200);
    expect(service.testDraft).toHaveBeenCalledWith(actorId, 'generate_cloze', { example_ids: [exampleId] });
    expect(hit).not.toHaveBeenCalled();
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/draft/test').set(auth()).send({ example_ids: Array(6).fill(randomUUID()) })).status).toBe(400);
  });

  it('GET /publish-check reads without a rate rule', async () => {
    expect((await http().get('/v1/admin/ai/configs/generate_cloze/publish-check').set(auth())).status).toBe(200);
    expect(service.check).toHaveBeenCalledWith('generate_cloze');
    expect(hit).not.toHaveBeenCalled();
  });

  it('POST /publish is a 200 write; without the candidate_run_id key → 400, with null → accepted; ids are lower-cased', async () => {
    const res = await http().post('/v1/admin/ai/configs/generate_cloze/publish').set(auth()).send(publishBody);
    expect(res.status).toBe(200);
    expect(service.publish).toHaveBeenCalledWith(actorId, 'generate_cloze', publishBody);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    const { candidate_run_id: _candidate, ...withoutCandidate } = publishBody;
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/publish').set(auth()).send(withoutCandidate)).status).toBe(400);
    const run = randomUUID();
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/publish').set(auth()).send({ ...publishBody, candidate_run_id: run.toUpperCase() })).status).toBe(200);
    expect(service.publish).toHaveBeenLastCalledWith(actorId, 'generate_cloze', { ...publishBody, candidate_run_id: run });
  });

  it('POST /rollback is a 200 write that needs expected_live_version', async () => {
    const res = await http().post('/v1/admin/ai/configs/generate_cloze/rollback').set(auth()).send({ expected_live_version: 4 });
    expect(res.status).toBe(200);
    expect(service.rollback).toHaveBeenCalledWith(actorId, 'generate_cloze', { expected_live_version: 4 });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect((await http().post('/v1/admin/ai/configs/generate_cloze/rollback').set(auth()).send({})).status).toBe(400);
  });

  it('GET /history reads a page without a rate rule; page_size 0 → 400', async () => {
    expect((await http().get('/v1/admin/ai/configs/generate_cloze/history?page_size=5').set(auth())).status).toBe(200);
    expect(service.history).toHaveBeenCalledWith('generate_cloze', 5, undefined);
    expect(hit).not.toHaveBeenCalled();
    expect((await http().get('/v1/admin/ai/configs/generate_cloze/history?page_size=0').set(auth())).status).toBe(400);
  });
});
