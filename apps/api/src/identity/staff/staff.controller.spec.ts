import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import { StaffService } from './staff.service.js';

describe('staff HTTP schemas and wiring (unit, isolated persistence)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let find: ReturnType<typeof vi.spyOn>; let listUsers: ReturnType<typeof vi.spyOn>; let detail: ReturnType<typeof vi.spyOn>; let list: ReturnType<typeof vi.spyOn>; let set: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const put = (id: string, body: object) => ctx.http().put(`/v1/admin/users/${id}/staff-role`).set(auth()).send(body);
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const staff = ctx.app.get(StaffService);
    find = vi.spyOn(staff, 'findByEmail'); listUsers = vi.spyOn(staff, 'listUsers'); detail = vi.spyOn(staff, 'getUserDetail'); list = vi.spyOn(staff, 'listStaff'); set = vi.spyOn(staff, 'setStaffRole');
  });
  beforeEach(async () => {
    userId = randomUUID();
    token = await ctx.app.get(AccessTokenService).sign({ userId, sessionChainId: randomUUID() });
    prisma.sessionChain.findUnique.mockReset().mockResolvedValue({ userId, revokedAt: null, user: { staffRole: 'admin' } });
    const view = { id: userId, email: 'a@example.com', email_verified: true, staff_role: 'admin' };
    find.mockReset().mockResolvedValue(view); list.mockReset().mockResolvedValue({ items: [view], next_page_token: null });
    listUsers.mockReset().mockResolvedValue({ items: [], next_page_token: null }); detail.mockReset().mockResolvedValue(view);
    set.mockReset().mockResolvedValue(view); hit.mockReset().mockResolvedValue(undefined);
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });
  it('B1#27: valid routes bind schemas, pass the actor and limit only PUT', async () => {
    expect((await ctx.http().get('/v1/admin/users').set(auth()).query({ email: 'a@example.com' })).status).toBe(200);
    expect(find).toHaveBeenCalledWith('a@example.com');
    expect((await ctx.http().get('/v1/admin/staff').set(auth())).status).toBe(200);
    expect(list).toHaveBeenCalledWith(20, undefined);
    expect((await ctx.http().get('/v1/admin/staff').set(auth()).query({ page_size: '1', page_token: 'opaque' })).status).toBe(200);
    expect(list).toHaveBeenLastCalledWith(1, 'opaque');
    for (const role of ['admin', 'editor', null]) {
      expect((await put(userId, { staff_role: role })).status).toBe(200);
      expect(set).toHaveBeenLastCalledWith(userId, userId, role);
    }
    expect(hit).toHaveBeenCalledTimes(3); expect(hit).toHaveBeenCalledWith('user.write', userId);
  });
  it('B1#27: malformed body, query and path return 400 before invoking services (Review Focus #3)', async () => {
    for (const request of [() => put('bad', { staff_role: 'admin' }), () => put(userId, {}), () => put(userId, { staff_role: 'owner' }),
      () => put(userId, { staff_role: 42 }), () => put(userId, { staff_role: 'admin', extra: true }),
      () => ctx.http().put(`/v1/admin/users/${userId}/staff-role`).set(auth()).set('Content-Type', 'application/json').send('{'),
      ...[{ page_size: 0 }, { page_size: 101 }, { page_size: 1.5 }, { page_size: 'bad' }, { extra: 'x' }, { page_size: [1, 2] }]
        .map((query) => () => ctx.http().get('/v1/admin/staff').set(auth()).query(query)),
      ...[{ email: ['a@example.com', 'b@example.com'] }, { email: 'x'.repeat(321) }, { email: 'a@example.com', extra: 'x' },
        { email: 'a@example.com', q: 'an' }, { email: 'a@example.com', status: 'locked' }, { email: 'a@example.com', page_token: 'x' },
        { q: 'a' }, { q: '   ' }, { q: 'x'.repeat(101) }, { status: 'banned' }, { page_size: 0 }, { extra: 'x' }]
        .map((query) => () => ctx.http().get('/v1/admin/users').set(auth()).query(query)),
    ]) {
      const res = await request();
      expect(res.status).toBe(400); expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
      expect(res.headers['content-type']).toContain('application/problem+json'); expect(res.body.operation_id).toEqual(expect.any(String));
    }
    expect(find).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled();
  });
  it('FE13 / Review Focus 5: q is trimmed before the 2-100 check; a bare or blank q is 400', async () => {
    expect(listUsers).not.toHaveBeenCalled();
    for (const q of ['a', '   ', ' a ', 'x'.repeat(101)]) {
      expect((await ctx.http().get('/v1/admin/users').set(auth()).query({ q })).status).toBe(400);
    }
    expect(listUsers).not.toHaveBeenCalled();
    expect((await ctx.http().get('/v1/admin/users').set(auth()).query({ q: '  an  ' })).status).toBe(200);
    expect(listUsers).toHaveBeenCalledWith({ q: 'an', status: undefined, pageSize: 20, pageToken: undefined });
  });
  it('list and detail routes bind query and id; email alone keeps the single-object response', async () => {
    const res = await ctx.http().get('/v1/admin/users').set(auth()).query({ status: 'locked', page_size: '5', page_token: 't' });
    expect(res.status).toBe(200); expect(res.body).toEqual({ items: [], next_page_token: null });
    expect(listUsers).toHaveBeenCalledWith({ q: undefined, status: 'locked', pageSize: 5, pageToken: 't' });
    const one = await ctx.http().get('/v1/admin/users').set(auth()).query({ email: 'a@example.com' });
    expect(one.status).toBe(200); expect(one.body.email).toBe('a@example.com'); expect(one.body.items).toBeUndefined();
    expect(find).toHaveBeenCalledWith('a@example.com');
    expect((await ctx.http().get(`/v1/admin/users/${userId}`).set(auth())).status).toBe(200);
    expect(detail).toHaveBeenCalledWith(userId);
    expect((await ctx.http().get('/v1/admin/users/not-a-uuid').set(auth())).status).toBe(400);
  });
  it('B1#27: missing email lookup returns 404', async () => {
    find.mockResolvedValue(null);
    const res = await ctx.http().get('/v1/admin/users').set(auth()).query({ email: 'missing@example.com' });
    expect(res.status).toBe(404); expect(res.body.type).toBe('https://api.example.com/problems/not-found');
  });
  it('B1#26: missing authentication is 401 and a revoked chain is 403 before services and rate limiting', async () => {
    expect((await ctx.http().get('/v1/admin/staff')).status).toBe(401);
    prisma.sessionChain.findUnique.mockResolvedValue({ userId, revokedAt: new Date(), user: { staffRole: 'admin' } });
    for (const request of [() => ctx.http().get('/v1/admin/users').set(auth()).query({ email: 'a@example.com' }),
      () => ctx.http().get('/v1/admin/staff').set(auth()), () => put(userId, { staff_role: null })]) {
      const res = await request(); expect(res.status).toBe(403); expect(res.body.type).toBe('https://api.example.com/problems/forbidden');
    }
    expect(find).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled(); expect(hit).not.toHaveBeenCalled();
  });
});
