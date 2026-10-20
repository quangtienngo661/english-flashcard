import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { OperationsRepository } from './operations.repository.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ROW_ID = '00000000-0000-4000-8000-0000000000c1';
const OLD = '00000000-0000-4000-8000-0000000000d1';
const NEW = '00000000-0000-4000-8000-0000000000d2';
const NOW = new Date('2026-10-20T05:00:00.000Z');
const DEADLINE = new Date('2026-10-20T05:00:10.000Z');

type Statement = { kind: 'query' | 'exec'; sql: string; values: unknown[] };

function setup(answers: { query?: unknown[][]; exec?: number[] } = {}) {
  const statements: Statement[] = [];
  const queries = [...(answers.query ?? [])];
  const execs = [...(answers.exec ?? [])];
  const sql = (strings: TemplateStringsArray) => strings.join('?').replace(/\s+/g, ' ').trim();
  const prisma = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ kind: 'query', sql: sql(strings), values });
      return queries.shift() ?? [];
    }),
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ kind: 'exec', sql: sql(strings), values });
      return execs.shift() ?? 0;
    }),
  } as unknown as PrismaClient;
  return { repository: new OperationsRepository(prisma), statements };
}

describe('OperationsRepository', () => {
  it('plan choice 17: find deletes the expired row of this user and id first, then selects', async () => {
    const row = {
      id: ROW_ID, status: 'running', fingerprint: 'fp', attempt_id: OLD, deadline_at: DEADLINE, result: null, meta: null,
    };
    const { repository, statements } = setup({ query: [[row]] });
    await expect(repository.find(USER, 'q1', NOW)).resolves.toEqual({
      id: ROW_ID, status: 'running', fingerprint: 'fp', attemptId: OLD, deadlineAt: DEADLINE, result: null, meta: null,
    });
    expect(statements.map((statement) => statement.kind)).toEqual(['exec', 'query']);
    expect(statements[0].sql).toMatch(/^DELETE FROM ai_operations WHERE user_id = \?::uuid AND operation_id = \? AND expires_at <= \?$/);
    expect(statements[0].values).toEqual([USER, 'q1', NOW]);
    expect(statements[1].sql).toContain('WHERE user_id = ?::uuid AND operation_id = ?');
  });

  it('find with no row → null', async () => {
    const { repository } = setup({ query: [[]] });
    await expect(repository.find(USER, 'q1', NOW)).resolves.toBeNull();
  });

  it('B6E78: claim inserts a running row with ON CONFLICT (user_id, operation_id) DO NOTHING RETURNING id', async () => {
    const { repository, statements } = setup({ query: [[{ id: ROW_ID }]] });
    const claimed = await repository.claim({
      userId: USER, operationId: 'q1', operation: 'generate_cloze', fingerprint: 'fp', attemptId: NEW, startedAt: NOW,
      deadlineAt: DEADLINE,
    });
    expect(claimed).toBe(ROW_ID);
    expect(statements[0].sql).toContain("'running'");
    expect(statements[0].sql).toMatch(/ON CONFLICT \(user_id, operation_id\) DO NOTHING RETURNING id$/);
    expect(statements[0].values).toEqual([USER, 'q1', 'generate_cloze', 'fp', NEW, NOW, DEADLINE, NOW]);
  });

  it('B6E78: a claim that conflicts → null', async () => {
    const { repository } = setup({ query: [[]] });
    await expect(repository.claim({
      userId: USER, operationId: 'q1', operation: 'generate_cloze', fingerprint: 'fp', attemptId: NEW, startedAt: NOW,
      deadlineAt: DEADLINE,
    })).resolves.toBeNull();
  });

  it('B6E79: reclaim updates only the same running attempt', async () => {
    const { repository, statements } = setup({ exec: [1, 0] });
    await expect(repository.reclaim(ROW_ID, OLD, NEW, NOW, DEADLINE)).resolves.toBe(true);
    await expect(repository.reclaim(ROW_ID, OLD, NEW, NOW, DEADLINE)).resolves.toBe(false);
    expect(statements[0].sql).toMatch(/WHERE id = \?::uuid AND attempt_id = \?::uuid AND status = 'running'$/);
    expect(statements[0].values).toEqual([NEW, NOW, DEADLINE, ROW_ID, OLD]);
  });

  it('B6E80: finish writes only while the attempt is still this one', async () => {
    const { repository, statements } = setup({ exec: [0] });
    const result = { status: 'succeeded', operation_id: 'q1' };
    await expect(repository.finish(ROW_ID, NEW, {
      status: 'succeeded', result, meta: { replayed: false }, finishedAt: NOW, expiresAt: DEADLINE,
    })).resolves.toBe(false);
    expect(statements[0].sql).toMatch(/^UPDATE ai_operations SET status = \?, result = \?::jsonb, meta = \?::jsonb/);
    expect(statements[0].sql).toMatch(/WHERE id = \?::uuid AND attempt_id = \?::uuid$/);
    expect(statements[0].values).toEqual(['succeeded', JSON.stringify(result), '{"replayed":false}', NOW, DEADLINE, ROW_ID, NEW]);
  });

  it('finish with no meta writes SQL null', async () => {
    const { repository, statements } = setup({ exec: [1] });
    await repository.finish(ROW_ID, NEW, {
      status: 'permanent_failure', result: { reason: 'bad-input' }, meta: null, finishedAt: NOW, expiresAt: DEADLINE,
    });
    expect(statements[0].values[2]).toBeNull();
  });

  it('B6E80: drop deletes only while the attempt is still this one', async () => {
    const { repository, statements } = setup({ exec: [1] });
    await expect(repository.drop(ROW_ID, NEW)).resolves.toBe(true);
    expect(statements[0].sql).toBe('DELETE FROM ai_operations WHERE id = ?::uuid AND attempt_id = ?::uuid');
  });

  it('B6#18: storeFinal inserts a permanent_failure with every column set and ON CONFLICT DO NOTHING', async () => {
    const { repository, statements } = setup({ exec: [1] });
    const result = { status: 'permanent_failure', operation_id: 'q1', reason: 'bad-input' };
    await repository.storeFinal({
      userId: USER, operationId: 'q1', operation: 'generate_cloze', fingerprint: 'fp', attemptId: NEW, startedAt: NOW,
      deadlineAt: DEADLINE, result, finishedAt: NOW, expiresAt: new Date('2026-10-21T05:00:00.000Z'),
    });
    expect(statements[0].sql).toContain("'permanent_failure'");
    expect(statements[0].sql).toMatch(/ON CONFLICT \(user_id, operation_id\) DO NOTHING$/);
    expect(statements[0].values).toEqual([
      USER, 'q1', 'generate_cloze', 'fp', NEW, NOW, DEADLINE, JSON.stringify(result), NOW,
      new Date('2026-10-21T05:00:00.000Z'), NOW,
    ]);
  });
});
