import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const now = new Date('2026-11-01T03:00:00Z');
const day = new Date('2026-11-01');

describe('learning groups (e2e, isolated database)', () => {
  let ctx: TestApp;
  const signIn = async (profileComplete = true) => {
    const user = await seedUser(ctx.prisma, { verified: true, nativeLanguage: profileComplete ? 'vi' : undefined });
    return { ...user, token: (await startSession(ctx, user.userId)).accessToken };
  };
  const auth = <T extends { set(name: string, value: string): T }>(request: T, token: string, write = true) => {
    const withAuth = request.set('Authorization', `Bearer ${token}`);
    return write ? withAuth.set('Idempotency-Key', randomUUID()) : withAuth;
  };
  const create = (token: string, name: unknown) => auth(ctx.http().post('/v1/groups'), token).send({ name });
  const rename = (token: string, id: string, body: object) => auth(ctx.http().patch(`/v1/groups/${id}`), token).send(body);
  const read = (token: string, id: string) => auth(ctx.http().get(`/v1/groups/${id}`), token, false);
  const remove = (token: string, id: string) => auth(ctx.http().delete(`/v1/groups/${id}`), token);
  const groupsOf = (userId: string) => ctx.prisma.learningGroup.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  const seedItem = async (userId: string, groupIds: string[]) => {
    const item = await ctx.prisma.learningItem.create({
      data: { userId, senseId: randomUUID(), level: 0, dueDate: day, createdAt: now },
    });
    await ctx.prisma.groupItem.createMany({ data: groupIds.map((groupId) => ({ groupId, itemId: item.id, addedAt: now })) });
    return item;
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('creates a group with the trimmed NFC name, version 0 and no items; a new learner has no group (D43)', async () => {
    const learner = await signIn();
    expect(await groupsOf(learner.userId)).toEqual([]);
    const created = await create(learner.token, '  Café  ');
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String), name: 'Café', version: 0, item_count: 0,
      created_at: now.toISOString(), updated_at: now.toISOString(),
    });
    const [row] = await groupsOf(learner.userId);
    expect(row).toMatchObject({ id: created.body.id, name: 'Café', nameKey: 'café', version: 0 });
  });

  it('B3E7: two renames with one version → the second 409 version-conflict, the stored name is the first', async () => {
    const learner = await signIn();
    const { body: group } = await create(learner.token, 'Travel');
    const first = await rename(learner.token, group.id, { name: 'Trips', version: 0 });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ id: group.id, name: 'Trips', version: 1 });
    const second = await rename(learner.token, group.id, { name: 'Journeys', version: 0 });
    expect(second.status).toBe(409);
    expect(second.body.type).toBe(problem('version-conflict'));
    const [row] = await groupsOf(learner.userId);
    expect(row).toMatchObject({ name: 'Trips', nameKey: 'trips', version: 1 });
  });

  it('B3E18/B3#13: deleting group A removes from learning exactly the items in no other group, keeps items also in B, logs item_removed for each, and GET before delete reported that number', async () => {
    const learner = await signIn();
    const { body: a } = await create(learner.token, 'A');
    const { body: b } = await create(learner.token, 'B');
    const onlyA1 = await seedItem(learner.userId, [a.id]);
    const onlyA2 = await seedItem(learner.userId, [a.id]);
    const shared = await seedItem(learner.userId, [a.id, b.id]);
    const onlyB = await seedItem(learner.userId, [b.id]);

    const before = await read(learner.token, a.id);
    expect(before.status).toBe(200);
    expect(before.body).toMatchObject({ id: a.id, name: 'A', item_count: 3, removable_items: 2 });

    ctx.clock.set(new Date('2026-11-01T18:30:00Z')); // 2026-11-02 01:30 in Asia/Ho_Chi_Minh
    // The access token expired while the clock moved on.
    learner.token = (await startSession(ctx, learner.userId)).accessToken;
    const deleted = await remove(learner.token, a.id);
    expect(deleted.status).toBe(204);

    expect(await groupsOf(learner.userId)).toEqual([expect.objectContaining({ id: b.id })]);
    const items = await ctx.prisma.learningItem.findMany({ where: { userId: learner.userId }, orderBy: { id: 'asc' } });
    expect(items.map(({ id }) => id).sort()).toEqual([shared.id, onlyB.id].sort());
    expect((await ctx.prisma.groupItem.findMany({ where: { itemId: shared.id } })).map(({ groupId }) => groupId)).toEqual([b.id]);
    const log = await ctx.prisma.learningLogEntry.findMany({ where: { userId: learner.userId } });
    expect(log).toHaveLength(2);
    expect(log).toEqual(expect.arrayContaining([onlyA1, onlyA2].map((item) => expect.objectContaining({
      itemId: item.id, senseId: item.senseId, groupId: a.id, kind: 'item_removed', levelBefore: 0,
      dueBefore: day, localDate: new Date('2026-11-02'), at: new Date('2026-11-01T18:30:00Z'),
    }))));

    expect((await read(learner.token, a.id)).status).toBe(404);
  });

  it('D43: the learner\'s only group can be renamed and deleted', async () => {
    const learner = await signIn();
    const { body: group } = await create(learner.token, 'Only');
    await seedItem(learner.userId, [group.id]);
    expect((await rename(learner.token, group.id, { name: 'Still only', version: 0 })).status).toBe(200);
    expect((await remove(learner.token, group.id)).status).toBe(204);
    expect(await groupsOf(learner.userId)).toEqual([]);
    expect(await ctx.prisma.learningItem.count({ where: { userId: learner.userId } })).toBe(0);
  });

  it('the 101st group → 409 group-limit-reached', async () => {
    const learner = await signIn();
    await ctx.prisma.learningGroup.createMany({ data: Array.from({ length: 99 }, (_, i) => ({
      userId: learner.userId, name: `g${i}`, nameKey: `g${i}`, createdAt: now, updatedAt: now,
    })) });
    expect((await create(learner.token, 'Hundredth')).status).toBe(201);
    const refused = await create(learner.token, 'One too many');
    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(problem('group-limit-reached'));
    expect(await ctx.prisma.learningGroup.count({ where: { userId: learner.userId } })).toBe(100);
    // Another learner is not affected.
    expect((await create((await signIn()).token, 'One too many')).status).toBe(201);
  });

  it('name 60 code points ok, 61 → 400, blank → 400, "Food" next to "food" → 409 group-name-taken', async () => {
    const learner = await signIn();
    const sixty = '😀'.repeat(60); // 120 UTF-16 units, 60 code points
    expect((await create(learner.token, sixty)).status).toBe(201);
    for (const name of ['😀'.repeat(61), '   ', '', 42, null]) {
      const refused = await create(learner.token, name);
      expect(refused.status).toBe(400);
      expect(refused.body.type).toBe(problem('validation-failed'));
    }
    const { body: food } = await create(learner.token, 'Food');
    const taken = await create(learner.token, 'food');
    expect(taken.status).toBe(409);
    expect(taken.body.type).toBe(problem('group-name-taken'));
    // Composition does not make a new name either.
    await create(learner.token, 'Café');
    expect((await create(learner.token, 'Café')).body.type).toBe(problem('group-name-taken'));
    // Renaming onto another group's name is refused; renaming a group to its own name in another case is not.
    const { body: drinks } = await create(learner.token, 'Drinks');
    expect((await rename(learner.token, drinks.id, { name: 'FOOD', version: 0 })).body.type).toBe(problem('group-name-taken'));
    expect((await rename(learner.token, food.id, { name: 'FOOD', version: 0 })).body).toMatchObject({ name: 'FOOD', version: 1 });
    expect(await ctx.prisma.learningGroup.count({ where: { userId: learner.userId } })).toBe(4);
  });

  it('B3#12 (groups): another learner\'s group id → 404 on every route', async () => {
    const owner = await signIn();
    const stranger = await signIn();
    const { body: group } = await create(owner.token, 'Mine');
    await seedItem(owner.userId, [group.id]);
    for (const response of [
      await read(stranger.token, group.id),
      await rename(stranger.token, group.id, { name: 'Taken over', version: 0 }),
      await remove(stranger.token, group.id),
      await read(stranger.token, randomUUID()),
    ]) {
      expect(response.status).toBe(404);
      expect(response.body.type).toBe(problem('not-found'));
    }
    expect(await groupsOf(owner.userId)).toEqual([expect.objectContaining({ name: 'Mine', version: 0 })]);
    expect(await ctx.prisma.learningItem.count({ where: { userId: owner.userId } })).toBe(1);
  });

  it('a learner without a native language → 403 profile-incomplete; a write without Idempotency-Key → 400', async () => {
    const incomplete = await signIn(false);
    const refused = await create(incomplete.token, 'Food');
    expect(refused.status).toBe(403);
    expect(refused.body.type).toBe(problem('profile-incomplete'));
    const learner = await signIn();
    const noKey = await ctx.http().post('/v1/groups').set('Authorization', `Bearer ${learner.token}`).send({ name: 'Food' });
    expect(noKey.status).toBe(400);
    expect(await ctx.prisma.learningGroup.count()).toBe(0);
  });
  it('T-C5: two creates sent at the same moment when the learner has 99 groups → one 201, one 409 group-limit-reached, 100 stored', async () => {
    const learner = await signIn();
    await ctx.prisma.learningGroup.createMany({ data: Array.from({ length: 99 }, (_, i) => ({
      userId: learner.userId, name: `g${i}`, nameKey: `g${i}`, createdAt: now, updatedAt: now,
    })) });
    const results = await Promise.all([create(learner.token, 'One'), create(learner.token, 'Two')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.type).toBe(problem('group-limit-reached'));
    expect(await ctx.prisma.learningGroup.count({ where: { userId: learner.userId } })).toBe(100);
  });

  it('L4: deleting a group waits for a review in progress on one of its items and logs the reviewed level', async () => {
    const learner = await signIn();
    const { body: group } = await create(learner.token, 'Only');
    const item = await seedItem(learner.userId, [group.id]);
    let locked!: () => void;
    let release!: () => void;
    const lockTaken = new Promise<void>((resolve) => { locked = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const review = ctx.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM learning_items WHERE id = ${item.id}::uuid FOR UPDATE`;
      await tx.learningItem.update({ where: { id: item.id }, data: { level: 1, dueDate: new Date('2026-11-02') } });
      locked();
      await gate;
    }, { timeout: 30_000, maxWait: 5_000 });
    await lockTaken;
    let settled = false;
    const pending = remove(learner.token, group.id).then((response) => { settled = true; return response; });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(settled).toBe(false);
    release();
    await review;
    expect((await pending).status).toBe(204);
    expect(await ctx.prisma.learningLogEntry.findMany({ where: { itemId: item.id } })).toEqual([
      expect.objectContaining({ kind: 'item_removed', levelBefore: 1, dueBefore: new Date('2026-11-02') }),
    ]);
  });
});
