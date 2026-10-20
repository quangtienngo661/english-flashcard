import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AiService } from './ai.service.js';
import type { ReadinessCheck, ReadinessService } from './runner/readiness.service.js';
import type { ExecuteInput, RunnerService, RunReport } from './runner/runner.service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const NOW = new Date('2026-10-20T05:00:00.000Z');
const DATA = { word: 'borrow' };

function setup(readiness: ReadinessCheck = { ready: true, selection: {} as never }) {
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
  const prisma = {
    $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ sql: strings.join('?').replace(/\s+/g, ' ').trim(), values });
      return { statement: statements.length };
    }),
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  } as unknown as PrismaClient;
  const service = new AiService(runner, readinessService, prisma, new FakeClock(NOW));
  return { service, executed, report, checks, statements, prisma };
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
