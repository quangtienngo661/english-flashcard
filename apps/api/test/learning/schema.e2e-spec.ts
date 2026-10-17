import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const at = new Date('2026-11-01T03:00:00Z');
const day = new Date('2026-11-01');

describe('learning schema (e2e, isolated database)', () => {
  let ctx: TestApp;
  const group = (userId: string, name: string) => ctx.prisma.learningGroup.create({
    data: { userId, name, nameKey: name.toLowerCase(), createdAt: at, updatedAt: at },
  });
  const item = (userId: string, senseId: string, level = 0) => ctx.prisma.learningItem.create({
    data: { userId, senseId, level, dueDate: day, createdAt: at },
  });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  afterAll(async () => { await ctx?.close(); });

  it('schema: names unique per learner case-insensitively, one item per (learner, sense), deleting an item cascades its group links and keeps its log rows', async () => {
    const learner = randomUUID();
    const other = randomUUID();
    await group(learner, 'Food');
    await expect(group(learner, 'food')).rejects.toMatchObject({ code: 'P2002' });
    // Another learner may use the same name.
    await expect(group(other, 'food')).resolves.toMatchObject({ userId: other, nameKey: 'food' });

    const senseId = randomUUID();
    const first = await item(learner, senseId);
    await expect(item(learner, senseId)).rejects.toMatchObject({ code: 'P2002' });
    await expect(item(other, senseId)).resolves.toMatchObject({ userId: other, senseId });

    const a = await group(learner, 'A');
    const b = await group(learner, 'B');
    await ctx.prisma.groupItem.createMany({ data: [
      { groupId: a.id, itemId: first.id, addedAt: at }, { groupId: b.id, itemId: first.id, addedAt: at },
    ] });
    await ctx.prisma.learningLogEntry.create({ data: {
      userId: learner, itemId: first.id, senseId, groupId: a.id, kind: 'item_added', localDate: day, at,
    } });

    await ctx.prisma.learningItem.delete({ where: { id: first.id } });
    expect(await ctx.prisma.groupItem.count({ where: { itemId: first.id } })).toBe(0);
    expect(await ctx.prisma.learningGroup.count({ where: { id: { in: [a.id, b.id] } } })).toBe(2);
    expect(await ctx.prisma.learningLogEntry.findMany({ where: { itemId: first.id } }))
      .toEqual([expect.objectContaining({ kind: 'item_added', groupId: a.id, senseId })]);
  });

  it('schema: level outside 0–5, an unknown log kind and a repeated review_id are refused', async () => {
    const learner = randomUUID();
    await expect(item(learner, randomUUID(), 6)).rejects.toThrow();
    await expect(item(learner, randomUUID(), -1)).rejects.toThrow();
    const log = (data: { kind?: string; reviewId?: string | null }) => ctx.prisma.learningLogEntry.create({ data: {
      userId: learner, itemId: randomUUID(), senseId: randomUUID(), kind: data.kind ?? 'review',
      reviewId: data.reviewId ?? null, localDate: day, at,
    } });
    await expect(log({ kind: 'deleted' })).rejects.toThrow();
    const reviewId = randomUUID();
    await log({ reviewId });
    await expect(log({ reviewId })).rejects.toMatchObject({ code: 'P2002' });
    // Rows without a review_id never collide.
    await log({ kind: 'item_added' });
    await log({ kind: 'item_added' });
  });
});
