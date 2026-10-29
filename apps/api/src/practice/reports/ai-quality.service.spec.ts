import { describe, expect, it, vi } from 'vitest';
import type { AiService } from '../../ai/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiQualityService } from './ai-quality.service.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');

type Questions = Array<{ id: string; aiMeta: unknown }>;

function setup(answer: (sql: string) => unknown[] = () => [], secondTries: unknown[] = [], real: { scores?: unknown[]; questions?: Questions } = {}) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      const sql = statement.sql.replace(/\s+/g, ' ');
      statements.push({ sql, values: statement.values });
      return answer(sql);
    }),
    practiceQuestion: {
      findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => (real.questions ?? []).filter((question) => args.where.id.in.includes(question.id))),
    },
  } as unknown as PrismaClient;
  const ai = { secondTries: vi.fn(async () => secondTries), realJudgeScores: vi.fn(async () => real.scores ?? []) };
  const findQuestions = (prisma as unknown as { practiceQuestion: { findMany: ReturnType<typeof vi.fn> } }).practiceQuestion.findMany;
  return { service: new AiQualityService(prisma, ai as unknown as AiService), statements, ai, findQuestions };
}

describe('AiQualityService.report', () => {
  it('defaults to the 30 Vietnam days ending today; every query is bounded by the first midnight and the one after the last day', async () => {
    const { service, statements } = setup();
    const report = await service.report({}, NOW);
    expect(report).toEqual({
      from: '2026-09-21', to: '2026-10-20', questions: [], ai_requests: [], ai_sessions: [], reports: [], ai_report_reasons: [],
      unknown_forms: { new_forms: 0, rejected_seen: 0 }, word_checks: [], ai_second_tries: [], real_judge_scores: [], real_judge_latest: [],
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

  it('F11: reports are counted by every status the admin can give one, `confirmed` (a confirmed AI error) included', async () => {
    const row = { source: 'ai', total: 4, open: 1, no_error: 1, fixed: 0, confirmed: 2, refunded: 1 };
    const { service, statements } = setup((sql) => (sql.includes('FROM practice_reports WHERE') ? [row] : []));
    const report = await service.report({}, NOW);
    const sql = statements.map((statement) => statement.sql).find((text) => text.includes('FROM practice_reports WHERE'));
    expect(sql).toContain("(count(*) FILTER (WHERE status = 'confirmed'))::int AS confirmed");
    expect(report.reports).toEqual([row]);
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
    expect(ai.realJudgeScores).not.toHaveBeenCalled();
  });
});

// ---- M5-T8: real-question scores -------------------------------------------------------------------------------------------------------

const SCORE_AT = new Date('2026-10-19T03:00:00.000Z');
const real = (subjectId: string, extra: Record<string, unknown> = {}) => ({
  subjectId, passId: 'P1', passFinished: true, judgeRevisionId: 'jr1', criterion: 'one_answer', verdict: 'pass', scoredAt: SCORE_AT, ...extra,
});
const CLOZE_META = { operation: 'generate_cloze', prompt_revision: 7, model: 'fake:ok' };

describe('AiQualityService.report: real-question judge scores (M5-T8, design §8.3, §8.4)', () => {
  it('asks the AI gateway for the scores made in the range (both instants), once', async () => {
    const { service, ai } = setup();
    await service.report({}, NOW);
    expect(ai.realJudgeScores).toHaveBeenCalledTimes(1);
    expect(ai.realJudgeScores).toHaveBeenCalledWith({ start: new Date('2026-09-20T17:00:00.000Z'), end: new Date('2026-10-20T17:00:00.000Z') });
  });

  it('no score → empty blocks, no question is looked up, and the report still reads 7 statements', async () => {
    const { service, statements, findQuestions } = setup();
    const report = await service.report({}, NOW);
    expect(report.real_judge_scores).toEqual([]);
    expect(report.real_judge_latest).toEqual([]);
    expect(findQuestions).not.toHaveBeenCalled();
    expect(statements).toHaveLength(7);
  });

  it('the questions are read once, each id once, with only their id and ai_meta', async () => {
    const { service, findQuestions } = setup(() => [], [], {
      scores: [real('q1'), real('q1', { criterion: 'natural' }), real('q2')],
      questions: [{ id: 'q1', aiMeta: CLOZE_META }, { id: 'q2', aiMeta: CLOZE_META }],
    });
    await service.report({}, NOW);
    expect(findQuestions).toHaveBeenCalledTimes(1);
    expect(findQuestions).toHaveBeenCalledWith({ where: { id: { in: ['q1', 'q2'] } }, select: { id: true, aiMeta: true } });
  });

  it('Review focus 4: a score whose question is gone (the account was deleted) is left out; the other rows are unchanged, with no error', async () => {
    const { service } = setup(() => [], [], {
      scores: [real('q1'), real('q-gone', { verdict: 'fail_major' })], questions: [{ id: 'q1', aiMeta: CLOZE_META }],
    });
    const report = await service.report({}, NOW);
    expect(report.real_judge_scores).toEqual([{
      operation: 'generate_cloze', source: 'real', config_number: 7, model: 'fake:ok', judge_revision_id: 'jr1', criterion: 'one_answer',
      counts: { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }, first_scored_at: SCORE_AT.toISOString(),
    }]);
    expect(report.real_judge_latest).toEqual([{
      operation: 'generate_cloze', pass_id: 'P1', judge_revision_id: 'jr1', criterion: 'one_answer',
      counts: { pass: 1, fail_major: 0, fail_minor: 0, unscored: 0 }, scored_at: SCORE_AT.toISOString(),
    }]);
  });

  it('the pair comes from the question’s ai_meta: prompt_revision is the config number, model the model id; two models are two groups (R12)', async () => {
    const { service } = setup(() => [], [], {
      scores: [real('q1'), real('q2'), real('q3', { verdict: 'fail_minor' })],
      questions: [
        { id: 'q1', aiMeta: CLOZE_META }, { id: 'q2', aiMeta: CLOZE_META },
        { id: 'q3', aiMeta: { operation: 'generate_cloze', prompt_revision: 7, model: 'fake:alt' } },
      ],
    });
    const { real_judge_scores: groups } = await service.report({}, NOW);
    expect(groups.map((group) => [group.config_number, group.model, group.counts.pass, group.counts.fail_minor])).toEqual([
      [7, 'fake:alt', 0, 1], [7, 'fake:ok', 2, 0],
    ]);
  });

  it('a question whose ai_meta does not name an operation cannot be placed and is left out', async () => {
    const { service } = setup(() => [], [], {
      scores: [real('q1'), real('q2')], questions: [{ id: 'q1', aiMeta: CLOZE_META }, { id: 'q2', aiMeta: { prompt_revision: 7, model: 'fake:ok' } }],
    });
    const { real_judge_scores: groups } = await service.report({}, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].counts.pass).toBe(1);
  });

  it('a pass still running is in the groups but never the latest pass', async () => {
    const { service } = setup(() => [], [], {
      scores: [real('q1', { passId: 'P1' }), real('q2', { passId: 'P3', passFinished: false, scoredAt: new Date('2026-10-19T09:00:00.000Z') })],
      questions: [{ id: 'q1', aiMeta: CLOZE_META }, { id: 'q2', aiMeta: CLOZE_META }],
    });
    const report = await service.report({}, NOW);
    expect(report.real_judge_scores[0].counts.pass).toBe(2);
    expect(report.real_judge_latest.map((row) => row.pass_id)).toEqual(['P1']);
  });

  it('R7: nothing in the two blocks names a question, a pass subject or a learner', async () => {
    const { service } = setup(() => [], [], { scores: [real('q1')], questions: [{ id: 'q1', aiMeta: CLOZE_META }] });
    const report = await service.report({}, NOW);
    expect(JSON.stringify([report.real_judge_scores, report.real_judge_latest])).not.toMatch(/q1|subject|user/);
  });
});
