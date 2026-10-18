import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedUser } from './auth-helpers.js';

export type PracticeItemState = { level?: number; dueDate?: string; priority?: boolean };

/** A verified learner (Asia/Ho_Chi_Minh) with a native language. */
export async function seedPracticeUser(prisma: PrismaClient, nativeLanguage: 'vi' | 'en' = 'vi'): Promise<string> {
  return (await seedUser(prisma, { verified: true, nativeLanguage })).userId;
}

/**
 * A group of the learner holding the given senses, creating each learning item the learner does not have yet. Items added in
 * the order given, one second apart, so "earliest added" is that order.
 */
export async function seedPracticeGroup(
  prisma: PrismaClient, userId: string, name: string, senseIds: string[],
  state: (index: number) => PracticeItemState = () => ({}), at = new Date('2026-11-01T03:00:00Z'),
): Promise<string> {
  const group = await prisma.learningGroup.create({
    data: { userId, name, nameKey: name.toLowerCase(), createdAt: at, updatedAt: at }, select: { id: true },
  });
  const existing = new Map((await prisma.learningItem.findMany({
    where: { userId, senseId: { in: senseIds } }, select: { id: true, senseId: true },
  })).map(({ id, senseId }) => [senseId, id]));
  const fresh = senseIds.filter((senseId) => !existing.has(senseId)).map((senseId) => {
    const { level, dueDate, priority } = state(senseIds.indexOf(senseId));
    return {
      id: randomUUID(), userId, senseId, level: level ?? 0, dueDate: new Date(`${dueDate ?? '2026-11-01'}T00:00:00Z`),
      priority: priority ?? false, createdAt: at,
    };
  });
  await prisma.learningItem.createMany({ data: fresh });
  for (const { id, senseId } of fresh) existing.set(senseId, id);
  await prisma.groupItem.createMany({ data: senseIds.map((senseId, index) => ({
    groupId: group.id, itemId: existing.get(senseId)!, addedAt: new Date(at.getTime() + index * 1000),
  })) });
  return group.id;
}
