import { describe, expect, it, vi } from 'vitest';
import { JudgeScoresReader } from './judge-scores.reader.js';

const R2 = '22222222-2222-4222-8222-222222222222';
const R3 = '33333333-3333-4333-8333-333333333333';

type Score = { judgeRevisionId: string; subjectId: string; criterion: string; verdict: string | null };

function setup(scores: Score[], criteria: Record<string, string[]> = { [R2]: ['single_answer', 'natural'], [R3]: ['single_answer'] }) {
  const prisma = {
    aiJudgeRevision: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (criteria[where.id] ? { criteria: criteria[where.id]!.map((code) => ({ code, question: 'Q' })) } : null)),
    },
    aiJudgeScore: {
      findMany: vi.fn(async ({ where }: { where: { judgeRevisionId: string; subjectId: { in: string[] }; verdict: { not: null } } }) =>
        scores.filter((row) => row.judgeRevisionId === where.judgeRevisionId && where.subjectId.in.includes(row.subjectId) && row.verdict !== null)
          .map((row) => ({ subjectId: row.subjectId }))),
    },
  };
  return { reader: new JudgeScoresReader(prisma as never), prisma };
}

describe('JudgeScoresReader.judgedSubjects (B15)', () => {
  it('two criteria: a subject with two verdicts is judged; one with a NULL verdict, or only one score, is not', async () => {
    const { reader } = setup([
      { judgeRevisionId: R2, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' },
      { judgeRevisionId: R2, subjectId: 's1', criterion: 'natural', verdict: 'fail_minor' },
      { judgeRevisionId: R2, subjectId: 's2', criterion: 'single_answer', verdict: 'pass' },
      { judgeRevisionId: R2, subjectId: 's2', criterion: 'natural', verdict: null },
      { judgeRevisionId: R2, subjectId: 's3', criterion: 'single_answer', verdict: 'pass' },
    ]);
    await expect(reader.judgedSubjects(R2, ['s1', 's2', 's3', 's4'])).resolves.toEqual(new Set(['s1']));
  });

  it("another revision's verdicts do not count: R3 judged s1 completely, R2 has not", async () => {
    const { reader } = setup([{ judgeRevisionId: R3, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' }]);
    await expect(reader.judgedSubjects(R3, ['s1'])).resolves.toEqual(new Set(['s1']));
    await expect(reader.judgedSubjects(R2, ['s1'])).resolves.toEqual(new Set());
  });

  it('no ids → an empty set and no query at all', async () => {
    const { reader, prisma } = setup([]);
    await expect(reader.judgedSubjects(R2, [])).resolves.toEqual(new Set());
    expect(prisma.aiJudgeRevision.findUnique).not.toHaveBeenCalled();
    expect(prisma.aiJudgeScore.findMany).not.toHaveBeenCalled();
  });

  it('a repeated id is asked once; an unknown revision judged nothing', async () => {
    const { reader, prisma } = setup([{ judgeRevisionId: R3, subjectId: 's1', criterion: 'single_answer', verdict: 'pass' }]);
    await reader.judgedSubjects(R3, ['s1', 's1']);
    expect(prisma.aiJudgeScore.findMany.mock.calls[0]![0].where.subjectId.in).toEqual(['s1']);
    await expect(reader.judgedSubjects('00000000-0000-4000-8000-000000000000', ['s1'])).resolves.toEqual(new Set());
  });
});
