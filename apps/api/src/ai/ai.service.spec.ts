import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AiService } from './ai.service.js';
import { EvalRulesRegistry, type EvalRules } from './eval/eval-rules.port.js';
import type { ReadinessCheck, ReadinessService } from './runner/readiness.service.js';
import type { ExecuteInput, RunnerService, RunReport } from './runner/runner.service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const NOW = new Date('2026-10-20T05:00:00.000Z');
const DATA = { word: 'borrow' };

function setup(readiness: ReadinessCheck = { ready: true, selection: {} as never, prompt: {} as never }, rows: unknown[] = []) {
  const executed: ExecuteInput[] = [];
  const report: RunReport = { result: { status: 'in_progress', operation_id: 'q1' }, calls: [], rawOutput: null };
  const runner = {
    execute: vi.fn(async (input: ExecuteInput) => {
      executed.push(input);
      return report;
    }),
  } as unknown as RunnerService;
  const checks: unknown[][] = [];
  const readinessService = {
    check: vi.fn(async (...args: unknown[]) => {
      checks.push(args);
      return readiness;
    }),
  } as unknown as ReadinessService;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ sql: strings.join('?').replace(/\s+/g, ' ').trim(), values });
      return { statement: statements.length };
    }),
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      queries.push({ sql: statement.sql.replace(/\s+/g, ' ').trim(), values: statement.values });
      return rows;
    }),
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  } as unknown as PrismaClient;
  const rules = new EvalRulesRegistry();
  const examples = { createFromSource: vi.fn(async () => ({ id: 'example-1' })) };
  const live = { find: vi.fn(async (_op: string): Promise<unknown> => ({ configId: 'c', number: 7, prompt: {}, selection: { modelId: 'fake:ok' } })) };
  const judgePasses = { createReal: vi.fn(async (_args: unknown) => ({ passId: 'pass-1' })) };
  const judges = { latestRevision: vi.fn(async (_id: string): Promise<{ id: string; revision: number } | null> => ({ id: 'rev-2', revision: 2 })) };
  const judgeScores = { judgedSubjects: vi.fn(async (_revision: string, ids: string[]) => new Set(ids.slice(0, 1))) };
  const reports = { callContents: vi.fn(async (_ids: string[], _now: Date) => new Map([['op1', { request: { a: 1 }, response: 'r' }]])) };
  const service = new AiService(
    runner, readinessService, prisma, new FakeClock(NOW), rules, examples as never, live as never, judgePasses as never, judges as never,
    judgeScores as never, reports as never,
  );
  return { service, executed, report, checks, statements, queries, prisma, rules, examples, live, judgePasses, judges, judgeScores, reports };
}

describe('AiService.run', () => {
  it.each(['q 1', '', 'x'.repeat(101), 'q1\n'])('refuses the operationId %j with a TypeError', async (operationId) => {
    const { service, executed } = setup();
    await expect(service.run('generate_cloze', DATA, { operationId, userId: USER, purpose: 'learner' })).rejects.toThrow(TypeError);
    expect(executed).toEqual([]);
  });

  it.each(['not-a-uuid', 'ABCDEF00-0000-4000-8000-00000000000A'])('refuses the userId %s with a TypeError', async (userId) => {
    const { service } = setup();
    await expect(service.run('generate_cloze', DATA, { operationId: 'q1', userId, purpose: 'learner' })).rejects.toThrow(TypeError);
  });

  it("accepts '<uuid>#2' and returns the runner's result", async () => {
    const { service, executed, report } = setup();
    const operationId = `${USER}#2`;
    await expect(service.run('generate_cloze', DATA, { operationId, userId: USER, purpose: 'learner', deadlineMs: 4_000 }))
      .resolves.toBe(report.result);
    expect(executed).toEqual([{ purpose: 'learner', operation: 'generate_cloze', data: DATA, operationId, userId: USER, deadlineMs: 4_000 }]);
  });
});

describe('AiService.registerEvalRules', () => {
  it('E2, contract §4: the rules a module registers are what the eval job reads from the registry', () => {
    const { service, rules } = setup();
    expect(rules.get()).toBeNull();
    const stub = { check: vi.fn(), formsOf: vi.fn(), matchesExpected: vi.fn() } as unknown as EvalRules;
    service.registerEvalRules(stub);
    expect(rules.get()).toBe(stub);
  });
});

describe('AiService.createEvalExample', () => {
  it('contract §4, D27.3: hands the example to the eval example set as a dev example with its source, and returns its id', async () => {
    const { service, examples } = setup();
    const args = {
      operation: 'generate_cloze' as const, input: { word: 'deploy' }, expected: { forms: ['deploy'] }, note: 'from a report', source: 'report' as const,
      sourceRef: 'r-1', actorId: ADMIN,
    };
    await expect(service.createEvalExample(args)).resolves.toEqual({ id: 'example-1' });
    expect(examples.createFromSource).toHaveBeenCalledExactlyOnceWith(args);
  });

  it('a refusal of the example set (an expected answer is missing) reaches the caller', async () => {
    const { service, examples } = setup();
    const refusal = new Error('expected-invalid');
    examples.createFromSource.mockRejectedValueOnce(refusal);
    await expect(service.createEvalExample({
      operation: 'generate_cloze', input: {}, expected: null, note: null, source: 'report', sourceRef: null, actorId: ADMIN,
    })).rejects.toBe(refusal);
  });
});

describe('AiService judge functions (contract §4, M3-T8)', () => {
  it('startJudgePass hands the arguments to the judge passes and answers its pass id', async () => {
    const { service, judgePasses } = setup();
    const args = {
      judgeId: 'J', kind: 'real' as const, filters: { operation: 'generate_cloze', limit: 200 }, actorId: ADMIN,
      subjects: [{ subjectId: 'S1', input: { word: 'a' }, output: { sentence: 'b' }, context: { session_words: ['c'] } }],
    };
    await expect(service.startJudgePass(args)).resolves.toEqual({ passId: 'pass-1' });
    expect(judgePasses.createReal).toHaveBeenCalledExactlyOnceWith(args);
  });

  it('latestJudgeRevision answers the newest revision of the judge, or null for an unknown one', async () => {
    const { service, judges } = setup();
    await expect(service.latestJudgeRevision('J')).resolves.toEqual({ id: 'rev-2', revision: 2 });
    expect(judges.latestRevision).toHaveBeenCalledExactlyOnceWith('J');
    judges.latestRevision.mockResolvedValueOnce(null);
    await expect(service.latestJudgeRevision('nope')).resolves.toBeNull();
  });

  it('callContents asks the reports for the kept content of those operation ids as of now (contract §4)', async () => {
    const { service, reports } = setup();
    await expect(service.callContents(['op1', 'op2'])).resolves.toEqual(new Map([['op1', { request: { a: 1 }, response: 'r' }]]));
    expect(reports.callContents).toHaveBeenCalledExactlyOnceWith(['op1', 'op2'], NOW);
  });

  it('judgedSubjects asks the scores reader about that revision and those subjects', async () => {
    const { service, judgeScores } = setup();
    await expect(service.judgedSubjects('rev-2', ['s1', 's2'])).resolves.toEqual(new Set(['s1']));
    expect(judgeScores.judgedSubjects).toHaveBeenCalledExactlyOnceWith('rev-2', ['s1', 's2']);
  });
});

describe('AiService.liveConfigNumber (contract §4)', () => {
  it('the number of the live config and the id of its model', async () => {
    const { service, live } = setup();
    await expect(service.liveConfigNumber('generate_cloze')).resolves.toEqual({ number: 7, model: 'fake:ok' });
    expect(live.find).toHaveBeenCalledWith('generate_cloze');
  });

  it('a live config without a model → model null', async () => {
    const { service, live } = setup();
    live.find.mockResolvedValue({ configId: 'c', number: 2, prompt: {}, selection: null });
    await expect(service.liveConfigNumber('generate_cloze')).resolves.toEqual({ number: 2, model: null });
  });

  it('an operation without a live config → null', async () => {
    const { service, live } = setup();
    live.find.mockResolvedValue(null);
    await expect(service.liveConfigNumber('generate_cloze')).resolves.toBeNull();
  });
});

describe('AiService.isReady', () => {
  it('isReady maps readiness without the selection', async () => {
    const { service, checks } = setup();
    await expect(service.isReady('lookup_word')).resolves.toEqual({ ready: true });
    expect(checks).toEqual([['lookup_word', 'learner', NOW]]);
  });

  it('a refusal keeps its reason and retry_after_seconds', async () => {
    const { service } = setup({ ready: false, reason: 'daily-call-cap', retry_after_seconds: 60 });
    await expect(service.isReady('lookup_word')).resolves.toEqual({ ready: false, reason: 'daily-call-cap', retry_after_seconds: 60 });
  });
});

describe('AiService.runAdminTest', () => {
  it('runAdminTest runs purpose test with the current selection', async () => {
    const { service, executed, report } = setup();
    await expect(service.runAdminTest('translate_sentence', DATA, ADMIN)).resolves.toBe(report);
    expect(executed).toHaveLength(1);
    expect(executed[0]).toEqual({
      purpose: 'test', operation: 'translate_sentence', data: DATA, actorId: ADMIN, callOperationId: expect.stringMatching(/^test-[0-9a-f-]{36}$/),
    });
    expect(executed[0]).not.toHaveProperty('selection');
    expect(executed[0]).not.toHaveProperty('prompt');
  });
});

describe('AiService.deleteUserData', () => {
  it('B6E68/B6#24: deleteUserData runs the three statements in order in one transaction and deletes no ai_calls row (the cost report keeps its totals)', async () => {
    const { service, statements, prisma } = setup();
    await service.deleteUserData(USER);
    expect(statements.map((statement) => statement.sql)).toEqual([
      'DELETE FROM ai_call_contents c USING ai_calls a WHERE c.call_id = a.id AND a.user_id = ?::uuid',
      'DELETE FROM ai_operations WHERE user_id = ?::uuid',
      'UPDATE ai_calls SET user_id = NULL WHERE user_id = ?::uuid',
    ]);
    expect(statements.every((statement) => statement.values[0] === USER)).toBe(true);
    expect(statements.some((statement) => /DELETE FROM ai_calls\b/.test(statement.sql))).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledWith([{ statement: 1 }, { statement: 2 }, { statement: 3 }]);
  });
});

describe('AiService.deleteUserData inside an account deletion (Bước 8)', () => {
  it('with a transaction client it runs the same three statements in order on it and opens no transaction of its own', async () => {
    const { service, prisma } = setup();
    const sql: string[] = [];
    const tx = { $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => { sql.push(strings.join('?')); expect(values[0]).toBe(USER); return 1; }) };
    await service.deleteUserData(USER, tx as never);
    expect(sql).toEqual([
      'DELETE FROM ai_call_contents c USING ai_calls a WHERE c.call_id = a.id AND a.user_id = ?::uuid',
      'DELETE FROM ai_operations WHERE user_id = ?::uuid',
      'UPDATE ai_calls SET user_id = NULL WHERE user_id = ?::uuid',
    ]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AiService.secondTries', () => {
  const range = { start: new Date('2026-09-20T17:00:00.000Z'), end: new Date('2026-10-20T17:00:00.000Z') };

  it('returns the rows of one query bounded by the range; zero rows is an empty list', async () => {
    const rows = [{ operation: 'generate_cloze', first_answers: 24, second_tries: 3 }];
    const { service, queries } = setup(undefined, rows);
    await expect(service.secondTries(range)).resolves.toEqual(rows);
    expect(queries).toHaveLength(1);
    expect(queries[0].values).toEqual([range.start, range.end]);
    const empty = setup();
    await expect(empty.service.secondTries(range)).resolves.toEqual([]);
  });

  it('counts learner calls only: first answers are the succeeded calls whose id does not end in #2; a second try is a learner call under <id>#2', async () => {
    const { service, queries } = setup();
    await service.secondTries(range);
    const { sql } = queries[0];
    expect(sql).toContain("purpose = 'learner' AND outcome = 'succeeded' AND operation_id NOT LIKE '%#2'");
    expect(sql).toContain("r.operation_id = f.operation_id || '#2' AND r.purpose = 'learner'");
    expect(sql).toContain('SELECT DISTINCT operation, operation_id FROM ai_calls');
    expect(sql).toContain('created_at >= ? AND created_at < ?');
  });
});
