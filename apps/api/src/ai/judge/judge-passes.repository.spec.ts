import { describe, expect, it, vi } from 'vitest';
import { JudgePassesRepository, type NewPass } from './judge-passes.repository.js';

const NOW = new Date('2026-10-30T03:00:00Z');
const R2 = '22222222-2222-4222-8222-222222222222';
const RUN = '33333333-3333-4333-8333-333333333333';
const ADMIN = '11111111-1111-4111-8111-111111111111';
const P1 = '44444444-4444-4444-8444-444444444444';
const P2 = '55555555-5555-4555-8555-555555555555';

const PASS: NewPass = {
  judgeRevisionId: R2, kind: 'eval_run', operation: 'generate_cloze', evalRunId: RUN, filters: null, limit: null, status: 'queued', total: 2, startedBy: ADMIN,
};
const ITEMS = [
  { position: 0, subjectKind: 'eval_item' as const, subjectId: 'a', input: { word: 'x' }, output: { sentence: 'y' }, context: null },
  { position: 1, subjectKind: 'real_question' as const, subjectId: 'b', input: { word: 'z' }, output: { sentence: 'w' }, context: { session_words: ['k'] } },
];

function setup() {
  const tx = {
    aiJudgePass: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: P1, ...data })) },
    aiJudgePassItem: { createMany: vi.fn(async (_args: { data: Array<Record<string, unknown>> }) => ({ count: 0 })) },
  };
  const prisma = {
    ...tx,
    aiJudgeScore: { groupBy: vi.fn(async (_args: unknown) => [] as Array<{ passId: string; subjectId: string }>) },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  return { repo: new JudgePassesRepository(prisma as never), prisma, tx };
}

describe('JudgePassesRepository.create (B15, B16)', () => {
  it('writes the pass and its items in one transaction, the items numbered and without a plain null context', async () => {
    const { repo, prisma, tx } = setup();
    await expect(repo.create(PASS, ITEMS, NOW)).resolves.toBe(P1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.aiJudgePass.create).toHaveBeenCalledExactlyOnceWith({ data: {
      judgeRevisionId: R2, kind: 'eval_run', operation: 'generate_cloze', evalRunId: RUN, status: 'queued', total: 2, startedBy: ADMIN,
    } });
    expect(tx.aiJudgePassItem.createMany).toHaveBeenCalledExactlyOnceWith({ data: [
      { passId: P1, position: 0, subjectKind: 'eval_item', subjectId: 'a', input: { word: 'x' }, output: { sentence: 'y' } },
      { passId: P1, position: 1, subjectKind: 'real_question', subjectId: 'b', input: { word: 'z' }, output: { sentence: 'w' }, context: { session_words: ['k'] } },
    ] });
    expect(tx.aiJudgePass.create.mock.invocationCallOrder[0]!).toBeLessThan(tx.aiJudgePassItem.createMany.mock.invocationCallOrder[0]!);
  });

  it('a real pass keeps its filters and its limit; a pass with no subject has no items statement and ends at once', async () => {
    const { repo, tx } = setup();
    await repo.create({ ...PASS, kind: 'real', evalRunId: null, filters: { operation: 'generate_cloze', limit: 200 }, limit: 200, status: 'finished', total: 0 }, [], NOW);
    expect(tx.aiJudgePass.create).toHaveBeenCalledExactlyOnceWith({ data: {
      judgeRevisionId: R2, kind: 'real', operation: 'generate_cloze', evalRunId: null, filters: { operation: 'generate_cloze', limit: 200 }, limit: 200,
      status: 'finished', total: 0, startedBy: ADMIN, startedAt: NOW, finishedAt: NOW,
    } });
    expect(tx.aiJudgePassItem.createMany).not.toHaveBeenCalled();
  });

  it('the unique index of B16 reaches the caller as the P2002 it is', async () => {
    const { repo, tx } = setup();
    tx.aiJudgePass.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(repo.create(PASS, ITEMS, NOW)).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('JudgePassesRepository.unjudgedCounts', () => {
  it('counts, per pass, the subjects that have a score without a verdict', async () => {
    const { repo, prisma } = setup();
    prisma.aiJudgeScore.groupBy.mockResolvedValue([
      { passId: P1, subjectId: 'a' }, { passId: P1, subjectId: 'b' }, { passId: P2, subjectId: 'c' },
    ]);
    const counts = await repo.unjudgedCounts([P1, P2, '66666666-6666-4666-8666-666666666666']);
    expect(counts).toEqual(new Map([[P1, 2], [P2, 1]]));
    expect(prisma.aiJudgeScore.groupBy).toHaveBeenCalledExactlyOnceWith({
      by: ['passId', 'subjectId'], where: { passId: { in: [P1, P2, '66666666-6666-4666-8666-666666666666'] }, verdict: null },
    });
  });

  it('no pass → an empty map and no query', async () => {
    const { repo, prisma } = setup();
    await expect(repo.unjudgedCounts([])).resolves.toEqual(new Map());
    expect(prisma.aiJudgeScore.groupBy).not.toHaveBeenCalled();
  });
});
