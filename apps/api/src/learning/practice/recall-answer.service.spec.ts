import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { RecallAnswerService } from './recall-answer.service.js';

const userId = '00000000-0000-4000-8000-000000000001';
const senseId = '00000000-0000-4000-8000-0000000000a1';
const itemId = '00000000-0000-4000-8000-0000000000a2';
const groupId = '00000000-0000-4000-8000-0000000000c1';

type ItemRow = { id: string; senseId: string; level: number; dueDate: Date; priority: boolean; lastReviewedAt: Date | null };

/** The learner's item (null = the sense is not in learning). The tx keeps the item, so two calls in a row see the first one's write. */
function setup(item: ItemRow | null) {
  const state = { item: item ? { ...item } : null };
  const locks: string[] = [];
  const tx = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      locks.push(strings.join('?'));
      return state.item ? [{ id: state.item.id }] : [];
    }),
    learningItem: {
      findUniqueOrThrow: vi.fn(async () => ({ ...state.item! })),
      update: vi.fn(async ({ data }: { data: Partial<ItemRow> }) => { Object.assign(state.item!, data); }),
    },
    learningLogEntry: { create: vi.fn(async (_args: { data: Record<string, unknown> }) => undefined) },
    learningActivityDay: { createMany: vi.fn(async () => ({ count: 1 })) },
  };
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'UTC' })) } as unknown as IdentityService;
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
  const service = new RecallAnswerService(new FakeClock(new Date('2026-11-07T03:00:00Z')), identity, settings);
  return { service, tx, locks, state, asTx: tx as unknown as Prisma.TransactionClient };
}

const row = (level: number, due: string, priority = false): ItemRow => ({
  id: itemId, senseId, level, dueDate: new Date(`${due}T00:00:00Z`), priority, lastReviewedAt: null,
});
const input = { senseId, groupId, correct: true };

describe('RecallAnswerService.recallAnswer', () => {
  it('correct on a due word: one level up, one log row carrying the group and origin "recall"', async () => {
    const { service, tx, asTx, state } = setup(row(3, '2026-11-07'));
    await expect(service.recallAnswer(asTx, userId, input)).resolves.toEqual({ outcome: 'leveled_up', level: 4, due_date: '2026-11-21' });
    expect(state.item).toMatchObject({ level: 4, priority: false });
    expect(tx.learningLogEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.learningLogEntry.create.mock.calls[0][0].data).toMatchObject({
      userId, itemId, senseId, groupId, kind: 'review', origin: 'recall', section: 'due', answer: 'known', rating: 'Good',
      levelBefore: 3, levelAfter: 4, wasDue: true, reviewId: null,
    });
  });

  it('wrong: the item is not changed, the log row says "review" / "Again"', async () => {
    const { service, tx, asTx, state } = setup(row(3, '2026-11-07'));
    await expect(service.recallAnswer(asTx, userId, { ...input, correct: false })).resolves.toEqual({
      outcome: 'kept', level: 3, due_date: '2026-11-07' });
    expect(tx.learningItem.update).not.toHaveBeenCalled();
    expect(state.item).toMatchObject({ level: 3 });
    expect(tx.learningLogEntry.create.mock.calls[0][0].data).toMatchObject({
      answer: 'review', rating: 'Again', levelBefore: 3, levelAfter: 3, origin: 'recall', groupId });
  });

  it('a word that is not due yet keeps its level on a correct answer', async () => {
    const { service, asTx } = setup(row(3, '2026-11-20'));
    await expect(service.recallAnswer(asTx, userId, input)).resolves.toEqual({ outcome: 'kept', level: 3, due_date: '2026-11-20' });
  });

  it('DC26: correct on a priority word only clears the flag', async () => {
    const { service, asTx, state } = setup(row(1, '2026-11-07', true));
    await expect(service.recallAnswer(asTx, userId, input)).resolves.toEqual({ outcome: 'kept', level: 1, due_date: '2026-11-08' });
    expect(state.item).toMatchObject({ level: 1, priority: false });
  });

  it('a sense that is no longer in learning writes nothing', async () => {
    const { service, tx, asTx } = setup(null);
    await expect(service.recallAnswer(asTx, userId, input)).resolves.toEqual({ outcome: 'not-in-learning' });
    expect(tx.learningLogEntry.create).not.toHaveBeenCalled();
    expect(tx.learningItem.update).not.toHaveBeenCalled();
  });

  it('does not write the activity day: Practice writes it with the final answer', async () => {
    const { service, tx, asTx } = setup(row(3, '2026-11-07'));
    await service.recallAnswer(asTx, userId, input);
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('two tabs answering the same due word: the item is locked first, and the second call finds it not due', async () => {
    const { service, locks, asTx, state, tx } = setup(row(3, '2026-11-07'));
    const first = await service.recallAnswer(asTx, userId, input);
    const second = await service.recallAnswer(asTx, userId, input);
    expect(first).toMatchObject({ outcome: 'leveled_up', level: 4 });
    expect(second).toMatchObject({ outcome: 'kept', level: 4 });
    expect(state.item!.level).toBe(4);
    expect(tx.learningItem.update).toHaveBeenCalledTimes(1);
    expect(locks).toHaveLength(2);
    for (const sql of locks) expect(sql).toMatch(/FOR UPDATE/);
  });
});
