import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import { JudgeAgreement } from './agreement.service.js';

const J = '11111111-1111-4111-8111-111111111111';
const R1 = '22222222-2222-4222-8222-222222222221';
const R2 = '22222222-2222-4222-8222-222222222222';

type Pair = { judge_revision_id: string; criterion: string; label: string; score: string | null };

function setup(pairs: Pair[], init: { labelMin?: number; agreementMin?: number } = {}) {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (strings: unknown, ...rest: unknown[]) => {
      const text = Array.isArray(strings) ? { sql: (strings as string[]).join('?'), values: rest } : { sql: (strings as { sql: string }).sql, values: (strings as { values: unknown[] }).values };
      statements.push({ sql: text.sql.replace(/\s+/g, ' ').trim(), values: text.values });
      return pairs;
    }),
    aiJudge: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === J ? { id: J } : null)) },
    aiJudgeRevision: {
      findMany: vi.fn(async (_args: unknown) => [
        { id: R2, revision: 2, criteria: [{ code: 'single_answer', question: 'Q1' }, { code: 'natural', question: 'Q2' }] },
        { id: R1, revision: 1, criteria: [{ code: 'single_answer', question: 'Q1' }] },
      ]),
    },
  };
  const settings = { get: vi.fn(async () => ({ ...SETTINGS_DEFAULTS, ai: { ...SETTINGS_DEFAULTS.ai, judgeLabelMin: init.labelMin ?? 30, judgeAgreementMin: init.agreementMin ?? 0.85 } })) };
  return { service: new JudgeAgreement(prisma as never, settings as never), prisma, statements };
}

const pair = (label: string, score: string | null, revision = R2, criterion = 'single_answer'): Pair => ({ judge_revision_id: revision, criterion, label, score });

describe('JudgeAgreement.forRevisions (D15, B17)', () => {
  it('pairs (pass, pass), (fail_major, fail_minor), (pass, fail_major) for R2 single_answer, and a score without verdict ignored → 3 labelled, 2 agree, 1 exact, not calibrated', async () => {
    const { service } = setup([pair('pass', 'pass'), pair('fail_major', 'fail_minor'), pair('pass', 'fail_major'), pair('pass', null)]);
    const result = await service.forRevisions([R2]);
    expect(result.get(`${R2}|single_answer`)).toEqual({
      labeled: 3, agree: 2, agree_exact: 1, rate: 2 / 3, exact_rate: 1 / 3, calibrated: false,
    });
  });

  it('every (revision, criterion) with a pair has its own entry; one without a pair is absent', async () => {
    const { service } = setup([pair('pass', 'pass', R2, 'single_answer'), pair('pass', 'fail_minor', R2, 'natural'), pair('fail_minor', 'fail_minor', R1, 'single_answer')]);
    const result = await service.forRevisions([R1, R2]);
    expect([...result.keys()].sort()).toEqual([`${R1}|single_answer`, `${R2}|natural`, `${R2}|single_answer`].sort());
    expect(result.get(`${R2}|natural`)).toMatchObject({ labeled: 1, agree: 0 });
  });

  it('calibrated needs the settings: 30 labels and 85% agree → true; 29 labels → false; 84.9% → false', async () => {
    const agree = (n: number) => Array.from({ length: n }, () => pair('pass', 'pass'));
    const off = (n: number) => Array.from({ length: n }, () => pair('pass', 'fail_major'));
    expect((await setup([...agree(26), ...off(4)]).service.forRevisions([R2])).get(`${R2}|single_answer`)).toMatchObject({ labeled: 30, agree: 26, calibrated: true });
    expect((await setup(agree(29)).service.forRevisions([R2])).get(`${R2}|single_answer`)).toMatchObject({ labeled: 29, calibrated: false });
    expect((await setup([...agree(849), ...off(151)], { labelMin: 30 }).service.forRevisions([R2])).get(`${R2}|single_answer`)).toMatchObject({ rate: 0.849, calibrated: false });
    expect((await setup([...agree(20), ...off(10)], { labelMin: 10, agreementMin: 0.6 }).service.forRevisions([R2])).get(`${R2}|single_answer`)).toMatchObject({ calibrated: true });
  });

  it('one query joins the scores with a verdict to the labels on (kind, subject, criterion) for the revisions asked; no revision → no query', async () => {
    const { service, statements, prisma } = setup([]);
    expect(await service.forRevisions([])).toEqual(new Map());
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    await service.forRevisions([R1, R2]);
    expect(statements).toHaveLength(1);
    expect(statements[0]!.sql).toContain('FROM ai_judge_scores s JOIN ai_labels l ON l.subject_kind = s.subject_kind AND l.subject_id = s.subject_id AND l.criterion = s.criterion');
    expect(statements[0]!.sql).toContain('s.verdict IS NOT NULL');
    expect(statements[0]!.sql).toContain('s.judge_revision_id = ANY(');
    expect(statements[0]!.values).toEqual([[R1, R2]]);
  });
});

describe('JudgeAgreement.forJudge (D15)', () => {
  it('every revision × criterion of the judge, newest revision first; a pair-less one has labeled 0 and rate null; with the two limits', async () => {
    const { service } = setup([pair('pass', 'pass', R2, 'single_answer'), pair('pass', 'fail_major', R1, 'single_answer')]);
    const result = await service.forJudge(J);
    expect(result.label_min).toBe(30);
    expect(result.agreement_min).toBe(0.85);
    expect(result.items.map((item) => [item.judge_revision_id, item.revision, item.criterion, item.labeled])).toEqual([
      [R2, 2, 'single_answer', 1], [R2, 2, 'natural', 0], [R1, 1, 'single_answer', 1],
    ]);
    expect(result.items[1]).toEqual({
      judge_revision_id: R2, revision: 2, criterion: 'natural', labeled: 0, agree: 0, agree_exact: 0, rate: null, exact_rate: null, calibrated: false,
    });
    expect(result.items[2]).toMatchObject({ labeled: 1, agree: 0, rate: 0 });
  });

  it('an unknown judge → 404; the limits come from the settings', async () => {
    const { service } = setup([], { labelMin: 12, agreementMin: 0.9 });
    const error = await service.forJudge(randomUUID()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(404);
    await expect(service.forJudge(J)).resolves.toMatchObject({ label_min: 12, agreement_min: 0.9 });
  });
});
