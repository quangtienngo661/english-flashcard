import { describe, expect, it, vi } from 'vitest';
import { JudgePassesRepository, type NewPass } from './judge-passes.repository.js';
import type { ScoreRow } from './judge.types.js';

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
  return { repo: new JudgePassesRepository(prisma as never, { judgedSubjects: vi.fn(async () => new Set<string>()) } as never), prisma, tx };
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

/** The SQL of a `Prisma.sql` statement or a tagged template, with its values. */
const textOf = (statement: unknown, ...rest: unknown[]) => {
  if (Array.isArray(statement)) return { sql: (statement as string[]).join('?').replace(/\s+/g, ' ').trim(), values: rest };
  const sql = statement as { sql: string; values: unknown[] };
  return { sql: sql.sql.replace(/\s+/g, ' ').trim(), values: sql.values };
};

const ROWS: ScoreRow[] = [
  { criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'beat fits' },
  { criterion: 'natural', verdict: null, problem: 'missing', reason: null },
];

describe('JudgePassesRepository.writeScores (B15, B19)', () => {
  it('is one statement: the scores upserted only over a score without verdict, the item done, the pass judged + 1, all guarded by the pass running', async () => {
    const executed: Array<{ sql: string; values: unknown[] }> = [];
    const prisma = { $executeRaw: vi.fn(async (statement: unknown, ...rest: unknown[]) => { executed.push(textOf(statement, ...rest)); return 1; }) };
    const repo = new JudgePassesRepository(prisma as never, {} as never);
    await repo.writeScores({ id: P1, judgeRevisionId: R2 }, { id: 'item-1', subjectKind: 'eval_item', subjectId: 's1' }, ROWS, 'C1', '0.00010000', NOW);
    expect(executed).toHaveLength(1);
    const { sql, values } = executed[0]!;
    expect(sql).toContain('ON CONFLICT (judge_revision_id, subject_kind, subject_id, criterion) DO UPDATE');
    expect(sql).toContain('WHERE ai_judge_scores.verdict IS NULL');
    expect(sql).toContain("FROM ai_judge_passes WHERE id = ?::uuid AND status = 'running'");
    expect(sql).toContain('UPDATE ai_judge_pass_items SET done = true');
    expect(sql).toContain('judged = judged + 1');
    expect(sql).toContain('COALESCE(cost_usd, 0) + COALESCE(');
    expect(sql).toContain('heartbeat_at = ');
    expect(values).toEqual(expect.arrayContaining([P1, R2, 'eval_item', 's1', 'item-1', 'C1', '0.00010000', NOW, 'single_answer', 'fail_major', 'beat fits', 'natural', 'missing']));
  });

  it('a call without an id or a cost writes null for both (the cost adds nothing)', async () => {
    const executed: Array<{ sql: string; values: unknown[] }> = [];
    const prisma = { $executeRaw: vi.fn(async (statement: unknown) => { executed.push(textOf(statement)); return 1; }) };
    await new JudgePassesRepository(prisma as never, {} as never)
      .writeScores({ id: P1, judgeRevisionId: R2 }, { id: 'i', subjectKind: 'real_question', subjectId: 's' }, ROWS, null, null, NOW);
    expect(executed[0]!.values).toEqual(expect.arrayContaining([null, 'real_question']));
  });
});

describe('JudgePassesRepository.start, isRunning, finish, fail, pendingItems', () => {
  it('start moves a queued or running pass that has its snapshot to running and answers what the job needs; null when no row changes', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const rows: unknown[][] = [[{ id: P1, judge_revision_id: R2, operation: 'generate_cloze', started_by: ADMIN }], []];
    const prisma = { $queryRaw: vi.fn(async (strings: unknown, ...values: unknown[]) => { statements.push(textOf(strings, ...values)); return rows.shift() ?? []; }) };
    const repo = new JudgePassesRepository(prisma as never, {} as never);
    await expect(repo.start(P1, NOW)).resolves.toEqual({ id: P1, judgeRevisionId: R2, operation: 'generate_cloze', startedBy: ADMIN });
    expect(statements[0]!.sql).toContain("SET status = 'running', started_at = COALESCE(started_at, ?), heartbeat_at = ?");
    expect(statements[0]!.sql).toContain("WHERE id = ?::uuid AND status IN ('queued', 'running') AND total IS NOT NULL");
    await expect(repo.start(P1, NOW)).resolves.toBeNull();
  });

  it('isRunning is true only for a running pass', async () => {
    const statements: string[] = [];
    const answers = [[{ one: 1 }], []];
    const prisma = { $queryRaw: vi.fn(async (strings: unknown, ...values: unknown[]) => { statements.push(textOf(strings, ...values).sql); return answers.shift() ?? []; }) };
    const repo = new JudgePassesRepository(prisma as never, {} as never);
    await expect(repo.isRunning(P1)).resolves.toBe(true);
    await expect(repo.isRunning(P1)).resolves.toBe(false);
    expect(statements[0]).toContain("status = 'running'");
  });

  it('finish and fail are guarded by the status, and fail stores the error code', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const prisma = { $executeRaw: vi.fn(async (strings: unknown, ...values: unknown[]) => { statements.push(textOf(strings, ...values)); return 1; }) };
    const repo = new JudgePassesRepository(prisma as never, {} as never);
    await repo.finish(P1, NOW);
    await repo.fail(P1, 'admin-usd-cap', NOW);
    expect(statements[0]!.sql).toContain("SET status = 'finished', finished_at = ?, heartbeat_at = ?");
    expect(statements[0]!.sql).toContain("AND status = 'running'");
    expect(statements[1]!.sql).toContain("SET status = 'failed', error = ?, finished_at = ?");
    expect(statements[1]!.sql).toContain("AND status IN ('queued', 'running')");
    expect(statements[1]!.values).toEqual(['admin-usd-cap', NOW, P1]);
  });

  it('pendingItems lists the items not done in position order, with their snapshot', async () => {
    const findMany = vi.fn(async (_args: unknown) => [
      { id: 'i1', passId: P1, position: 0, subjectKind: 'eval_item', subjectId: 's1', input: { a: 1 }, output: { b: 2 }, context: null, done: false },
    ]);
    const repo = new JudgePassesRepository({ aiJudgePassItem: { findMany } } as never, {} as never);
    await expect(repo.pendingItems(P1)).resolves.toEqual([
      { id: 'i1', position: 0, subjectKind: 'eval_item', subjectId: 's1', input: { a: 1 }, output: { b: 2 }, context: null },
    ]);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({ where: { passId: P1, done: false }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
  });
});

type MemPass = { id: string; judgeRevisionId: string; evalRunId: string; status: string; total: number | null; createdAt: Date };

function releaseSetup(runStatus: string | null, passes: MemPass[], runItems: Array<{ id: string; input: unknown; output: unknown }>, judged: Record<string, string[]> = {}) {
  const items: Array<Record<string, unknown>> = [];
  const matches = (pass: MemPass, where: { evalRunId?: string; status?: string; total?: null | { gt: number } }) =>
    (where.evalRunId === undefined || pass.evalRunId === where.evalRunId) && (where.status === undefined || pass.status === where.status)
    && (where.total === undefined || (where.total === null ? pass.total === null : (pass.total ?? 0) > where.total.gt));
  const prisma = {
    aiEvalRun: { findUnique: vi.fn(async (_args: unknown) => (runStatus === null ? null : { status: runStatus })) },
    aiEvalRunItem: { findMany: vi.fn(async (_args: unknown) => runItems) },
    aiJudgePass: {
      findMany: vi.fn(async ({ where }: { where: Parameters<typeof matches>[1] }) => passes.filter((pass) => matches(pass, where))),
      updateMany: vi.fn(async ({ where, data }: { where: { id?: string } & Parameters<typeof matches>[1]; data: Partial<MemPass> }) => {
        const hit = passes.filter((pass) => (where.id === undefined || pass.id === where.id) && matches(pass, where));
        for (const pass of hit) Object.assign(pass, data);
        return { count: hit.length };
      }),
    },
    aiJudgePassItem: { createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => { items.push(...data); return { count: data.length }; }) },
    $transaction: vi.fn(async (work: (client: unknown) => Promise<unknown>) => work(prisma)),
  };
  const reader = { judgedSubjects: vi.fn(async (revision: string, _ids: string[]) => new Set(judged[revision] ?? [])) };
  return { repo: new JudgePassesRepository(prisma as never, reader as never), prisma, reader, items, passes };
}

const RUN_ITEMS = [
  { id: 'i1', input: { w: 1 }, output: { o: 1 } }, { id: 'i2', input: { w: 2 }, output: { o: 2 } }, { id: 'i3', input: null, output: { o: 3 } },
];
const waiting = (id: string, revision = R2): MemPass => ({ id, judgeRevisionId: revision, evalRunId: RUN, status: 'queued', total: null, createdAt: NOW });

describe('JudgePassesRepository.release (B19, B41)', () => {
  it('a failed run: its queued passes fail with run-failed, nothing comes back and nothing is snapshotted', async () => {
    const ctx = releaseSetup('failed', [waiting(P1)], RUN_ITEMS);
    await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([]);
    expect(ctx.prisma.aiJudgePass.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { evalRunId: RUN, status: 'queued' }, data: { status: 'failed', error: 'run-failed', finishedAt: NOW },
    });
    expect(ctx.items).toEqual([]);
  });

  it('a run still queued or running, or gone → nothing', async () => {
    for (const status of ['queued', 'running', null]) {
      const ctx = releaseSetup(status, [waiting(P1)], RUN_ITEMS);
      await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([]);
      expect(ctx.items).toEqual([]);
      expect(ctx.passes[0]).toMatchObject({ status: 'queued', total: null });
    }
  });

  it('a finished run: the waiting pass takes the judgeable outputs not yet judged by its revision, numbered, and its id comes back', async () => {
    const ctx = releaseSetup('finished', [waiting(P1)], RUN_ITEMS, { [R2]: ['i1'] });
    await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([P1]);
    expect(ctx.items).toEqual([{ passId: P1, position: 0, subjectKind: 'eval_item', subjectId: 'i2', input: { w: 2 }, output: { o: 2 } }]);
    expect(ctx.passes[0]).toMatchObject({ status: 'queued', total: 1 });
    expect(ctx.reader.judgedSubjects).toHaveBeenCalledWith(R2, ['i1', 'i2']);
  });

  it('every output already judged → the pass ends at once with total 0 and does not come back', async () => {
    const ctx = releaseSetup('finished', [waiting(P1)], RUN_ITEMS, { [R2]: ['i1', 'i2'] });
    await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([]);
    expect(ctx.passes[0]).toMatchObject({ status: 'finished', total: 0 });
    expect(ctx.items).toEqual([]);
  });

  it('two waiting passes of two revisions are cut apart, each by what its own revision judged', async () => {
    const other = '77777777-7777-4777-8777-777777777777';
    const ctx = releaseSetup('finished', [waiting(P1), waiting(P2, other)], RUN_ITEMS, { [other]: ['i2'] });
    await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([P1, P2]);
    expect(ctx.items.filter((item) => item.passId === P1).map((item) => item.subjectId)).toEqual(['i1', 'i2']);
    expect(ctx.items.filter((item) => item.passId === P2).map((item) => item.subjectId)).toEqual(['i1']);
  });

  it('a pass that already has its snapshot is not cut again, but still comes back while it is queued', async () => {
    const done: MemPass = { ...waiting(P1), total: 2 };
    const ctx = releaseSetup('finished', [done], RUN_ITEMS);
    await expect(ctx.repo.release(RUN, NOW)).resolves.toEqual([P1]);
    expect(ctx.items).toEqual([]);
    expect(ctx.prisma.aiJudgePass.updateMany).not.toHaveBeenCalled();
  });

  it('a second caller that loses the claim (the total is no longer NULL) writes no items', async () => {
    const ctx = releaseSetup('finished', [waiting(P1)], RUN_ITEMS);
    ctx.prisma.aiJudgePass.updateMany.mockResolvedValueOnce({ count: 0 });
    await ctx.repo.release(RUN, NOW);
    expect(ctx.items).toEqual([]);
  });
});
