import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { PromptsService } from '../prompts/prompts.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin ai prompts HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let get: ReturnType<typeof vi.spyOn>;
  let revisions: ReturnType<typeof vi.spyOn>; let test: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const exampleId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const prompts = ctx.app.get(PromptsService);
    get = vi.spyOn(prompts, 'get');
    revisions = vi.spyOn(prompts, 'revisions'); test = vi.spyOn(prompts, 'test');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    get.mockReset().mockResolvedValue({ operation: 'generate_cloze', revision: 1 });
    revisions.mockReset().mockResolvedValue({ items: [], next_page_token: null });
    test.mockReset().mockResolvedValue({ items: [] });
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every route requires settings.manage', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/ai/prompts'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'GET /v1/admin/ai/prompts/:op', 'GET /v1/admin/ai/prompts/:op/revisions', 'POST /v1/admin/ai/prompts/:op/test',
    ]);
    for (const route of routes) expect(route.permissions).toEqual(['settings.manage']);
  });

  it('GET reads the operation without a rate rule', async () => {
    expect((await http().get('/v1/admin/ai/prompts/lookup_word').set(auth())).status).toBe(200);
    expect(get).toHaveBeenCalledWith('lookup_word');
    expect(hit).not.toHaveBeenCalled();
  });

  it('design §6.6: PUT of a prompt is gone → 404 (the text changes by publishing a config)', async () => {
    const res = await http().put('/v1/admin/ai/prompts/generate_cloze').set(auth()).send({ expected_revision: 1, instructions: 'New.', examples: [] });
    expect(res.status).toBe(404);
  });

  it('GET revisions defaults page_size to 20 and passes the page token', async () => {
    await http().get('/v1/admin/ai/prompts/generate_cloze/revisions').set(auth());
    expect(revisions).toHaveBeenLastCalledWith('generate_cloze', 20, undefined);
    await http().get('/v1/admin/ai/prompts/generate_cloze/revisions?page_size=5&page_token=abc').set(auth());
    expect(revisions).toHaveBeenLastCalledWith('generate_cloze', 5, 'abc');
  });

  it('test answers 200 and lower-cases the example ids; ai.test is counted by the service, not the guard', async () => {
    const body = { instructions: 'Draft.', examples: [], example_ids: [exampleId.toUpperCase()] };
    const res = await http().post('/v1/admin/ai/prompts/generate_cloze/test').set(auth()).send(body);
    expect(res.status).toBe(200);
    expect(test).toHaveBeenCalledWith(actorId, 'generate_cloze', { ...body, example_ids: [exampleId] });
    expect(hit).not.toHaveBeenCalled();
  });

  it('an unknown operation, a bad body or bad paging → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().get('/v1/admin/ai/prompts/summarize').set(auth()),
      () => http().post('/v1/admin/ai/prompts/generate_cloze/test').set(auth()).send({ instructions: 'x', examples: [], example_ids: ['nope'] }),
      () => http().post('/v1/admin/ai/prompts/generate_cloze/test').set(auth())
        .send({ instructions: 'x', examples: [], example_ids: Array.from({ length: 6 }, () => randomUUID()) }),
      () => http().get('/v1/admin/ai/prompts/generate_cloze/revisions?page_size=0').set(auth()),
      () => http().get('/v1/admin/ai/prompts/generate_cloze/revisions?page_size=101').set(auth()),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(get).not.toHaveBeenCalled();
    expect(test).not.toHaveBeenCalled();
    expect(revisions).not.toHaveBeenCalled();
  });

  it('an editor gets 403 forbidden', async () => {
    role = 'editor';
    expect((await http().get('/v1/admin/ai/prompts/generate_cloze').set(auth())).status).toBe(403);
    expect((await http().post('/v1/admin/ai/prompts/generate_cloze/test').set(auth()).send({ instructions: 'x', examples: [] })).status)
      .toBe(403);
    expect(get).not.toHaveBeenCalled();
    expect(test).not.toHaveBeenCalled();
  });
});
