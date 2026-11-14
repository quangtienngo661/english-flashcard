import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { listRoutes } from '../../../test/support/list-routes.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { AccessTokenService } from '../../identity/sessions/access-token.service.js';
import { UnknownFormsAdminService } from './unknown-forms-admin.service.js';

const PROBLEM = 'https://api.example.com/problems/';

describe('admin unknown forms HTTP (unit, mocked service)', () => {
  let ctx: TestApp; let token: string; let actorId: string; let role: 'admin' | 'editor' | null;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let list: ReturnType<typeof vi.spyOn>; let dismiss: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => ctx.http();
  const formId = randomUUID();

  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const forms = ctx.app.get(UnknownFormsAdminService);
    list = vi.spyOn(forms, 'list'); dismiss = vi.spyOn(forms, 'dismiss');
  });
  beforeEach(async () => {
    actorId = randomUUID(); role = 'editor';
    token = await ctx.app.get(AccessTokenService).sign({ userId: actorId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockImplementation(async () => ({ userId: actorId, revokedAt: null, user: { staffRole: role } }));
    list.mockReset().mockResolvedValue({ items: [], next_page_token: null }); dismiss.mockReset().mockResolvedValue(undefined);
    hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('both routes need content.edit', () => {
    expect(listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/practice/unknown-forms'))).toEqual([
      { method: 'GET', path: '/v1/admin/practice/unknown-forms', permissions: ['content.edit'] },
      { method: 'DELETE', path: '/v1/admin/practice/unknown-forms/:id', permissions: ['content.edit'] },
    ]);
  });

  it('an editor lists a page and dismisses a row (204, user.write)', async () => {
    expect((await http().get('/v1/admin/practice/unknown-forms').set(auth()).query({ page_size: 5 })).status).toBe(200);
    expect(list).toHaveBeenCalledWith({ pageSize: 5, pageToken: undefined });
    expect(hit).not.toHaveBeenCalled();
    expect((await http().delete(`/v1/admin/practice/unknown-forms/${formId.toUpperCase()}`).set(auth())).status).toBe(204);
    expect(dismiss).toHaveBeenCalledWith(formId);
    expect(hit).toHaveBeenCalledWith('user.write', actorId);
  });

  it('bad ids and page sizes → 400 validation-failed; a learner gets 403', async () => {
    for (const request of [
      () => http().delete('/v1/admin/practice/unknown-forms/not-a-uuid').set(auth()),
      () => http().get('/v1/admin/practice/unknown-forms').set(auth()).query({ page_size: 101 }),
    ]) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(`${PROBLEM}validation-failed`);
    }
    role = null;
    expect((await http().get('/v1/admin/practice/unknown-forms').set(auth())).status).toBe(403);
    expect(list).not.toHaveBeenCalled(); expect(dismiss).not.toHaveBeenCalled();
  });
});
