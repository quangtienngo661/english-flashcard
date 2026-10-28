import { describe, expect, it, vi } from 'vitest';
import type { AiService } from '../../ai/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiQualityService } from './ai-quality.service.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');

function setup(answer: (sql: string) => unknown[] = () => [], secondTries: unknown[] = []) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      const sql = statement.sql.replace(/\s+/g, ' ');
      statements.push({ sql, values: statement.values });
      return answer(sql);
    }),
  } as unknown as PrismaClient;
  const ai = { secondTries: vi.fn(async () => secondTries) };
  return { service: new AiQualityService(prisma, ai as unknown as AiService), statements, ai };
}

describe('AiQualityService.report', () => {
  it('defaults to the 30 Vietnam days ending today; every query is bounded by the first midnight and the one after the last day', async () => {
    const { service, statements } = setup();
    const report = await service.report({}, NOW);
    expect(report).toEqual({
      from: '2026-09-21', to: '2026-10-20', questions: [], ai_requests: [], ai_sessions: [], reports: [], ai_report_reasons: [],
      unknown_forms: { new_forms: 0, rejected_seen: 0 }, word_checks: [], ai_second_tries: [],
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

  it('second tries: the AI gateway is asked for the same range, and its operations become the three AI question types', async () => {
    const { service, ai } = setup(() => [], [
      { operation: 'generate_cloze', first_answers: 24, second_tries: 3 },
      { operation: 'generate_meaning_question', first_answers: 10, second_tries: 0 },
      { operation: 'generate_sentence_mcq', first_answers: 8, second_tries: 2 },
    ]);
    const report = await service.report({}, NOW);
    expect(ai.secondTries).toHaveBeenCalledWith({
      start: new Date('2026-09-20T17:00:00.000Z'), end: new Date('2026-10-20T17:00:00.000Z'),
    });
    expect(report.ai_second_tries).toEqual([
      { type: 'cloze', first_answers: 24, second_tries: 3 },
      { type: 'meaning_in_sentence', first_answers: 10, second_tries: 0 },
      { type: 'mcq_sentence', first_answers: 8, second_tries: 2 },
    ]);
  });

  it('second tries: an operation that Practice does not ask AI for (a lookup) is left out', async () => {
    const { service } = setup(() => [], [
      { operation: 'lookup_word', first_answers: 5, second_tries: 0 },
      { operation: 'generate_cloze', first_answers: 4, second_tries: 1 },
    ]);
    expect((await service.report({}, NOW)).ai_second_tries).toEqual([{ type: 'cloze', first_answers: 4, second_tries: 1 }]);
  });

  it('a reversed range → 400 before any query', async () => {
    const { service, statements, ai } = setup();
    await expect(service.report({ from: '2026-10-21', to: '2026-10-20' }, NOW)).rejects.toMatchObject({ status: 400 });
    expect(statements).toHaveLength(0);
    expect(ai.secondTries).not.toHaveBeenCalled();
  });
});
