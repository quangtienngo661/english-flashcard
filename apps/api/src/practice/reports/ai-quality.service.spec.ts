import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiQualityService } from './ai-quality.service.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');

function setup(answer: (sql: string) => unknown[] = () => []) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      const sql = statement.sql.replace(/\s+/g, ' ');
      statements.push({ sql, values: statement.values });
      return answer(sql);
    }),
  } as unknown as PrismaClient;
  return { service: new AiQualityService(prisma), statements };
}

describe('AiQualityService.report', () => {
  it('defaults to the 30 Vietnam days ending today; every query is bounded by the first midnight and the one after the last day', async () => {
    const { service, statements } = setup();
    const report = await service.report({}, NOW);
    expect(report).toEqual({
      from: '2026-09-21', to: '2026-10-20', questions: [], ai_requests: [], ai_sessions: [], reports: [], ai_report_reasons: [],
      unknown_forms: { new_forms: 0, rejected_seen: 0 }, word_checks: [],
    });
    expect(statements).toHaveLength(7);
    for (const { values } of statements) {
      expect(values).toContainEqual(new Date('2026-09-20T17:00:00.000Z'));
      expect(values).toContainEqual(new Date('2026-10-20T17:00:00.000Z'));
    }
  });

  it('a void result is neither answered nor correct; AI report reasons are AI questions only; sessions are those that planned AI', async () => {
    const { service, statements } = setup((sql) => (sql.includes('FROM practice_unknown_forms') ? [{ new_forms: 2, rejected_seen: 5 }] : []));
    const report = await service.report({ from: '2026-10-01', to: '2026-10-20' }, NOW);
    expect(report.unknown_forms).toEqual({ new_forms: 2, rejected_seen: 5 });
    const [questions, , sessions, , reasons] = statements.map(({ sql }) => sql);
    expect(questions).toContain("i.result IN ('correct', 'wrong')");
    expect(sessions).toContain('ai_planned > 0');
    expect(reasons).toContain("r.question_source = 'ai'");
  });

  it('a reversed range → 400 before any query', async () => {
    const { service, statements } = setup();
    await expect(service.report({ from: '2026-10-21', to: '2026-10-20' }, NOW)).rejects.toMatchObject({ status: 400 });
    expect(statements).toHaveLength(0);
  });
});
