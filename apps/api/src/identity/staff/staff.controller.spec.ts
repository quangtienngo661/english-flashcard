import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { AccessTokenService } from '../sessions/access-token.service.js';
import { AccountDeletionRegistry } from '../deletion/account-eraser.js';
import { AccountDeletionRequests } from '../deletion/account-deletion-requests.service.js';
import { StaffService } from './staff.service.js';

describe('staff HTTP schemas and wiring (unit, isolated persistence)', () => {
  let ctx: TestApp; let token: string; let userId: string;
  const prisma = { sessionChain: { findUnique: vi.fn() }, $disconnect: async () => {} };
  const hit = vi.spyOn(RateLimiter.prototype, 'hit');
  let renewing: ReturnType<typeof vi.spyOn>; let isLast: ReturnType<typeof vi.spyOn>;
  let find: ReturnType<typeof vi.spyOn>; let listUsers: ReturnType<typeof vi.spyOn>; let detail: ReturnType<typeof vi.spyOn>; let list: ReturnType<typeof vi.spyOn>; let set: ReturnType<typeof vi.spyOn>;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const put = (id: string, body: object) => ctx.http().put(`/v1/admin/users/${id}/staff-role`).set(auth()).send(body);
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: prisma }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
    const staff = ctx.app.get(StaffService);
    renewing = vi.spyOn(ctx.app.get(AccountDeletionRegistry).precondition(), 'renewing');
    isLast = vi.spyOn(staff, 'isLastAdmin');
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
    renewing.mockReset().mockResolvedValue(false);
    isLast.mockReset().mockResolvedValue(false);
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
  it('rejects NUL in q and email with 400', async () => {
    for (const query of [{ q: 'a\u0000b' }, { email: 'a\u0000b@x.y' }]) {
      expect((await ctx.http().get('/v1/admin/users').set(auth()).query(query)).status).toBe(400);
    }
    expect(listUsers).not.toHaveBeenCalled(); expect(find).not.toHaveBeenCalled();
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
  it('final review M6: the user detail says last_admin for an admin nobody else backs up; anyone who is not an admin is never asked', async () => {
    isLast.mockResolvedValue(true);
    const admin = await ctx.http().get(`/v1/admin/users/${userId}`).set(auth());
    expect(admin.body.last_admin).toBe(true);
    expect(isLast).toHaveBeenCalledWith(userId);
    isLast.mockClear();
    detail.mockResolvedValueOnce({ id: userId, email: 'a@example.com', email_verified: true, staff_role: null } as never);
    const learner = await ctx.http().get(`/v1/admin/users/${userId}`).set(auth());
    expect(learner.body.last_admin).toBe(false);
    expect(isLast).not.toHaveBeenCalled();
  });
  it('B8: the user detail carries auto_renewing for the delete dialog', async () => {
    renewing.mockResolvedValue(true);
    const res = await ctx.http().get(`/v1/admin/users/${userId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.auto_renewing).toBe(true);
    expect(renewing).toHaveBeenCalledWith(expect.anything(), userId);
  });
  it('B8: POST /users/:id/delete answers 204 when gone and 202 { status: pending } otherwise, passes the actor, the id and the body, charges user.write', async () => {
    const requests = ctx.app.get(AccountDeletionRequests);
    const del = vi.spyOn(requests, 'deleteByAdmin').mockClear().mockResolvedValue('done');
    const target = randomUUID();
    const done = await ctx.http().post(`/v1/admin/users/${target}/delete`).set(auth()).send({ confirm_email: 'a@example.com' });
    expect(done.status).toBe(204); expect(done.text).toBe('');
    expect(del).toHaveBeenCalledWith(userId, target, { confirm_email: 'a@example.com' }, expect.anything());
    expect(hit).toHaveBeenCalledWith('user.write', userId);
    del.mockResolvedValue('pending');
    const pending = await ctx.http().post(`/v1/admin/users/${target}/delete`).set(auth()).send({ confirm_email: 'a@example.com' });
    expect(pending.status).toBe(202); expect(pending.body).toEqual({ status: 'pending' });
    for (const body of [{}, { confirm_email: 5 }, { confirm_email: 'a@example.com', extra: 1 }]) {
      expect((await ctx.http().post(`/v1/admin/users/${target}/delete`).set(auth()).send(body)).status).toBe(400);
    }
    expect((await ctx.http().post('/v1/admin/users/not-a-uuid/delete').set(auth()).send({ confirm_email: 'a@b.c' })).status).toBe(400);
  });
  it('B8E31: an editor gets 403 on the delete route before the service', async () => {
    const del = vi.spyOn(ctx.app.get(AccountDeletionRequests), 'deleteByAdmin').mockClear();
    prisma.sessionChain.findUnique.mockResolvedValue({ userId, revokedAt: null, user: { staffRole: 'editor' } });
    const res = await ctx.http().post(`/v1/admin/users/${randomUUID()}/delete`).set(auth()).send({ confirm_email: 'a@example.com' });
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });
  it('B1#27: missing email lookup returns 404', async () => {
    find.mockResolvedValue(null);
    const res = await ctx.http().get('/v1/admin/users').set(auth()).query({ email: 'missing@example.com' });
    expect(res.status).toBe(404); expect(res.body.type).toBe('https://api.example.com/problems/not-found');
  });
  it('N4: lock and unlock routes pass the actor, the id and the NFC-trimmed reason, and are rate limited', async () => {
    const staff = ctx.app.get(StaffService);
    const lock = vi.spyOn(staff, 'lockUser').mockClear().mockResolvedValue({ id: userId, status: 'locked' } as never);
    const unlock = vi.spyOn(staff, 'unlockUser').mockClear().mockResolvedValue({ id: userId, status: 'active' } as never);
    const target = randomUUID();
    const locked = await ctx.http().post(`/v1/admin/users/${target}/lock`).set(auth()).send({ reason: '  Café spam\n ' });
    expect(locked.status).toBe(200); expect(locked.body).toEqual({ id: userId, status: 'locked' });
    expect(lock).toHaveBeenCalledExactlyOnceWith(userId, target, 'Café spam');
    expect((await ctx.http().post(`/v1/admin/users/${target}/lock`).set(auth()).send({ reason: '😀'.repeat(500) })).status).toBe(200);
    const unlocked = await ctx.http().post(`/v1/admin/users/${target}/unlock`).set(auth());
    expect(unlocked.status).toBe(200); expect(unlocked.body).toEqual({ id: userId, status: 'active' });
    expect(unlock).toHaveBeenCalledExactlyOnceWith(userId, target);
    expect(hit).toHaveBeenCalledTimes(3); expect(hit).toHaveBeenCalledWith('user.write', userId);
  });
  it('AD18: editors may read users (list and detail) but every write is 403 before the service', async () => {
    prisma.sessionChain.findUnique.mockResolvedValue({ userId, revokedAt: null, user: { staffRole: 'editor' } });
    const staff = ctx.app.get(StaffService);
    const create = vi.spyOn(staff, 'createAccount').mockClear();
    const update = vi.spyOn(staff, 'updateUser').mockClear();
    const reset = vi.spyOn(staff, 'resetPassword').mockClear();
    const target = randomUUID();
    expect((await ctx.http().get('/v1/admin/users').set(auth())).status).toBe(200);
    expect((await ctx.http().get(`/v1/admin/users/${target}`).set(auth())).status).toBe(200);
    expect((await ctx.http().get('/v1/admin/staff').set(auth())).status).toBe(403);
    expect((await ctx.http().post('/v1/admin/users').set(auth()).send({ email: 'x@example.com', staff_role: null,
      must_change_password: true, timezone: 'UTC' })).status).toBe(403);
    expect((await ctx.http().patch(`/v1/admin/users/${target}`).set(auth()).send({ given_name: 'Mai' })).status).toBe(403);
    expect((await ctx.http().post(`/v1/admin/users/${target}/password`).set(auth()).send({ must_change_password: true })).status)
      .toBe(403);
    expect(create).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled();
  });
  it('AD18: create takes a null role; edit and reset pass actor, id and parsed body, are rate limited; bad bodies are 400', async () => {
    const staff = ctx.app.get(StaffService);
    const create = vi.spyOn(staff, 'createAccount').mockClear().mockResolvedValue({ id: userId } as never);
    const update = vi.spyOn(staff, 'updateUser').mockClear().mockResolvedValue({ id: userId } as never);
    const reset = vi.spyOn(staff, 'resetPassword').mockClear().mockResolvedValue({ id: userId } as never);
    const target = randomUUID();
    expect((await ctx.http().post('/v1/admin/users').set(auth()).send({ email: 'x@example.com', staff_role: null,
      must_change_password: false, timezone: 'UTC' })).status).toBe(201);
    expect(create.mock.calls[0][1]).toMatchObject({ staff_role: null });
    const patched = await ctx.http().patch(`/v1/admin/users/${target}`).set(auth()).send({ given_name: '  Mai ', birth_date: '2000-01-01' });
    expect(patched.status).toBe(200);
    expect(update).toHaveBeenCalledWith(userId, target, { given_name: 'Mai', birth_date: '2000-01-01' }, expect.anything());
    const posted = await ctx.http().post(`/v1/admin/users/${target}/password`).set(auth()).send({ must_change_password: true });
    expect(posted.status).toBe(200);
    expect(reset).toHaveBeenCalledWith(userId, target, { must_change_password: true }, expect.anything());
    expect(hit).toHaveBeenCalledWith('user.write', userId);
    for (const body of [{}, { staff_role: 'admin' }, { birth_date: '2000-13-40' }]) {
      expect((await ctx.http().patch(`/v1/admin/users/${target}`).set(auth()).send(body)).status).toBe(400);
    }
    expect((await ctx.http().post(`/v1/admin/users/${target}/password`).set(auth()).send({})).status).toBe(400);
    expect(update).toHaveBeenCalledOnce(); expect(reset).toHaveBeenCalledOnce();
  });
  it('N4: a missing, blank, overlong or control-character reason, or a bad id, is 400 before the service', async () => {
    const staff = ctx.app.get(StaffService);
    const lock = vi.spyOn(staff, 'lockUser').mockClear().mockResolvedValue({} as never);
    const unlock = vi.spyOn(staff, 'unlockUser').mockClear().mockResolvedValue({} as never);
    const target = randomUUID();
    for (const [id, body] of [[target, {}], [target, { reason: '' }], [target, { reason: '   ' }], [target, { reason: 'x'.repeat(501) }],
      [target, { reason: 'bad\u0007bell' }], [target, { reason: 'ok\u0000' }], [target, { reason: 42 }], [target, { reason: 'ok', extra: 1 }],
      ['not-a-uuid', { reason: 'ok' }]] as const) {
      const res = await ctx.http().post(`/v1/admin/users/${id}/lock`).set(auth()).send(body);
      expect(res.status).toBe(400); expect(res.body.type).toBe('https://api.example.com/problems/validation-failed');
    }
    expect((await ctx.http().post('/v1/admin/users/not-a-uuid/unlock').set(auth())).status).toBe(400);
    expect(lock).not.toHaveBeenCalled(); expect(unlock).not.toHaveBeenCalled();
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
