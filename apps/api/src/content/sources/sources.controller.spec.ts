import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { SourcesService, type SourceView } from './sources.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin sources HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let service: Record<'list' | 'create' | 'update' | 'remove', ReturnType<typeof vi.spyOn>>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const id = randomUUID();
  const http = () => ctx.http();
  const view: SourceView = {
    id, kind: 'third_party', name: 'CEFR-J', version: '2', url: null, license: 'MIT', attribution: 'by me', display_priority: 7,
  };

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const sources = ctx.app.get(SourcesService);
    service = {
      list: vi.spyOn(sources, 'list'), create: vi.spyOn(sources, 'create'),
      update: vi.spyOn(sources, 'update'), remove: vi.spyOn(sources, 'remove'),
    };
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'admin';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    service.list.mockReset().mockResolvedValue({ items: [view] }); service.create.mockReset().mockResolvedValue(view);
    service.update.mockReset().mockResolvedValue(view); service.remove.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('every admin route requires content.import', () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/content/sources'));
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'DELETE /v1/admin/content/sources/:id', 'GET /v1/admin/content/sources', 'PATCH /v1/admin/content/sources/:id',
      'POST /v1/admin/content/sources',
    ]);
    for (const route of routes) expect(route.permissions, `${route.method} ${route.path}`).toEqual(['content.import']);
  });

  it('PATCH: 200 with the updated view, the id lower-cased, user.write counted', async () => {
    const body = { name: 'CEFR-J', version: '2', url: 'https://example.com', license: 'MIT', attribution: 'by me', display_priority: 7 };
    const res = await http().patch(`/v1/admin/content/sources/${id.toUpperCase()}`).set(auth()).send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(view);
    expect(service.update).toHaveBeenCalledWith(id, body);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('PATCH: a single key reaches the service alone (no defaults are filled in)', async () => {
    expect((await http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ url: null })).status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(id, { url: null });
  });

  it('DELETE: 204 with no body, user.write counted', async () => {
    const res = await http().delete(`/v1/admin/content/sources/${id}`).set(auth());
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(service.remove).toHaveBeenCalledWith(id);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('the list route is a read: no rate-limit hit', async () => {
    expect((await http().get('/v1/admin/content/sources').set(auth())).status).toBe(200);
    expect(hit).not.toHaveBeenCalled();
  });

  it('empty body, kind, unknown keys, a bad url or priority, a bad id → 400 validation-failed before the service', async () => {
    for (const request of [
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({}),
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ kind: 'owner' }),
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ name: 'x', extra: 1 }),
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ name: '  ' }),
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ url: 'javascript:alert(1)' }),
      () => http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ display_priority: 1.5 }),
      () => http().patch('/v1/admin/content/sources/not-a-uuid').set(auth()).send({ name: 'x' }),
      () => http().delete('/v1/admin/content/sources/not-a-uuid').set(auth()),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    expect(service.update).not.toHaveBeenCalled(); expect(service.remove).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'not-found'], [409, 'source-protected'], [409, 'source-exists'], [409, 'source-in-use'],
  ])('a %i %s problem from the service reaches the client as problem+json', async (status, type) => {
    const fail = () => { throw new ProblemDetailsException({ status, title: 'x', type }); };
    service.update.mockImplementation(async () => fail());
    service.remove.mockImplementation(async () => fail());
    const patch = await http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ name: 'x' });
    const del = await http().delete(`/v1/admin/content/sources/${id}`).set(auth());
    for (const res of [patch, del]) {
      expect(res.status).toBe(status);
      expect(res.body.type).toBe(`${PROBLEM}${type}`);
    }
  });

  it('a signed-in user who is not staff gets 403, and no token gets 401; the service is never called', async () => {
    role = null;
    const forbidden = [
      await http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ name: 'x' }),
      await http().delete(`/v1/admin/content/sources/${id}`).set(auth()),
    ];
    for (const res of forbidden) {
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(`${PROBLEM}forbidden`);
    }
    expect((await http().patch(`/v1/admin/content/sources/${id}`).send({ name: 'x' })).status).toBe(401);
    expect((await http().delete(`/v1/admin/content/sources/${id}`)).status).toBe(401);
    expect(service.update).not.toHaveBeenCalled(); expect(service.remove).not.toHaveBeenCalled();
  });

  it('an editor may edit and delete (content.import is theirs too)', async () => {
    role = 'editor';
    expect((await http().patch(`/v1/admin/content/sources/${id}`).set(auth()).send({ name: 'x' })).status).toBe(200);
    expect((await http().delete(`/v1/admin/content/sources/${id}`).set(auth())).status).toBe(204);
  });

  it('the public licence page lists what the service returns (edited values), without id, kind or priority, and needs no token', async () => {
    const res = await http().get('/v1/sources');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [{ name: 'CEFR-J', version: '2', url: null, license: 'MIT', attribution: 'by me' }] });
  });
});
