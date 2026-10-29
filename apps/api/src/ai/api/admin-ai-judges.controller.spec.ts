import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { JudgePassesService } from '../judge/judge-passes.service.js';
import { JudgesService } from '../judge/judges.service.js';

describe('admin ai judges HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let service: Record<'list' | 'create' | 'save' | 'clone' | 'revisions', ReturnType<typeof vi.spyOn>>;
  let passGet: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const JUDGE = randomUUID();
  const body = {
    name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, criteria: [{ code: 'single_answer', question: 'Q?' }],
    instructions: 'Judge it.', examples: [], model_ref: null, effort: null, thinking: null, max_output_tokens: null,
  };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const judges = ctx.app.get(JudgesService);
    service = {
      list: vi.spyOn(judges, 'list'), create: vi.spyOn(judges, 'create'), save: vi.spyOn(judges, 'save'), clone: vi.spyOn(judges, 'clone'),
      revisions: vi.spyOn(judges, 'revisions'),
    };
    passGet = vi.spyOn(ctx.app.get(JudgePassesService), 'get');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    service.list.mockReset().mockResolvedValue({ items: [] });
    service.create.mockReset().mockResolvedValue({ id: 'j' });
    service.save.mockReset().mockResolvedValue({ id: 'j' });
    service.clone.mockReset().mockResolvedValue({ id: 'c' });
    service.revisions.mockReset().mockResolvedValue({ items: [] });
    passGet.mockReset().mockResolvedValue({ id: 'p' });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every judge route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/judges'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'GET /v1/admin/ai/judges', 'GET /v1/admin/ai/judges/:id/revisions', 'POST /v1/admin/ai/judges', 'POST /v1/admin/ai/judges/:id/clone',
      'PUT /v1/admin/ai/judges/:id',
    ].sort());
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['settings.manage']);
  });

  it('GET /judge-passes/:id needs settings.manage, reads without a rate rule and passes the lower-cased id', async () => {
    const route = listRoutes(ctx.app).find(({ path }) => path === '/v1/admin/ai/judge-passes/:id');
    expect(route?.method).toBe('GET');
    expect(route?.permissions).toEqual(['settings.manage']);
    expect((await http().get(`/v1/admin/ai/judge-passes/${JUDGE.toUpperCase()}`).set(auth())).status).toBe(200);
    expect(passGet).toHaveBeenCalledExactlyOnceWith(JUDGE);
    expect(hit).not.toHaveBeenCalled();
    expect((await http().get('/v1/admin/ai/judge-passes/not-a-uuid').set(auth())).status).toBe(400);
    role = 'editor';
    expect((await http().get(`/v1/admin/ai/judge-passes/${JUDGE}`).set(auth())).status).toBe(403);
    expect(passGet).toHaveBeenCalledTimes(1);
  });

  it('an editor gets 403 on the five routes and nothing runs', async () => {
    role = 'editor';
    expect((await http().get('/v1/admin/ai/judges').set(auth())).status).toBe(403);
    expect((await http().post('/v1/admin/ai/judges').set(auth()).send(body)).status).toBe(403);
    expect((await http().put(`/v1/admin/ai/judges/${JUDGE}`).set(auth()).send({ ...body, expected_revision: 1 })).status).toBe(403);
    expect((await http().post(`/v1/admin/ai/judges/${JUDGE}/clone`).set(auth()).send({ name: 'x' })).status).toBe(403);
    expect((await http().get(`/v1/admin/ai/judges/${JUDGE}/revisions`).set(auth())).status).toBe(403);
    for (const spy of Object.values(service)) expect(spy).not.toHaveBeenCalled();
  });

  it('GET reads without a rate rule', async () => {
    expect((await http().get('/v1/admin/ai/judges').set(auth())).status).toBe(200);
    expect(service.list).toHaveBeenCalledWith();
    expect((await http().get(`/v1/admin/ai/judges/${JUDGE}/revisions`).set(auth())).status).toBe(200);
    expect(service.revisions).toHaveBeenCalledWith(JUDGE);
    expect(hit).not.toHaveBeenCalled();
  });

  it('POST /judges is a 201 write that passes the actor and the body; an extra key is refused', async () => {
    const res = await http().post('/v1/admin/ai/judges').set(auth()).send(body);
    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(actorId, body);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect((await http().post('/v1/admin/ai/judges').set(auth()).send({ ...body, extra: 1 })).status).toBe(400);
  });

  it('PUT /judges/:id without expected_revision → 400; with it, a write that passes id (lower case), actor and body', async () => {
    expect((await http().put(`/v1/admin/ai/judges/${JUDGE}`).set(auth()).send(body)).status).toBe(400);
    expect(service.save).not.toHaveBeenCalled();
    const res = await http().put(`/v1/admin/ai/judges/${JUDGE.toUpperCase()}`).set(auth()).send({ ...body, expected_revision: 2 });
    expect(res.status).toBe(200);
    expect(service.save).toHaveBeenCalledWith(actorId, JUDGE, { ...body, expected_revision: 2 });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect((await http().put('/v1/admin/ai/judges/not-a-uuid').set(auth()).send({ ...body, expected_revision: 2 })).status).toBe(400);
  });

  it('POST /judges/:id/clone is a 201 write', async () => {
    const res = await http().post(`/v1/admin/ai/judges/${JUDGE}/clone`).set(auth()).send({ name: 'Copy' });
    expect(res.status).toBe(201);
    expect(service.clone).toHaveBeenCalledWith(actorId, JUDGE, { name: 'Copy' });
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
    expect((await http().post(`/v1/admin/ai/judges/${JUDGE}/clone`).set(auth()).send({})).status).toBe(400);
  });
});
