import { describe, expect, it, vi } from 'vitest';
import type { Agreement } from '../judge/agreement.js';
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
