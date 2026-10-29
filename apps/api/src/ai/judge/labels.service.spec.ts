import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { LabelsService, type PutLabelBody } from './labels.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-30T03:00:00Z');
const ITEM = '22222222-2222-4222-8222-222222222222';
const REAL = '33333333-3333-4333-8333-333333333333';

type RunItem = { id: string; split: string; status: string; input: unknown; output: unknown; hidden: boolean };
const runItem = (over: Partial<RunItem> = {}): RunItem => ({ id: ITEM, split: 'dev', status: 'succeeded', input: { word: 'a' }, output: { sentence: 'b' }, hidden: false, ...over });

function setup(items: RunItem[] = [runItem()], passItems: Array<{ subjectKind: string; subjectId: string }> = [{ subjectKind: 'real_question', subjectId: REAL }]) {
  const prisma = {
    aiEvalRunItem: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => items.find((row) => row.id === where.id) ?? null) },
    aiJudgePassItem: {
      findFirst: vi.fn(async ({ where }: { where: { subjectKind: string; subjectId: string } }) =>
        passItems.find((row) => row.subjectKind === where.subjectKind && row.subjectId === where.subjectId) ?? null),
    },
    aiLabel: {
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({ id: randomUUID(), ...create })),
      deleteMany: vi.fn(async (_args: unknown) => ({ count: 1 })),
    },
  };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  return { service: new LabelsService(prisma as never, identity as never, new FakeClock(NOW)), prisma };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, violations: (problem.extensions?.violations ?? []) as string[] };
}

const evalBody = (over: Record<string, unknown> = {}): PutLabelBody => ({ subject_kind: 'eval_item', subject_id: ITEM, criterion: 'single_answer', verdict: 'pass', ...over }) as PutLabelBody;

describe('LabelsService.put (D16, R7, Review focus 3)', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('a verdict is upserted on (kind, subject, criterion) for the actor now, and the view names who labelled', async () => {
    const view = await ctx.service.put(ADMIN, evalBody());
    expect(ctx.prisma.aiLabel.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { subjectKind_subjectId_criterion: { subjectKind: 'eval_item', subjectId: ITEM, criterion: 'single_answer' } },
      create: { subjectKind: 'eval_item', subjectId: ITEM, criterion: 'single_answer', verdict: 'pass', labeledBy: ADMIN, labeledAt: NOW },
      update: { verdict: 'pass', labeledBy: ADMIN, labeledAt: NOW },
    });
    expect(view).toEqual({
      subject_kind: 'eval_item', subject_id: ITEM, criterion: 'single_answer', verdict: 'pass',
      labeled_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, labeled_at: NOW.toISOString(),
    });
  });

  it('each of the three verdicts is accepted; another is refused', async () => {
    for (const verdict of ['pass', 'fail_major', 'fail_minor']) await expect(ctx.service.put(ADMIN, evalBody({ verdict }))).resolves.toMatchObject({ verdict });
    expect((await problemOf(ctx.service.put(ADMIN, evalBody({ verdict: 'maybe' })))).violations[0]).toMatch(/^verdict: /);
  });

  it('verdict null removes the label: the view has no verdict and no labeller', async () => {
    const view = await ctx.service.put(ADMIN, evalBody({ verdict: null }));
    expect(ctx.prisma.aiLabel.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { subjectKind: 'eval_item', subjectId: ITEM, criterion: 'single_answer' } });
    expect(ctx.prisma.aiLabel.upsert).not.toHaveBeenCalled();
    expect(view).toEqual({ subject_kind: 'eval_item', subject_id: ITEM, criterion: 'single_answer', verdict: null, labeled_by_user: null, labeled_at: null });
  });

  it('R7: an item of the held-out split → 409 example-held-out and nothing is written', async () => {
    const held = setup([runItem({ split: 'held_out' })]);
    expect(await problemOf(held.service.put(ADMIN, evalBody()))).toMatchObject({ status: 409, type: 'example-held-out' });
    expect(await problemOf(held.service.put(ADMIN, evalBody({ verdict: null })))).toMatchObject({ status: 409, type: 'example-held-out' });
    expect(held.prisma.aiLabel.upsert).not.toHaveBeenCalled();
    expect(held.prisma.aiLabel.deleteMany).not.toHaveBeenCalled();
  });

  it('Review focus 3: an item without an output (a failed call) or without an input (a legacy result) cannot be labelled → 400', async () => {
    const failed = setup([runItem({ status: 'transient_failure', output: null })]);
    expect(await problemOf(failed.service.put(ADMIN, evalBody()))).toMatchObject({ status: 400, violations: ['subject_id: has no output'] });
    const legacy = setup([runItem({ input: null })]);
    expect(await problemOf(legacy.service.put(ADMIN, evalBody()))).toMatchObject({ status: 400, violations: ['subject_id: has no input'] });
    const notSucceeded = setup([runItem({ status: 'pending', output: null })]);
    expect(await problemOf(notSucceeded.service.put(ADMIN, evalBody()))).toMatchObject({ status: 400 });
    for (const other of [failed, legacy, notSucceeded]) expect(other.prisma.aiLabel.upsert).not.toHaveBeenCalled();
  });

  it('an unknown run item → 404; an item of a run that was "deleted" (hidden) → 404 too', async () => {
    expect(await problemOf(ctx.service.put(ADMIN, evalBody({ subject_id: randomUUID() })))).toMatchObject({ status: 404, type: 'not-found' });
    const hidden = setup([runItem({ hidden: true })]);
    expect(await problemOf(hidden.service.put(ADMIN, evalBody()))).toMatchObject({ status: 404 });
    expect(hidden.prisma.aiLabel.upsert).not.toHaveBeenCalled();
  });

  it('a real question that a pass holds is labelled; one no pass holds → 404', async () => {
    await expect(ctx.service.put(ADMIN, evalBody({ subject_kind: 'real_question', subject_id: REAL, verdict: 'fail_major' }))).resolves.toMatchObject({
      subject_kind: 'real_question', subject_id: REAL, verdict: 'fail_major',
    });
    expect(ctx.prisma.aiJudgePassItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { subjectKind: 'real_question', subjectId: REAL } }));
    expect(await problemOf(ctx.service.put(ADMIN, evalBody({ subject_kind: 'real_question', subject_id: randomUUID() })))).toMatchObject({ status: 404 });
  });

  it('the body is checked first: a criterion outside the pattern, a kind or a subject id that is not one, a missing verdict, an extra key → 400', async () => {
    for (const patch of [{ criterion: 'Single Answer' }, { criterion: '' }, { subject_kind: 'run' }, { subject_id: 'nope' }, { extra: 1 }]) {
      expect((await problemOf(ctx.service.put(ADMIN, evalBody(patch)))).status).toBe(400);
    }
    const { verdict: _omit, ...without } = evalBody();
    expect((await problemOf(ctx.service.put(ADMIN, without as never))).violations[0]).toMatch(/^verdict: /);
    expect(ctx.prisma.aiEvalRunItem.findUnique).not.toHaveBeenCalled();
  });

  it('the subject id is lower-cased before it is looked up', async () => {
    await expect(ctx.service.put(ADMIN, evalBody({ subject_id: ITEM.toUpperCase() }))).resolves.toMatchObject({ subject_id: ITEM });
  });
});
