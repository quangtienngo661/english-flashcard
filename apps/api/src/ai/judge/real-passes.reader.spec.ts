import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RealPassesReader } from './real-passes.reader.js';

const J = '11111111-1111-4111-8111-111111111111';
const R1 = '21111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const P = '33333333-3333-4333-8333-333333333333';
const P_RUN = '34444444-4444-4444-8444-444444444444';
const ADMIN = '99999999-9999-4999-8999-999999999999';
const Q1 = '41111111-1111-4111-8111-111111111111';
const Q2 = '42222222-2222-4222-8222-222222222222';
const CRITERIA = [{ code: 'single_answer', question: 'Chỉ một đáp án?' }, { code: 'natural', question: 'Tự nhiên?' }];

type Pass = {
  id: string; judgeRevisionId: string; kind: string; operation: string; evalRunId: string | null; filters: unknown; limit: number | null; status: string;
  error: string | null; total: number | null; judged: number; costUsd: { toFixed(digits: number): string } | null; startedBy: string; createdAt: Date;
  startedAt: Date | null; finishedAt: Date | null;
};

const NOW = new Date('2026-11-08T03:00:00.000Z');
const passRow = (over: Partial<Pass> = {}): Pass & { revision: unknown } => ({
  id: P, judgeRevisionId: R2, kind: 'real', operation: 'generate_cloze', evalRunId: null, filters: { operation: 'generate_cloze', limit: 200 }, limit: 200,
  status: 'finished', error: null, total: 2, judged: 2, costUsd: { toFixed: (digits: number) => (0.0008).toFixed(digits) }, startedBy: ADMIN, createdAt: NOW,
  startedAt: NOW, finishedAt: NOW,
  revision: { id: R2, revision: 2, criteria: CRITERIA, judge: { id: J, name: 'Chỉ một đáp án' }, model: { provider: 'anthropic', modelId: 'claude-judge' } },
  ...over,
});

function setup(init: {
  judge?: { id: string; name: string; operations: string[]; active: boolean } | null; revision?: { id: string; revision: number } | null;
  sums?: { costUsd: string | null; judged: number | null }; passes?: Array<ReturnType<typeof passRow>>; items?: unknown[]; scores?: unknown[]; labels?: unknown[];
} = {}) {
  const judge = init.judge === undefined ? { id: J, name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true } : init.judge;
  const revision = init.revision === undefined ? { id: R2, revision: 2 } : init.revision;
  const passes = init.passes ?? [passRow()];
  const prisma = {
    aiJudge: { findUnique: vi.fn(async (_args: unknown) => judge) },
    aiJudgeRevision: { findFirst: vi.fn(async (_args: unknown) => revision) },
    aiJudgePass: {
      aggregate: vi.fn(async (_args: unknown) => ({ _sum: init.sums ?? { costUsd: null, judged: null } })),
      findMany: vi.fn(async (_args: unknown) => passes),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => passes.find((row) => row.id === where.id) ?? null),
    },
    aiJudgePassItem: { findMany: vi.fn(async (_args: unknown) => init.items ?? []) },
    aiJudgeScore: { findMany: vi.fn(async (_args: unknown) => init.scores ?? []) },
    aiLabel: { findMany: vi.fn(async (_args: unknown) => init.labels ?? []) },
  };
  return { reader: new RealPassesReader(prisma as never), prisma };
}

describe('RealPassesReader.target (design §7.1)', () => {
  it('a judge with two revisions: the newest one, with its name, operations and whether it is active', async () => {
    const { reader, prisma } = setup();
    await expect(reader.target(J)).resolves.toEqual({
      judgeId: J, name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, revisionId: R2, revision: 2,
    });
    expect(prisma.aiJudgeRevision.findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { judgeId: J }, orderBy: { revision: 'desc' }, select: { id: true, revision: true },
    });
  });

  it('an unknown judge, or one with no revision → null', async () => {
    await expect(setup({ judge: null }).reader.target(J)).resolves.toBeNull();
    await expect(setup({ revision: null }).reader.target(J)).resolves.toBeNull();
  });
});

describe('RealPassesReader.costPerSubject (design §7.1 "chưa ước tính được")', () => {
  it('sums cost and judged over the revision passes that judged something and have a cost: 0.0060 over 15 subjects is exactly 0.0004', async () => {
    const { reader, prisma } = setup({ sums: { costUsd: '0.0060', judged: 15 } });
    await expect(reader.costPerSubject(R2)).resolves.toBe(0.0004);
    expect(prisma.aiJudgePass.aggregate).toHaveBeenCalledExactlyOnceWith({
      where: { judgeRevisionId: R2, judged: { gt: 0 }, costUsd: { not: null } }, _sum: { costUsd: true, judged: true },
    });
  });

  it('no pass with a cost (both sums null), or a sum of 0 judged subjects → null', async () => {
    await expect(setup({ sums: { costUsd: null, judged: null } }).reader.costPerSubject(R1)).resolves.toBeNull();
    await expect(setup({ sums: { costUsd: '0.0100', judged: 0 } }).reader.costPerSubject(R1)).resolves.toBeNull();
  });
});

describe('RealPassesReader.passes', () => {
  it('real passes only, newest first, one more than the page to know whether there is a next page', async () => {
    const { reader, prisma } = setup();
    const page = await reader.passes(20);
    expect(prisma.aiJudgePass.findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { kind: 'real' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21,
    }));
    expect(page.next_page_token).toBeNull();
    expect(page.items).toEqual([{
      id: P, judge: { id: J, name: 'Chỉ một đáp án' }, revision: 2, revision_id: R2, criteria: CRITERIA,
      judge_model: { provider: 'anthropic', model_id: 'claude-judge' }, status: 'finished', error: null, total: 2, judged: 2, cost_usd: '0.00080000',
      filters: { operation: 'generate_cloze', limit: 200 }, started_by: ADMIN, created_at: NOW.toISOString(), finished_at: NOW.toISOString(),
    }]);
  });

  it('21 rows for a page of 20 → 20 items and a token; asking with that token continues strictly after the last item of the page', async () => {
    const rows = Array.from({ length: 21 }, (_, index) => passRow({ id: `3${String(index).padStart(7, '0')}-1111-4111-8111-111111111111`, createdAt: new Date(NOW.getTime() - index * 1000) }));
    const { reader, prisma } = setup({ passes: rows });
    const page = await reader.passes(20);
    expect(page.items).toHaveLength(20);
    expect(page.next_page_token).toEqual(expect.any(String));
    await reader.passes(20, page.next_page_token!);
    const second = prisma.aiJudgePass.findMany.mock.calls[1]![0] as { where: { kind: string; OR: unknown[] } };
    expect(second.where.kind).toBe('real');
    expect(second.where.OR).toEqual([
      { createdAt: { lt: rows[19]!.createdAt } }, { createdAt: rows[19]!.createdAt, id: { lt: rows[19]!.id } },
    ]);
  });

  it('a token that was not made by this listing → 400 validation-failed', async () => {
    const { reader } = setup();
    const error = await reader.passes(20, 'not-a-token').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(400);
    expect((error as ProblemDetailsException).problemType).toBe('validation-failed');
    expect((error as ProblemDetailsException).extensions).toEqual({ violations: ['page_token: Invalid page token'] });
  });

  it('a pass with no model on its revision shows judge_model null; a pass without a cost shows cost_usd null', async () => {
    const row = passRow({ costUsd: null });
    (row.revision as { model: unknown }).model = null;
    const { reader } = setup({ passes: [row] });
    const [item] = (await reader.passes(20)).items;
    expect(item).toMatchObject({ judge_model: null, cost_usd: null });
  });
});

describe('RealPassesReader.pass', () => {
  const ITEMS = [
    { id: 'i1', passId: P, position: 0, subjectKind: 'real_question', subjectId: Q1, input: { word: 'beat' }, output: { sentence: 'We ___ them.' }, context: { session_words: ['go'] }, done: true },
    { id: 'i2', passId: P, position: 1, subjectKind: 'real_question', subjectId: Q2, input: { word: 'go' }, output: { sentence: 'I ___ home.' }, context: null, done: true },
  ];

  it("a real pass: its items by position with the scores of the pass's revision and the labels of the subject, exactly as stored", async () => {
    const { reader, prisma } = setup({
      items: ITEMS,
      scores: [
        { subjectId: Q1, criterion: 'natural', verdict: 'pass', problem: null, reason: 'Tự nhiên.' },
        { subjectId: Q1, criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'Từ "beat" cũng điền vừa.' },
        { subjectId: Q2, criterion: 'single_answer', verdict: null, problem: 'invalid-shape', reason: null },
      ],
      labels: [{ subjectId: Q1, criterion: 'single_answer', verdict: 'fail_minor' }],
    });
    const result = await reader.pass(P);
    expect(result!.pass).toMatchObject({ id: P, revision: 2, total: 2, judged: 2 });
    expect(result!.items).toEqual([
      {
        subject_id: Q1, input: { word: 'beat' }, output: { sentence: 'We ___ them.' }, context: { session_words: ['go'] },
        // The order of the revision's criteria, not the order the rows were written.
        scores: [
          { criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'Từ "beat" cũng điền vừa.' },
          { criterion: 'natural', verdict: 'pass', problem: null, reason: 'Tự nhiên.' },
        ],
        labels: [{ criterion: 'single_answer', verdict: 'fail_minor' }],
      },
      {
        subject_id: Q2, input: { word: 'go' }, output: { sentence: 'I ___ home.' }, context: null,
        scores: [{ criterion: 'single_answer', verdict: null, problem: 'invalid-shape', reason: null }], labels: [],
      },
    ]);
    expect(prisma.aiJudgePassItem.findMany).toHaveBeenCalledExactlyOnceWith({ where: { passId: P }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    expect(prisma.aiJudgeScore.findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { judgeRevisionId: R2, subjectKind: 'real_question', subjectId: { in: [Q1, Q2] } },
    }));
    expect(prisma.aiLabel.findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: { subjectKind: 'real_question', subjectId: { in: [Q1, Q2] } },
    }));
  });

  it('an eval_run pass, or an unknown one → null, and no item is read', async () => {
    const { reader, prisma } = setup({ passes: [passRow({ id: P_RUN, kind: 'eval_run', evalRunId: 'run' })] });
    await expect(reader.pass(P_RUN)).resolves.toBeNull();
    await expect(reader.pass(P)).resolves.toBeNull();
    expect(prisma.aiJudgePassItem.findMany).not.toHaveBeenCalled();
  });

  it('a pass with no items → items [] without asking for scores or labels', async () => {
    const { reader, prisma } = setup({ items: [] });
    await expect(reader.pass(P)).resolves.toMatchObject({ items: [] });
    expect(prisma.aiJudgeScore.findMany).not.toHaveBeenCalled();
    expect(prisma.aiLabel.findMany).not.toHaveBeenCalled();
  });
});
