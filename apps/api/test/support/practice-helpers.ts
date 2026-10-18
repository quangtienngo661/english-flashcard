import { randomUUID } from 'node:crypto';
import type { Response } from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { localDate } from '../../src/common/time/local-date.js';
import { seedUser, startSession } from './auth-helpers.js';
import type { TestApp } from './create-test-app.js';
import { seedPracticeSense } from './seed-practice.js';

// Access tokens expire on the test clock: a token is reused only while the clock stays within 10 minutes of its issue.
const tokens = new Map<string, { token: string; at: number }>();
async function tokenOf(t: TestApp, userId: string): Promise<string> {
  const now = t.clock.now().getTime();
  const known = tokens.get(userId);
  if (known && now >= known.at && now - known.at < 600_000) return known.token;
  const token = (await startSession(t, userId)).accessToken;
  tokens.set(userId, { token, at: now });
  return token;
}

/** An authenticated practice request; writes carry a fresh Idempotency-Key unless one is given. */
export async function practiceRequest(
  t: TestApp, userId: string, method: 'get' | 'post', path: string, body?: object, key: string | null = randomUUID(),
): Promise<Response> {
  const call = t.http()[method](`/v1/practice${path}`).set('Authorization', `Bearer ${await tokenOf(t, userId)}`);
  if (method === 'post' && key !== null) call.set('Idempotency-Key', key);
  return method === 'post' ? call.send(body ?? {}) : call;
}

export function startPractice(t: TestApp, userId: string, body: object, key?: string): Promise<Response> {
  return practiceRequest(t, userId, 'post', '/sessions', body, key);
}

export function nextItem(t: TestApp, userId: string, sessionId: string): Promise<Response> {
  return practiceRequest(t, userId, 'post', `/sessions/${sessionId}/next`);
}

/** Writes a final result by SQL (as the answer route would), so session tests can move on without it. */
export async function finalizeItem(
  prisma: PrismaClient, itemId: string, result: 'correct' | 'wrong', opts: { hintLevel?: number; at?: Date } = {},
): Promise<void> {
  const at = opts.at ?? new Date('2026-11-08T03:00:00Z');
  await prisma.practiceSessionItem.update({ where: { id: itemId }, data: {
    result, answeredAt: at, hintLevel: opts.hintLevel ?? 0, localDate: new Date(`${localDate('Asia/Ho_Chi_Minh', at)}T00:00:00Z`),
    answerRaw: result, answerNormalized: result,
  } });
}

/**
 * A learner with one group per entry of `groups` (name → lemmas), each lemma a fresh catalog sense with a Vietnamese gloss.
 * Lemmas must be unique per suite. Returns the sense id of every lemma.
 */
export async function seedPracticeLearner(
  prisma: PrismaClient, groups: Record<string, string[]>, state: (lemma: string) => PracticeItemState = () => ({}),
  nativeLanguage: 'vi' | 'en' = 'vi',
): Promise<{ userId: string; groupIds: Record<string, string>; senses: Record<string, string> }> {
  const userId = await seedPracticeUser(prisma, nativeLanguage);
  const senses: Record<string, string> = {};
  const groupIds: Record<string, string> = {};
  for (const [name, lemmas] of Object.entries(groups)) {
    for (const lemma of lemmas) {
      senses[lemma] ??= (await seedPracticeSense(prisma, { lemma, glossVi: `nghĩa của ${lemma}` })).senseId;
    }
    groupIds[name] = await seedPracticeGroup(prisma, userId, name, lemmas.map((l) => senses[l]), (i) => state(lemmas[i]));
  }
  return { userId, groupIds, senses };
}

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
