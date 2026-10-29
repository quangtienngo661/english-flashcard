import { describe, expect, it, vi } from 'vitest';
import { RealQuestionsRepository } from './real-questions.repository.js';

const SINCE = new Date('2026-11-01T03:00:00.000Z');
const norm = (sql: string) => sql.replace(/\s+/g, ' ').trim();

function setup(rows: unknown[] = []) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      calls.push({ sql: norm(statement.sql), values: statement.values });
      return rows;
    }),
    practiceQuestion: { findMany: vi.fn(async (_args: unknown) => rows) },
  };
  return { repo: new RealQuestionsRepository(prisma as never), calls, prisma };
}

describe('RealQuestionsRepository.window (design §7.1)', () => {
  it('one statement: the question, its AI request and its session, AI questions of the window of one operation, newest first', async () => {
    const { repo, calls, prisma } = setup();
    await repo.window({ since: SINCE, operation: 'generate_cloze', config: null, userIds: null });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const { sql, values } = calls[0]!;
    expect(sql).toContain('FROM practice_questions q LEFT JOIN practice_ai_requests r ON r.id::text = q.ai_request_id LEFT JOIN practice_sessions s ON s.id = r.session_id');
    expect(sql).toContain("q.source = 'ai'");
    expect(sql).toContain('q.created_at >= ');
    expect(sql).toContain("q.ai_meta->>'operation' = ");
    expect(sql).toContain('ORDER BY q.created_at DESC, q.id DESC');
    expect(values).toEqual([SINCE, 'generate_cloze']);
    // Without a pair and without a user list, neither filter is in the statement.
    expect(sql).not.toContain("prompt_revision");
    expect(sql).not.toContain("ai_meta->>'model'");
    expect(sql).not.toContain('q.user_id = ANY(');
  });

  it('with a config pair: the config number and the model id, both bound', async () => {
    const { repo, calls } = setup();
    await repo.window({ since: SINCE, operation: 'generate_cloze', config: { number: 4, model: 'fake:ok' }, userIds: null });
    const { sql, values } = calls[0]!;
    expect(sql).toContain("(q.ai_meta->>'prompt_revision')::int = ");
    expect(sql).toContain("q.ai_meta->>'model' = ");
    expect(values).toEqual([SINCE, 'generate_cloze', 4, 'fake:ok']);
  });

  it('with user ids (the test accounts): q.user_id = ANY of them', async () => {
    const { repo, calls } = setup();
    await repo.window({ since: SINCE, operation: 'generate_meaning_question', config: null, userIds: ['e1'] });
    const { sql, values } = calls[0]!;
    expect(sql).toContain('q.user_id = ANY(');
    expect(values).toEqual([SINCE, 'generate_meaning_question', ['e1']]);
  });

  it('maps a row: ai_input and the session sense ids, [] when the request or session is gone', async () => {
    const created = new Date('2026-11-07T01:00:00.000Z');
    const { repo } = setup([
      { id: 'q1', user_id: 'u1', sense_id: 's1', created_at: created, ai_meta: { operation: 'generate_cloze' }, answer_key: { kind: 'type_word' }, ai_input: { type: 'cloze' }, session_sense_ids: ['s1', 's2'] },
      { id: 'q2', user_id: 'u2', sense_id: 's3', created_at: created, ai_meta: null, answer_key: { kind: 'type_word' }, ai_input: null, session_sense_ids: null },
    ]);
    await expect(repo.window({ since: SINCE, operation: 'generate_cloze', config: null, userIds: null })).resolves.toEqual([
      { id: 'q1', userId: 'u1', senseId: 's1', createdAt: created, aiMeta: { operation: 'generate_cloze' }, answerKey: { kind: 'type_word' }, aiInput: { type: 'cloze' }, sessionSenseIds: ['s1', 's2'] },
      { id: 'q2', userId: 'u2', senseId: 's3', createdAt: created, aiMeta: null, answerKey: { kind: 'type_word' }, aiInput: null, sessionSenseIds: [] },
    ]);
  });
});

describe('RealQuestionsRepository.pairs', () => {
  it('groups the window by (config number, model), most questions first, with the same window filters', async () => {
    const { repo, calls } = setup([
      { config_number: 4, model: 'fake:ok', questions: 12 }, { config_number: 3, model: 'fake:ok', questions: 5 }, { config_number: null, model: 'fake:old', questions: 1 },
    ]);
    await expect(repo.pairs({ since: SINCE, operation: 'generate_cloze', userIds: ['e1'] })).resolves.toEqual([
      { config_number: 4, model: 'fake:ok', questions: 12 }, { config_number: 3, model: 'fake:ok', questions: 5 }, { config_number: null, model: 'fake:old', questions: 1 },
    ]);
    const { sql, values } = calls[0]!;
    expect(sql).toContain("GROUP BY (q.ai_meta->>'prompt_revision')::int, q.ai_meta->>'model'");
    expect(sql).toContain('ORDER BY count(*) DESC');
    expect(sql).toContain("q.source = 'ai'");
    expect(sql).toContain('q.user_id = ANY(');
    expect(values).toEqual([SINCE, 'generate_cloze', ['e1']]);
  });

  it('a question without a model in its meta has no pair', async () => {
    const { repo, calls } = setup();
    await repo.pairs({ since: SINCE, operation: 'generate_cloze', userIds: null });
    expect(calls[0]!.sql).toContain("q.ai_meta->>'model' IS NOT NULL");
    expect(calls[0]!.sql).not.toContain('q.user_id = ANY(');
  });
});

describe('RealQuestionsRepository.questions (M4-T6)', () => {
  it('the time and the meta of the questions that still exist, by id; the learner is not selected', async () => {
    const created = new Date('2026-11-07T01:00:00.000Z');
    const { repo, prisma } = setup([{ id: 'q1', createdAt: created, aiMeta: { model: 'fake:ok' } }]);
    await expect(repo.questions(['q1', 'q2', 'q1'])).resolves.toEqual(new Map([['q1', { createdAt: created, aiMeta: { model: 'fake:ok' } }]]));
    expect(prisma.practiceQuestion.findMany).toHaveBeenCalledExactlyOnceWith({ where: { id: { in: ['q1', 'q2'] } }, select: { id: true, createdAt: true, aiMeta: true } });
  });

  it('no ids → no query', async () => {
    const { repo, prisma } = setup();
    await expect(repo.questions([])).resolves.toEqual(new Map());
    expect(prisma.practiceQuestion.findMany).not.toHaveBeenCalled();
  });
});

describe('RealQuestionsRepository.source (M4-T7)', () => {
  const ROW = {
    sense_id: 's1', owner_id: 'u1', ai_meta: { operation: 'generate_cloze' }, question_source: 'ai', report_status: 'confirmed', snapshot: { prompt: {} },
    answer_key: { kind: 'type_word' }, ai_input: { type: 'cloze' },
  };
  const MAPPED = {
    senseId: 's1', ownerId: 'u1', aiMeta: { operation: 'generate_cloze' }, questionSource: 'ai', reportStatus: 'confirmed', snapshot: { prompt: {} },
    answerKey: { kind: 'type_word' }, aiInput: { type: 'cloze' },
  };

  it('a report: its question by the request id and its request by id, either of them may be gone; the owner is the report\'s learner', async () => {
    const { repo, calls } = setup([ROW]);
    await expect(repo.source({ report_id: 'rep1' })).resolves.toEqual(MAPPED);
    const { sql, values } = calls[0]!;
    expect(sql).toContain('FROM practice_reports rep');
    expect(sql).toContain('LEFT JOIN practice_questions q ON q.ai_request_id = rep.ai_operation_id');
    expect(sql).toContain('LEFT JOIN practice_ai_requests r ON r.id::text = rep.ai_operation_id');
    expect(sql).toContain('rep.user_id::text AS owner_id');
    expect(sql).toContain('rep.status AS report_status');
    expect(sql).toContain('WHERE rep.id = ');
    expect(values).toEqual(['rep1']);
  });

  it('a question: its request by the request id, no report; the owner is the question\'s learner', async () => {
    const { repo, calls } = setup([{ ...ROW, report_status: null, snapshot: null }]);
    await expect(repo.source({ question_id: 'q1' })).resolves.toEqual({ ...MAPPED, reportStatus: null, snapshot: null });
    const { sql, values } = calls[0]!;
    expect(sql).toContain('FROM practice_questions q');
    expect(sql).toContain('LEFT JOIN practice_ai_requests r ON r.id::text = q.ai_request_id');
    expect(sql).toContain('q.user_id::text AS owner_id');
    expect(sql).toContain('WHERE q.id = ');
    expect(sql).not.toContain('practice_reports');
    expect(values).toEqual(['q1']);
  });

  it('a report whose question row and request are gone comes back with no answer key and no input; an unknown id gives null', async () => {
    const { repo } = setup([{ ...ROW, answer_key: null, ai_input: null }]);
    await expect(repo.source({ report_id: 'rep1' })).resolves.toMatchObject({ answerKey: null, aiInput: null });
    await expect(setup([]).repo.source({ report_id: 'nope' })).resolves.toBeNull();
  });
});
