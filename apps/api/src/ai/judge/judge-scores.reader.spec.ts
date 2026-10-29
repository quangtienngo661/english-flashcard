import { describe, expect, it, vi } from 'vitest';
import { JudgeScoresReader } from './judge-scores.reader.js';

const R2 = '22222222-2222-4222-8222-222222222222';
const R3 = '33333333-3333-4333-8333-333333333333';
const ADMIN = '99999999-9999-4999-8999-999999999999';
const NOW = new Date('2026-10-30T03:00:00Z');

type Score = {
  id: string; judgeRevisionId: string; subjectKind: string; subjectId: string; criterion: string; verdict: string | null; reason: string | null;
  problem: string | null; createdAt: Date;
};
type Label = { id: string; subjectKind: string; subjectId: string; criterion: string; verdict: string; labeledBy: string; labeledAt: Date };
type RunItem = { id: string; runId: string; split: string };

const JUDGES: Record<string, { id: string; name: string; revision: number }> = {
  [R2]: { id: 'judge-1', name: 'Chỉ một đáp án', revision: 2 }, [R3]: { id: 'judge-2', name: 'Judge B', revision: 1 },
};

/** The tables a reader asks about, filtered as the database would: the score query answers both the judged-subjects and the by-run shapes. */
function setup(init: { scores?: Array<Partial<Score> & Pick<Score, 'judgeRevisionId' | 'subjectId' | 'criterion' | 'verdict'>>; criteria?: Record<string, string[]>; labels?: Label[]; items?: RunItem[] } = {}) {
  const scores: Score[] = (init.scores ?? []).map((row, index) => ({
    id: `score-${index}`, subjectKind: 'eval_item', reason: null, problem: null, createdAt: NOW, ...row,
  }));
  const criteria = init.criteria ?? { [R2]: ['single_answer', 'natural'], [R3]: ['single_answer'] };
  const prisma = {
    aiLabel: {
      findMany: vi.fn(async ({ where }: { where: { subjectKind: string; subjectId: { in: string[] } } }) =>
        (init.labels ?? []).filter((row) => row.subjectKind === where.subjectKind && where.subjectId.in.includes(row.subjectId))),
    },
    aiJudgeRevision: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (criteria[where.id] ? { criteria: criteria[where.id]!.map((code) => ({ code, question: 'Q' })) } : null)),
    },
    aiJudgeScore: {
      findMany: vi.fn(async ({ where }: { where: { judgeRevisionId?: string; subjectKind?: string; subjectId: { in: string[] }; verdict?: { not: null } } }) =>
        scores.filter((row) => (where.judgeRevisionId === undefined || row.judgeRevisionId === where.judgeRevisionId)
          && (where.subjectKind === undefined || row.subjectKind === where.subjectKind) && where.subjectId.in.includes(row.subjectId)
          && (where.verdict === undefined || row.verdict !== null))
          .map((row) => ({ ...row, revision: { id: row.judgeRevisionId, revision: JUDGES[row.judgeRevisionId]!.revision, judge: { id: JUDGES[row.judgeRevisionId]!.id, name: JUDGES[row.judgeRevisionId]!.name } } }))),
    },
    aiEvalRunItem: { findMany: vi.fn(async ({ where }: { where: { runId: string } }) => (init.items ?? []).filter((row) => row.runId === where.runId)) },
  };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  return { reader: new JudgeScoresReader(prisma as never, identity as never), prisma };
}

describe('JudgeScoresReader.judgedSubjects (B15)', () => {
  it('two criteria: a subject with two verdicts is judged; one with a NULL verdict, or only one score, is not', async () => {
    const { reader } = setup({ scores: [
      { judgeRevisionId: R2, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' },
      { judgeRevisionId: R2, subjectId: 's1', criterion: 'natural', verdict: 'fail_minor' },
      { judgeRevisionId: R2, subjectId: 's2', criterion: 'single_answer', verdict: 'pass' },
      { judgeRevisionId: R2, subjectId: 's2', criterion: 'natural', verdict: null },
      { judgeRevisionId: R2, subjectId: 's3', criterion: 'single_answer', verdict: 'pass' },
    ] });
    await expect(reader.judgedSubjects(R2, ['s1', 's2', 's3', 's4'])).resolves.toEqual(new Set(['s1']));
  });

  it("another revision's verdicts do not count: R3 judged s1 completely, R2 has not", async () => {
    const { reader } = setup({ scores: [{ judgeRevisionId: R3, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' }] });
    await expect(reader.judgedSubjects(R3, ['s1'])).resolves.toEqual(new Set(['s1']));
    await expect(reader.judgedSubjects(R2, ['s1'])).resolves.toEqual(new Set());
  });

  it('no ids → an empty set and no query at all', async () => {
    const { reader, prisma } = setup();
    await expect(reader.judgedSubjects(R2, [])).resolves.toEqual(new Set());
    expect(prisma.aiJudgeRevision.findUnique).not.toHaveBeenCalled();
    expect(prisma.aiJudgeScore.findMany).not.toHaveBeenCalled();
  });

  it('a repeated id is asked once; an unknown revision judged nothing', async () => {
    const { reader, prisma } = setup({ scores: [{ judgeRevisionId: R3, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' }] });
    await reader.judgedSubjects(R3, ['s1', 's1']);
    expect(prisma.aiJudgeScore.findMany.mock.calls[0]![0].where.subjectId.in).toEqual(['s1']);
    await expect(reader.judgedSubjects('00000000-0000-4000-8000-000000000000', ['s1'])).resolves.toEqual(new Set());
  });
});

describe('JudgeScoresReader.labelsOf (D16)', () => {
  const label = (subjectId: string, criterion: string, verdict: string, kind = 'eval_item'): Label => ({
    id: `${subjectId}-${criterion}-${kind}`, subjectKind: kind, subjectId, criterion, verdict, labeledBy: ADMIN, labeledAt: NOW,
  });

  it('groups the labels of the asked subjects by subject id, each with who labelled and when', async () => {
    const { reader, prisma } = setup({ labels: [
      label('s1', 'single_answer', 'pass'), label('s1', 'natural', 'fail_minor'), label('s2', 'single_answer', 'fail_major'), label('other', 'single_answer', 'pass'),
      label('s1', 'single_answer', 'pass', 'real_question'),
    ] });
    const labels = await reader.labelsOf('eval_item', ['s1', 's2', 's3']);
    expect(labels.get('s1')).toEqual([
      { subject_kind: 'eval_item', subject_id: 's1', criterion: 'single_answer', verdict: 'pass', labeled_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, labeled_at: NOW.toISOString() },
      { subject_kind: 'eval_item', subject_id: 's1', criterion: 'natural', verdict: 'fail_minor', labeled_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, labeled_at: NOW.toISOString() },
    ]);
    expect(labels.get('s2')).toHaveLength(1);
    expect(labels.has('s3')).toBe(false);
    expect(labels.has('other')).toBe(false);
    expect(prisma.aiLabel.findMany).toHaveBeenCalledExactlyOnceWith({ where: { subjectKind: 'eval_item', subjectId: { in: ['s1', 's2', 's3'] } }, orderBy: [{ labeledAt: 'asc' }, { id: 'asc' }] });
  });

  it('no ids → an empty map and no query', async () => {
    const { reader, prisma } = setup();
    await expect(reader.labelsOf('eval_item', [])).resolves.toEqual(new Map());
    expect(prisma.aiLabel.findMany).not.toHaveBeenCalled();
  });
});

describe('JudgeScoresReader.byRun (B3, B11)', () => {
  const RUN = '88888888-8888-4888-8888-888888888888';

  it('the scores of the run items only (not of another run, nor of a real question), each with its item split and the judge it came from', async () => {
    const { reader, prisma } = setup({
      items: [{ id: 'i1', runId: RUN, split: 'dev' }, { id: 'h1', runId: RUN, split: 'held_out' }, { id: 'x1', runId: 'other-run', split: 'dev' }],
      scores: [
        { judgeRevisionId: R2, subjectId: 'i1', criterion: 'single_answer', verdict: 'fail_major', reason: 'beat fits too' },
        { judgeRevisionId: R2, subjectId: 'h1', criterion: 'single_answer', verdict: 'pass', reason: 'secret' },
        { judgeRevisionId: R2, subjectId: 'x1', criterion: 'single_answer', verdict: 'pass', reason: 'other run' },
        { judgeRevisionId: R3, subjectId: 'i1', criterion: 'single_answer', verdict: null, problem: 'missing' },
        { judgeRevisionId: R2, subjectId: 'i1', criterion: 'single_answer', verdict: 'pass', reason: 'a real question', subjectKind: 'real_question' },
      ],
    });
    await expect(reader.byRun(RUN)).resolves.toEqual([
      { itemId: 'i1', split: 'dev', judgeId: 'judge-1', judgeName: 'Chỉ một đáp án', judgeRevisionId: R2, revision: 2, criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'beat fits too' },
      { itemId: 'h1', split: 'held_out', judgeId: 'judge-1', judgeName: 'Chỉ một đáp án', judgeRevisionId: R2, revision: 2, criterion: 'single_answer', verdict: 'pass', problem: null, reason: 'secret' },
      { itemId: 'i1', split: 'dev', judgeId: 'judge-2', judgeName: 'Judge B', judgeRevisionId: R3, revision: 1, criterion: 'single_answer', verdict: null, problem: 'missing', reason: null },
    ]);
    expect(prisma.aiJudgeScore.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { subjectKind: 'eval_item', subjectId: { in: ['i1', 'h1'] } } }));
  });

  it('a run with no item → no scores and no score query', async () => {
    const { reader, prisma } = setup();
    await expect(reader.byRun(RUN)).resolves.toEqual([]);
    expect(prisma.aiJudgeScore.findMany).not.toHaveBeenCalled();
  });
});
