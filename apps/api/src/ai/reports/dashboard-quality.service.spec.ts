import { describe, expect, it, vi } from 'vitest';
import type { Agreement } from '../judge/agreement.js';
import { AI_OPERATIONS } from '../ai.types.js';
import { runStats, type RunItemResult } from '../eval/run-stats.js';
import { DashboardQualityService } from './dashboard-quality.service.js';

const AGREEMENT: Agreement = { labeled: 30, agree: 26, agree_exact: 24, rate: 26 / 30, exact_rate: 0.8, calibrated: true };

type Statement = { sql: string; values: unknown[] };

/** `answer` picks the rows of each statement by its text. */
function setup(answer: (sql: string, values: unknown[]) => unknown[], agreements = new Map<string, Agreement>()) {
  const statements: Statement[] = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      const sql = statement.sql.replace(/\s+/g, ' ').trim();
      statements.push({ sql, values: statement.values });
      return answer(sql, statement.values);
    }),
  };
  const agreement = { forRevisions: vi.fn(async (_ids: string[]) => agreements) };
  const sets = { latest: vi.fn(async (_operation: string): Promise<{ id: string; version: number } | null> => null) };
  const service = new DashboardQualityService(prisma as never, sets as never, agreement as never);
  return { service, statements, agreement, sets, prisma };
}

describe('DashboardQualityService.judgeRevisions (M5-T3)', () => {
  const ROW = { id: 'jr2', judge_id: 'j1', judge_name: 'Chỉ một đáp án', revision: 2, saved_at: new Date('2026-11-02T03:00:00Z'), criteria: [{ code: 'one_answer', question: 'Q?' }] };

  it('a revision with its judge, its save time and the agreement of each criterion; the agreement is asked once for all revisions', async () => {
    const { service, agreement, statements } = setup(() => [ROW], new Map([['jr2|one_answer', AGREEMENT]]));
    expect(await service.judgeRevisions()).toEqual([{
      id: 'jr2', judge_id: 'j1', judge_name: 'Chỉ một đáp án', revision: 2, saved_at: '2026-11-02T03:00:00.000Z',
      criteria: [{ code: 'one_answer', labeled: 30, agree: 26, calibrated: true }],
    }]);
    expect(agreement.forRevisions).toHaveBeenCalledTimes(1);
    expect(agreement.forRevisions).toHaveBeenCalledWith(['jr2']);
    // Only revisions that have a score, of any subject kind; judge name then revision.
    expect(statements[0].sql).toContain('FROM ai_judge_revisions');
    expect(statements[0].sql).toContain('EXISTS (SELECT 1 FROM ai_judge_scores');
    expect(statements[0].sql).not.toContain('subject_kind');
    expect(statements[0].sql).toContain('ORDER BY j.name, r.revision');
  });

  it('a criterion with no label pair is not calibrated, with zero labels', async () => {
    const { service } = setup(() => [ROW], new Map());
    const [revision] = await service.judgeRevisions();
    expect(revision.criteria).toEqual([{ code: 'one_answer', labeled: 0, agree: 0, calibrated: false }]);
  });

  it('criteria keep the order the revision lists them, each looked up by its own code', async () => {
    const row = { ...ROW, criteria: [{ code: 'natural', question: 'a' }, { code: 'one_answer', question: 'b' }] };
    const { service } = setup(() => [row], new Map([['jr2|one_answer', AGREEMENT]]));
    const [revision] = await service.judgeRevisions();
    expect(revision.criteria).toEqual([
      { code: 'natural', labeled: 0, agree: 0, calibrated: false },
      { code: 'one_answer', labeled: 30, agree: 26, calibrated: true },
    ]);
  });

  it('no revision with a score → [] and the agreement is not read', async () => {
    const { service, agreement } = setup(() => []);
    expect(await service.judgeRevisions()).toEqual([]);
    expect(agreement.forRevisions).not.toHaveBeenCalled();
  });

  it('the result carries no score, label, subject or call id', async () => {
    const { service } = setup(() => [ROW], new Map([['jr2|one_answer', AGREEMENT]]));
    const [revision] = await service.judgeRevisions();
    expect(Object.keys(revision)).toEqual(['id', 'judge_id', 'judge_name', 'revision', 'saved_at', 'criteria']);
    expect(Object.keys(revision.criteria[0])).toEqual(['code', 'labeled', 'agree', 'calibrated']);
  });
});

// ---- M5-T4: the latest complete eval of each live config -------------------------------------------------------------------------------

const LIVE_ROW = { operation: 'generate_cloze', configId: 'c7', config: { number: 7, version: 3, model: { modelId: 'fake:ok' } } };
const item = (exampleId: string, position: number, split: 'dev' | 'held_out', status: string, rule: string | null, expectedResult: string | null) => ({
  runId: '', exampleId, position, split, status, rule: rule === null ? null : { status: rule, problems: [], reason: null }, expectedResult,
});
// R1: two dev items and one held-out item, all tried. R2: newer, but one item is skipped.
const R1_ROWS = [item('e1', 0, 'dev', 'succeeded', 'pass', 'pass'), item('e2', 1, 'dev', 'succeeded', 'fail', 'pass'), item('e3', 2, 'held_out', 'succeeded', 'pass', 'fail')];
const R2_ROWS = [item('e1', 0, 'dev', 'succeeded', 'pass', 'pass'), item('e2', 1, 'dev', 'skipped', null, null), item('e3', 2, 'held_out', 'succeeded', 'pass', 'pass')];
const asResults = (rows: typeof R1_ROWS): RunItemResult[] => rows.map((row) => ({
  exampleId: row.exampleId, position: row.position, split: row.split, status: row.status as RunItemResult['status'],
  rule: row.rule as RunItemResult['rule'], expectedResult: row.expectedResult as RunItemResult['expectedResult'],
}));

function evalSetup(input: {
  sets?: Record<string, { id: string; version: number } | null>;
  live?: unknown[];
  runs?: Array<{ id: string; createdAt: Date; model: string }>;
  items?: Record<string, typeof R1_ROWS>;
  judgeRows?: unknown[];
} = {}) {
  const base = setup((sql) => (sql.includes('FROM ai_judge_scores') ? input.judgeRows ?? [] : []));
  const sets = input.sets ?? { generate_cloze: { id: 'S2', version: 2 } };
  base.sets.latest.mockImplementation(async (operation: string) => sets[operation] ?? null);
  const prisma = base.prisma as unknown as Record<string, unknown>;
  const findRuns = vi.fn(async (_args: unknown) => input.runs ?? []);
  const findItems = vi.fn(async (args: { where: { runId: string } }) => (input.items?.[args.where.runId] ?? []).map((row) => ({ ...row, runId: args.where.runId })));
  const findLive = vi.fn(async (_args: unknown) => input.live ?? [LIVE_ROW]);
  prisma.aiEvalRun = { findMany: findRuns };
  prisma.aiEvalRunItem = { findMany: findItems };
  prisma.aiLiveConfig = { findMany: findLive };
  return { ...base, findRuns, findItems, findLive };
}

const RUNS = [
  { id: 'R2', createdAt: new Date('2026-11-03T03:00:00Z'), model: 'fake:ok' },
  { id: 'R1', createdAt: new Date('2026-11-02T03:00:00Z'), model: 'fake:ok' },
];

describe('DashboardQualityService.latestEvals (M5-T4, design §8.2)', () => {
  it('one entry per operation in AI_OPERATIONS order', async () => {
    const { service } = evalSetup({ sets: {} });
    const views = await service.latestEvals();
    expect(views.map((view) => view.operation)).toEqual([...AI_OPERATIONS]);
    expect(views).toHaveLength(6);
  });

  it('no frozen set → set null, run null, the live config still shown, and no run is looked for', async () => {
    const { service, findRuns, findItems, statements } = evalSetup({ sets: {} });
    const [cloze] = await service.latestEvals();
    expect(cloze).toEqual({ operation: 'generate_cloze', set: null, live: { config_id: 'c7', number: 7, model: 'fake:ok' }, run: null });
    expect(findRuns).not.toHaveBeenCalled();
    expect(findItems).not.toHaveBeenCalled();
    expect(statements).toEqual([]);
  });

  it('an operation without a live config → live null, run null, nothing looked for', async () => {
    const { service, findRuns } = evalSetup({ live: [] });
    const [cloze] = await service.latestEvals();
    expect(cloze).toMatchObject({ set: { id: 'S2', version: 2 }, live: null, run: null });
    expect(findRuns).not.toHaveBeenCalled();
  });

  it('a live config with no model → model null', async () => {
    const { service } = evalSetup({ sets: {}, live: [{ ...LIVE_ROW, config: { ...LIVE_ROW.config, model: null } }] });
    const [cloze] = await service.latestEvals();
    expect(cloze.live).toEqual({ config_id: 'c7', number: 7, model: null });
  });

  it('Review focus 1, 2: only a finished run of the live config at its current version on the newest frozen set, not hidden, newest first, at most 20', async () => {
    const { service, findRuns } = evalSetup({ runs: RUNS, items: { R1: R1_ROWS, R2: R2_ROWS } });
    await service.latestEvals();
    expect(findRuns).toHaveBeenCalledTimes(1);
    expect(findRuns).toHaveBeenCalledWith({
      where: { configId: 'c7', configVersion: 3, setId: 'S2', status: 'finished', hiddenAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, select: { id: true, createdAt: true, model: true },
    });
  });

  it('the newest run that is complete: R2 has a skipped item, so R1 is the latest complete eval; its stats are runStats of its items', async () => {
    const { service, findItems } = evalSetup({ runs: RUNS, items: { R1: R1_ROWS, R2: R2_ROWS } });
    const [cloze] = await service.latestEvals();
    expect(cloze.run?.id).toBe('R1');
    expect(cloze.run?.created_at).toBe('2026-11-02T03:00:00.000Z');
    expect(cloze.run?.model).toBe('fake:ok');
    expect(cloze.run?.stats).toEqual(runStats(asResults(R1_ROWS)));
    expect(cloze.run?.stats.dev.shape_pass).toBe(2);
    expect(cloze.run?.stats.held_out.total).toBe(1);
    expect(findItems.mock.calls.map(([args]) => args.where.runId)).toEqual(['R2', 'R1']);
  });

  it('the newest run is used when it is complete (the older one is not read)', async () => {
    const { service, findItems } = evalSetup({ runs: RUNS, items: { R1: R1_ROWS, R2: R1_ROWS } });
    const [cloze] = await service.latestEvals();
    expect(cloze.run?.id).toBe('R2');
    expect(findItems).toHaveBeenCalledTimes(1);
  });

  it('no run is complete (or there is none) → run null', async () => {
    const none = evalSetup({ runs: [] });
    expect((await none.service.latestEvals())[0].run).toBeNull();
    const incomplete = evalSetup({ runs: RUNS, items: { R1: R2_ROWS, R2: R2_ROWS } });
    expect((await incomplete.service.latestEvals())[0].run).toBeNull();
    const empty = evalSetup({ runs: RUNS, items: { R1: [], R2: [] } });
    expect((await empty.service.latestEvals())[0].run).toBeNull();
  });

  it('the judge counts of the run: by revision, criterion and split; held-out is a count of its verdicts, an unscored one included', async () => {
    const { service, statements } = evalSetup({
      runs: RUNS, items: { R1: R1_ROWS, R2: R1_ROWS },
      judgeRows: [
        { judge_revision_id: 'jr2', criterion: 'one_answer', split: 'dev', verdict: 'fail_major', n: 1 },
        { judge_revision_id: 'jr2', criterion: 'one_answer', split: 'dev', verdict: 'pass', n: 2 },
        { judge_revision_id: 'jr2', criterion: 'one_answer', split: 'held_out', verdict: null, n: 1 },
      ],
    });
    const [cloze] = await service.latestEvals();
    expect(cloze.run?.judge).toEqual([{
      judge_revision_id: 'jr2', criterion: 'one_answer',
      dev: { pass: 2, fail_major: 1, fail_minor: 0, unscored: 0 }, held_out: { pass: 0, fail_major: 0, fail_minor: 0, unscored: 1 },
    }]);
    const judge = statements.find((statement) => statement.sql.includes('FROM ai_judge_scores'));
    expect(judge?.sql).toContain("s.subject_kind = 'eval_item'");
    expect(judge?.values).toEqual(['R2']);
  });

  it('two revisions or criteria are two rows, in the order of the statement', async () => {
    const { service } = evalSetup({
      runs: RUNS, items: { R2: R1_ROWS },
      judgeRows: [
        { judge_revision_id: 'jr1', criterion: 'natural', split: 'dev', verdict: 'pass', n: 1 },
        { judge_revision_id: 'jr2', criterion: 'natural', split: 'held_out', verdict: 'pass', n: 3 },
        { judge_revision_id: 'jr2', criterion: 'one_answer', split: 'dev', verdict: 'fail_minor', n: 2 },
      ],
    });
    const [cloze] = await service.latestEvals();
    expect(cloze.run?.judge.map((row) => [row.judge_revision_id, row.criterion, row.dev, row.held_out])).toEqual([
      ['jr1', 'natural', { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }, { pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 }],
      ['jr2', 'natural', { pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 }, { pass: 3, fail_major: 0, fail_minor: 0, unscored: 0 }],
      ['jr2', 'one_answer', { pass: 0, fail_major: 0, fail_minor: 2, unscored: 0 }, { pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 }],
    ]);
  });

  it('R7: the run carries no item, input, output or example id', async () => {
    const { service } = evalSetup({ runs: RUNS, items: { R2: R1_ROWS } });
    const [cloze] = await service.latestEvals();
    expect(Object.keys(cloze.run ?? {})).toEqual(['id', 'created_at', 'model', 'stats', 'judge']);
    expect(JSON.stringify(cloze)).not.toMatch(/"e[123]"|exampleId|example_id|input|output/);
  });
});
