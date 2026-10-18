// Review probes (independent review 17/10/2026) — not part of the product suite; lives only in the review worktree.
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SettingsService } from '../../src/settings/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';

const date = (value: string) => new Date(`${value}T00:00:00Z`);

describe('review probes (learning)', () => {
  let ctx: TestApp;
  let counter = 0;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => { ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() }); });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
  });
  afterAll(async () => { await ctx?.close(); });

  it('P1: level-0 item added in UTC+14, learner moves to UTC-12: "known" changes nothing but is logged as new and uses the new cap', async () => {
    ctx.clock.set(new Date('2026-11-01T10:30:00Z')); // 2026-11-02 in Kiritimati, 2026-10-31 in Etc/GMT+12
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    await ctx.prisma.user.update({ where: { id: userId }, data: { timezone: 'Pacific/Kiritimati' } });
    const token = (await startSession(ctx, userId)).accessToken;
    const [senseId] = await seedVisibleSenses(ctx.prisma, 1, `p${(counter += 1)}`);
    const g = await ctx.http().post('/v1/groups').set(auth(token)).set('Idempotency-Key', randomUUID()).send({ name: 'G' });
    expect(g.status).toBe(201);
    const add = await ctx.http().post(`/v1/groups/${g.body.id}/items`).set(auth(token)).set('Idempotency-Key', randomUUID())
      .send({ sense_id: senseId });
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ level: 0, due_date: '2026-11-02' });

    await ctx.prisma.user.update({ where: { id: userId }, data: { timezone: 'Etc/GMT+12' } });
    const queue = await ctx.http().get(`/v1/groups/${g.body.id}/queue`).query({ mode: 'due' }).set(auth(token));
    out('P1 queue cards', JSON.stringify(queue.body.cards.map((c: { level: number; due_date: string; section: string }) =>
      ({ level: c.level, due_date: c.due_date, section: c.section }))));
    const results = [];
    for (let i = 0; i < 3; i += 1) {
      const r = await ctx.http().post('/v1/reviews').set(auth(token))
        .send({ item_id: add.body.item_id, group_id: g.body.id, answer: 'known', review_id: randomUUID() });
      results.push({ status: r.status, level: r.body.level, due_date: r.body.due_date, section: r.body.section });
    }
    out('P1 three known answers', JSON.stringify(results));
    const logs = await ctx.prisma.learningLogEntry.findMany({ where: { userId, kind: 'review' }, select: { section: true, wasDue: true } });
    out('P1 log rows', JSON.stringify(logs));
    const groups = await ctx.http().get('/v1/groups').set(auth(token));
    out('P1 group today', JSON.stringify(groups.body.items[0].today));
  });

  it('P2: a priority item overdue more than the backlog days is counted as priority AND backlog, listed in both', async () => {
    ctx.clock.set(new Date('2026-11-08T03:00:00Z'));
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const [senseId] = await seedVisibleSenses(ctx.prisma, 1, `p${(counter += 1)}`);
    const group = await ctx.prisma.learningGroup.create({ data: { userId, name: 'G', nameKey: 'g', createdAt: new Date(), updatedAt: new Date() } });
    const item = await ctx.prisma.learningItem.create({ data: {
      userId, senseId, level: 1, dueDate: date('2026-09-01'), priority: true, createdAt: new Date(),
    } });
    await ctx.prisma.groupItem.create({ data: { groupId: group.id, itemId: item.id, addedAt: new Date() } });
    const groups = await ctx.http().get('/v1/groups').set(auth(token));
    out('P2 group', JSON.stringify({ today: groups.body.items[0].today, backlog: groups.body.items[0].backlog }));
    const queue = await ctx.http().get(`/v1/groups/${group.id}/queue`).query({ mode: 'due' }).set(auth(token));
    out('P2 queue sections', JSON.stringify(queue.body.cards.map((c: { section: string }) => c.section)));
    const backlog = await ctx.http().get(`/v1/groups/${group.id}/backlog`).set(auth(token));
    out('P2 backlog items', backlog.status, backlog.body.items?.length);
  });

  it('P3: bulk add with 2,005 matching nouns into an empty group reports skipped_group_full', async () => {
    ctx.clock.set(new Date('2026-11-08T03:00:00Z'));
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    await seedVisibleSenses(ctx.prisma, 2005, `p${(counter += 1)}`);
    const group = await ctx.prisma.learningGroup.create({ data: { userId, name: 'G', nameKey: 'g', createdAt: new Date(), updatedAt: new Date() } });
    const r = await ctx.http().post(`/v1/groups/${group.id}/items/bulk`).set(auth(token)).set('Idempotency-Key', randomUUID())
      .send({ pos: 'noun' });
    out('P3 bulk', r.status, JSON.stringify(r.body), 'stored', await ctx.prisma.groupItem.count({ where: { groupId: group.id } }));
  }, 120_000);

  it('P4: answering backlog items in mode=all uses up the due cap', async () => {
    ctx.clock.set(new Date('2026-11-08T03:00:00Z'));
    const today = '2026-11-08';
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const settings = ctx.app.get(SettingsService);
    const { version } = await settings.current();
    await settings.update(randomUUID(), version, { learning: { reviews_per_group_per_day: 10 } } as never);
    const ids = await seedVisibleSenses(ctx.prisma, 11, `p${(counter += 1)}`);
    const group = await ctx.prisma.learningGroup.create({ data: { userId, name: 'G', nameKey: 'g', createdAt: new Date(), updatedAt: new Date() } });
    const items = await Promise.all(ids.map((senseId, i) => ctx.prisma.learningItem.create({ data: {
      userId, senseId, level: i < 10 ? 3 : 2, dueDate: date(i < 10 ? '2026-08-30' : today), createdAt: new Date(),
    } })));
    await ctx.prisma.groupItem.createMany({ data: items.map((item) => ({ groupId: group.id, itemId: item.id, addedAt: new Date() })) });
    const before = (await ctx.http().get('/v1/groups').set(auth(token))).body.items[0];
    for (const item of items.slice(0, 10)) {
      await ctx.http().post('/v1/reviews').set(auth(token))
        .send({ item_id: item.id, group_id: group.id, answer: 'known', review_id: randomUUID() });
    }
    const after = (await ctx.http().get('/v1/groups').set(auth(token))).body.items[0];
    const queue = await ctx.http().get(`/v1/groups/${group.id}/queue`).query({ mode: 'due' }).set(auth(token));
    out('P4 before', JSON.stringify({ today: before.today, backlog: before.backlog }), 'after', JSON.stringify({ today: after.today, backlog: after.backlog }),
      'due cards now', queue.body.cards.filter((c: { section: string }) => c.section === 'due').length);
  });
});
