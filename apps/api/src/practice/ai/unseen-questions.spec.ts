import { describe, expect, it } from 'vitest';
import type { PracticeQuestion, PrismaClient } from '../../generated/prisma/client.js';
import { findUnseen, pickUnseen } from './unseen-questions.js';

const row = (id: string, distractorSenseIds: string[] = [], createdAt = '2026-10-21T10:00:00.000Z') =>
  ({ id, distractorSenseIds, createdAt: new Date(createdAt) }) as PracticeQuestion;

function setup(rows: PracticeQuestion[], visible: string[]) {
  const wheres: unknown[] = [];
  const db = { practiceQuestion: { findMany: async (args: { where: unknown }) => { wheres.push(args); return rows; } } } as unknown as PrismaClient;
  const content = { visibleSenseIds: async () => new Set(visible) };
  return { db, content, wheres };
}

const args = { userId: 'u1', senseId: 's1', types: ['cloze', 'mcq_sentence'] as const, liveRevisionId: 'rev-2', contentKey: null };

describe('findUnseen (design §6.5, D12)', () => {
  it('B7E57, B7E58: asks only for AI questions of this sense with no item, the chosen types, the live revision and content key', async () => {
    const t = setup([], []);
    await findUnseen(t.db, t.content, { ...args, types: [...args.types], contentKey: 'key-1' });
    expect(t.wheres[0]).toEqual({
      where: {
        userId: 'u1', senseId: 's1', source: 'ai', type: { in: ['cloze', 'mcq_sentence'] }, senseRevisionId: 'rev-2', contentKey: 'key-1',
        items: { none: {} },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('B7E121: a question whose distractor is no longer visible is dropped; one with all visible is kept', async () => {
    const t = setup([row('q1', ['d1', 'gone']), row('q2', ['d1', 'd2']), row('q3')], ['d1', 'd2']);
    expect((await findUnseen(t.db, t.content, { ...args, types: [...args.types] })).map((q) => q.id)).toEqual(['q2', 'q3']);
  });

  it('no type chosen → nothing read', async () => {
    const t = setup([row('q1')], []);
    expect(await findUnseen(t.db, t.content, { ...args, types: [] })).toEqual([]);
    expect(t.wheres).toEqual([]);
  });
});

describe('pickUnseen', () => {
  it('two rows → the first (oldest, as ordered by the query); none → null', () => {
    expect(pickUnseen([row('old'), row('new')])?.id).toBe('old');
    expect(pickUnseen([])).toBeNull();
  });
});
