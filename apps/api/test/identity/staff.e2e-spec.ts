import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StaffService } from '../../src/identity/staff/staff.service.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const options = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('staff roles (e2e, isolated database)', () => {
  let ctx: TestApp;
  let staff: StaffService;
  let adminId: string;
  let token: string;
  const auth = (access = token) => ({ Authorization: `Bearer ${access}` });
  const put = (id: string, role: string | null, access = token) => ctx.http()
    .put(`/v1/admin/users/${id}/staff-role`).set(auth(access)).send({ staff_role: role });
  const row = (id: string) => ctx.prisma.user.findUniqueOrThrow({ where: { id } });
  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    staff = ctx.app.get(StaffService);
  });
  beforeEach(async () => {
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.logs.length = 0;
    ctx.clock.set(new Date('2026-10-07T12:00:00Z'));
    ({ userId: adminId } = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' }));
    token = (await startSession(ctx, adminId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B1#26/I21: editor and learner get 403 on all three routes, with no role changes', async () => {
    const before = await row(adminId);
    for (const staffRole of ['editor', undefined] as const) {
      const user = await seedUser(ctx.prisma, { verified: true, staffRole });
      const access = (await startSession(ctx, user.userId)).accessToken;
      for (const request of [
        () => ctx.http().get('/v1/admin/users').query({ email: before.email }).set(auth(access)),
        () => ctx.http().get('/v1/admin/staff').set(auth(access)), () => put(adminId, null, access),
      ]) {
        const res = await request();
        expect(res.status).toBe(403); expect(res.body.type).toBe(problem('forbidden'));
      }
      expect((await row(user.userId)).staffRole).toBe(staffRole ?? null);
    }
    expect(await row(adminId)).toEqual(before);
  });
  it('B1#26/B1E13: logged-out admin gets 403 on all admin routes while GET /me still succeeds', async () => {
    const session = await startSession(ctx, adminId);
    expect((await ctx.http().post('/v1/auth/logout').send({ refresh_token: session.refreshToken })).status).toBe(204);
    expect((await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: session.sessionChainId } })).revokedAt).toEqual(ctx.clock.now());
    const before = await row(adminId);
    for (const request of [() => ctx.http().get('/v1/admin/users').query({ email: before.email }).set(auth(session.accessToken)),
      () => ctx.http().get('/v1/admin/staff').set(auth(session.accessToken)), () => put(adminId, null, session.accessToken)]) {
      const res = await request();
      expect(res.status).toBe(403); expect(res.body.type).toBe(problem('forbidden'));
    }
    expect((await ctx.http().get('/v1/me').set(auth(session.accessToken))).status).toBe(200);
    expect(await row(adminId)).toEqual(before);
  });
  it('B1#27: promotion and demotion affect the next request without re-login or session revocation', async () => {
    const target = await seedUser(ctx.prisma, { verified: true });
    const session = await startSession(ctx, target.userId);
    expect((await ctx.http().get('/v1/admin/staff').set(auth(session.accessToken))).status).toBe(403);
    const promoted = await put(target.userId, 'admin');
    expect(promoted.status).toBe(200);
    expect(promoted.body).toEqual({ id: target.userId, email: target.email, email_verified: true, staff_role: 'admin' });
    expect((await row(target.userId)).staffRole).toBe('admin');
    expect((await ctx.http().get('/v1/admin/staff').set(auth(session.accessToken))).status).toBe(200);
    expect((await put(target.userId, 'editor')).status).toBe(200);
    expect((await row(target.userId)).staffRole).toBe('editor');
    expect((await ctx.http().get('/v1/admin/staff').set(auth(session.accessToken))).status).toBe(403);
    expect((await ctx.prisma.sessionChain.findUniqueOrThrow({ where: { id: session.sessionChainId } })).revokedAt).toBeNull();
    expect(ctx.logs.filter((entry) => entry.event === 'staff_role_changed')).toEqual([
      expect.objectContaining({ actor_id: adminId, target_id: target.userId, staff_role: 'admin', operation_id: expect.any(String) }),
      expect.objectContaining({ actor_id: adminId, target_id: target.userId, staff_role: 'editor', operation_id: expect.any(String) }),
    ]);
    expect((await put(target.userId, null)).status).toBe(200);
    expect((await row(target.userId)).staffRole).toBeNull();
  });
  it('B1#27: assigning either staff role to an unverified target is refused without writes', async () => {
    const target = await seedUser(ctx.prisma); const before = await row(target.userId);
    for (const role of ['admin', 'editor']) {
      const res = await put(target.userId, role);
      expect(res.status).toBe(409); expect(res.body.type).toBe(problem('staff-role-rule'));
      expect(await row(target.userId)).toEqual(before);
    }
    expect(ctx.logs.filter((entry) => entry.event === 'staff_role_changed')).toEqual([]);
  });
  it('B1#28: the only admin cannot demote self to editor or learner', async () => {
    const before = await row(adminId);
    for (const role of ['editor', null]) {
      const res = await put(adminId, role);
      expect(res.status).toBe(409); expect(res.body.type).toBe(problem('staff-role-rule'));
      expect(await row(adminId)).toEqual(before);
    }
    expect(await ctx.prisma.user.count({ where: { staffRole: 'admin' } })).toBe(1);
  });
  it('B1E12/B1#28: two demotions blocked on the staff lock yield one 200 and one 409, leaving one admin', async () => {
    const other = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' });
    const otherToken = (await startSession(ctx, other.userId)).accessToken;
    const before = new Map([[adminId, await row(adminId)], [other.userId, await row(other.userId)]]);
    const ready = gate(); const release = gate(); let holderPid!: number;
    // Holder + two requests + observer consume at most four of the ten connections.
    const holder = ctx.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity.staff_role', 0))`;
      const [pid] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      holderPid = pid.pid; ready.resolve(); await release.promise;
    }, options);
    const holderSettled = Promise.allSettled([holder]);
    let pending: ReturnType<typeof Promise.allSettled> | undefined;
    let responses: Array<{ status: number; body: Record<string, unknown> }> = [];
    try {
      await Promise.race([ready.promise, holder]);
      const requests = [put(other.userId, 'editor').then((res) => res), put(adminId, 'editor', otherToken).then((res) => res)];
      pending = Promise.allSettled(requests);
      const deadline = performance.now() + 4000; let blocked = false;
      while (performance.now() < deadline) {
        const [locks] = await ctx.prisma.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_locks waiter
          JOIN pg_locks holder ON holder.pid = ${holderPid} AND holder.granted
            AND holder.locktype = waiter.locktype AND holder.classid = waiter.classid
            AND holder.objid = waiter.objid AND holder.objsubid = waiter.objsubid
          WHERE waiter.locktype = 'advisory' AND NOT waiter.granted`;
        if (locks.n === 2) { blocked = true; break; }
      }
      expect(blocked).toBe(true); release.resolve(); responses = await Promise.all(requests);
    } finally { release.resolve(); await holderSettled; await pending; }
    await holder;
    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(responses.find((res) => res.status === 409)!.body.type).toBe(problem('staff-role-rule'));
    expect(await ctx.prisma.user.count({ where: { staffRole: 'admin' } })).toBe(1);
    const losingTarget = responses[0].status === 409 ? other.userId : adminId;
    expect(await row(losingTarget)).toEqual(before.get(losingTarget));
    expect((await row(responses[0].status === 200 ? other.userId : adminId)).staffRole).toBe('editor');
  });
  it('B1#29: grantAdminByEmail grants a verified user; unverified and unknown outcomes change nothing', async () => {
    const verified = await seedUser(ctx.prisma, { verified: true }); const unverified = await seedUser(ctx.prisma);
    expect(await staff.grantAdminByEmail(`  ${verified.email.toUpperCase()} `)).toBe('granted');
    expect((await row(verified.userId)).staffRole).toBe('admin');
    const before = await ctx.prisma.user.findMany({ orderBy: { email: 'asc' } });
    expect(await staff.grantAdminByEmail(unverified.email)).toBe('unverified');
    expect(await staff.grantAdminByEmail('nobody@example.com')).toBe('not_found');
    expect(await ctx.prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(before);
  });
  it('B1#27: email lookup normalizes exact matches and missing users return 404 on GET and PUT', async () => {
    const target = await row(adminId);
    const found = await ctx.http().get('/v1/admin/users').query({ email: `  ${target.email.toUpperCase()} ` }).set(auth());
    expect(found.status).toBe(200);
    expect(found.body).toEqual({ id: adminId, email: target.email, email_verified: true, staff_role: 'admin' });
    for (const request of [() => ctx.http().get('/v1/admin/users').query({ email: 'nobody@example.com' }).set(auth()), () => put(randomUUID(), 'editor')]) {
      const res = await request(); expect(res.status).toBe(404); expect(res.body.type).toBe(problem('not-found'));
    }
  });
  it('B1#26: staff pages use email order, page_size 1 and opaque next_page_token, excluding learners', async () => {
    await seedUser(ctx.prisma, { email: 'a@example.com', verified: true, staffRole: 'editor' });
    await seedUser(ctx.prisma, { email: 'z@example.com', verified: true, staffRole: 'admin' });
    await seedUser(ctx.prisma, { email: 'learner@example.com', verified: true });
    const expected = await ctx.prisma.user.findMany({ where: { staffRole: { not: null } }, orderBy: { email: 'asc' } });
    const items: Array<{ id: string; email: string }> = []; let pageToken: string | null = null;
    for (let i = 0; i < expected.length; i++) {
      const res = await ctx.http().get('/v1/admin/staff').set(auth()).query({ page_size: 1, ...(pageToken ? { page_token: pageToken } : {}) });
      expect(res.status).toBe(200); expect(res.body.items).toHaveLength(1);
      items.push(...res.body.items); pageToken = res.body.next_page_token;
      expect(pageToken).toEqual(i === expected.length - 1 ? null : expect.any(String));
    }
    expect(items.map(({ id }) => id)).toEqual(expected.map(({ id }) => id));
    const defaults = await ctx.http().get('/v1/admin/staff').set(auth());
    expect(defaults.status).toBe(200); expect(defaults.body.items).toHaveLength(3);
  });
  it('B1#27: malformed inputs return 400 validation-failed with no user changes (Review Focus #3)', async () => {
    const before = await ctx.prisma.user.findMany({ orderBy: { email: 'asc' } });
    for (const request of [() => put('not-a-uuid', 'editor'), () => put(adminId, 'owner'),
      () => ctx.http().put(`/v1/admin/users/${adminId}/staff-role`).set(auth()).send({}),
      () => ctx.http().put(`/v1/admin/users/${adminId}/staff-role`).set(auth()).send({ staff_role: 'admin', extra: true }),
      () => ctx.http().put(`/v1/admin/users/${adminId}/staff-role`).set(auth()).set('Content-Type', 'application/json').send('{'),
      ...[{ page_size: 0 }, { page_size: 101 }, { page_size: 'bad' }, { page_size: 1.5 }, { extra: 1 }, { page_token: 'bad' }]
        .map((query) => () => ctx.http().get('/v1/admin/staff').set(auth()).query(query)),
      ...[{}, { email: 'bad' }, { email: 'a@example.com', extra: true }]
        .map((query) => () => ctx.http().get('/v1/admin/users').set(auth()).query(query)),
    ]) {
      const res = await request();
      expect(res.status).toBe(400); expect(res.body.type).toBe(problem('validation-failed'));
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.operation_id).toEqual(expect.any(String));
      expect(await ctx.prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(before);
    }
  });
});
