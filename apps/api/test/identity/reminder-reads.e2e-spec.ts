import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { IdentityService } from '../../src/identity/profile/identity.service.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('identity reads for reminders (e2e, isolated database)', () => {
  let ctx: TestApp;
  let identity: IdentityService;
  const listAll = async (limit: number) => {
    const seen: Awaited<ReturnType<IdentityService['listReminderCandidates']>> = [];
    let afterUserId: string | null = null;
    for (;;) {
      const page = await identity.listReminderCandidates({ afterUserId, limit });
      expect(page.length).toBeLessThanOrEqual(limit);
      seen.push(...page);
      if (page.length < limit) return seen;
      afterUserId = page[page.length - 1].userId;
    }
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    identity = ctx.app.get(IdentityService);
  });
  beforeEach(async () => {
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T08:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('D36: unverified users are never listed; neither are inactive accounts', async () => {
    const verified = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'en' });
    await seedUser(ctx.prisma, { verified: false });
    const inactive = await seedUser(ctx.prisma, { verified: true });
    await ctx.prisma.user.update({ where: { id: inactive.userId }, data: { status: 'disabled' } });
    const row = await ctx.prisma.user.findUniqueOrThrow({ where: { id: verified.userId } });
    expect(await identity.listReminderCandidates({ afterUserId: null, limit: 10 })).toEqual([{
      userId: verified.userId, timezone: 'Asia/Ho_Chi_Minh', nativeLanguage: 'en', createdAt: row.createdAt, lastSeenAt: null,
    }]);
  });

  it('lastSeenAt is the latest last_used_at over the user\'s chains and moves after POST /v1/auth/refresh', async () => {
    const user = await seedUser(ctx.prisma, { verified: true });
    const lastSeen = async () => (await identity.listReminderCandidates({ afterUserId: null, limit: 10 }))[0].lastSeenAt;
    const phone = await startSession(ctx, user.userId);
    ctx.clock.set(new Date('2026-10-17T09:00:00Z'));
    await startSession(ctx, user.userId, 'web');
    // A revoked chain still counts: the learner was seen then.
    await ctx.prisma.sessionChain.update({ where: { id: phone.sessionChainId }, data: { revokedAt: new Date('2026-10-17T09:30:00Z') } });
    expect(await lastSeen()).toEqual(new Date('2026-10-17T09:00:00Z'));

    const tablet = await startSession(ctx, user.userId);
    ctx.clock.set(new Date('2026-10-18T07:15:00Z'));
    const res = await ctx.http().post('/v1/auth/refresh').send({ refresh_token: tablet.refreshToken });
    expect(res.status).toBe(200);
    expect(await lastSeen()).toEqual(new Date('2026-10-18T07:15:00Z'));
  });

  it('verifiedEmails omits unverified and unknown ids', async () => {
    const a = await seedUser(ctx.prisma, { verified: true });
    const b = await seedUser(ctx.prisma, { verified: true });
    const unverified = await seedUser(ctx.prisma, { verified: false });
    const emails = await identity.verifiedEmails([a.userId, b.userId, unverified.userId, randomUUID(), a.userId]);
    expect(emails).toEqual(new Map([[a.userId, a.email], [b.userId, b.email]]));
    expect(await identity.verifiedEmails([])).toEqual(new Map());
  });

  it('paging by afterUserId visits every user once, ordered by id', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 7; i += 1) ids.push((await seedUser(ctx.prisma, { verified: true })).userId);
    await seedUser(ctx.prisma, { verified: false });
    for (const limit of [1, 3, 7, 50]) {
      const seen = (await listAll(limit)).map(({ userId }) => userId);
      expect(seen, `limit ${limit}`).toEqual([...ids].sort());
    }
  });
});
