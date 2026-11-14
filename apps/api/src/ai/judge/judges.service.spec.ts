import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { JudgesService, type JudgeBody } from './judges.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const OTHER_ADMIN = '99999999-9999-4999-8999-999999999999';
const NOW = new Date('2026-10-30T03:00:00Z');
const SONNET = '22222222-2222-4222-8222-222222222222';
const OTHER_SONNET = '33333333-3333-4333-8333-333333333333';
const GPT = '44444444-4444-4444-8444-444444444444';
const FAKE = '55555555-5555-4555-8555-555555555555';

const model = (id: string, provider: string, modelId: string, over: Record<string, unknown> = {}) => ({
  id, provider, modelId, effortLevels: ['low', 'high'], thinkingOff: provider === 'anthropic' ? 'disabled' : null, maxOutputTokens: 8000, ...over,
});

type RevRow = {
  id: string; judgeId: string; revision: number; criteria: unknown; instructions: string; examples: unknown; modelRef: string | null;
  effort: string | null; thinking: string | null; maxOutputTokens: number | null; savedBy: string; savedAt: Date;
};
type JudgeRow = { id: string; name: string; operations: string[]; active: boolean; createdBy: string; createdAt: Date };

const CRITERIA = [{ code: 'single_answer', question: 'Is the given word the only answer?' }];
const body = (over: Record<string, unknown> = {}): JudgeBody => ({
  name: 'Chỉ một đáp án (Sonnet)', operations: ['generate_cloze'], active: true, criteria: CRITERIA, instructions: 'Judge the question.',
  examples: [], model_ref: SONNET, effort: null, thinking: null, max_output_tokens: null, ...over,
} as JudgeBody);
const saveBody = (over: Record<string, unknown> = {}) => ({ ...body(), expected_revision: 1, ...over }) as JudgeBody & { expected_revision: number };

const p2002 = () => Object.assign(new Error('unique'), { code: 'P2002' });

function setup(init: { fakeEnabled?: boolean; registered?: string[] } = {}) {
  const models = new Map([
    [SONNET, model(SONNET, 'anthropic', 'claude-sonnet-x')], [OTHER_SONNET, model(OTHER_SONNET, 'anthropic', 'claude-haiku-x')],
    [GPT, model(GPT, 'openai', 'gpt-x')], [FAKE, model(FAKE, 'fake', 'fake:ok', { effortLevels: [] })],
  ]);
  const judges: JudgeRow[] = [];
  const revisions: RevRow[] = [];
  let tick = 0;
  const withModel = (row: RevRow | undefined) => (row ? { ...row, model: row.modelRef ? models.get(row.modelRef) ?? null : null } : null);
  const addRevision = (data: Omit<RevRow, 'id' | 'savedAt'>) => {
    if (revisions.some((row) => row.judgeId === data.judgeId && row.revision === data.revision)) throw p2002();
    const row: RevRow = { ...data, id: randomUUID(), savedAt: new Date(NOW.getTime() + (tick += 1000)) };
    revisions.push(row);
    return row;
  };
  const prisma = {
    aiJudge: {
      findMany: vi.fn(async (_args?: unknown) => [...judges]),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => judges.find((row) => row.id === where.id) ?? null),
      create: vi.fn(async ({ data }: { data: { name: string; operations: string[]; active: boolean; createdBy: string; revisions: { create: Omit<RevRow, 'id' | 'judgeId' | 'savedAt'> } } }) => {
        const row: JudgeRow = { id: randomUUID(), name: data.name, operations: data.operations, active: data.active, createdBy: data.createdBy, createdAt: new Date(NOW.getTime() + (tick += 1000)) };
        judges.push(row);
        addRevision({ judgeId: row.id, ...data.revisions.create });
        return { id: row.id };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<JudgeRow> }) => {
        const row = judges.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
    aiJudgeRevision: {
      findMany: vi.fn(async ({ where }: { where: { judgeId: string | { in: string[] } } }) => {
        const ids = typeof where.judgeId === 'string' ? [where.judgeId] : where.judgeId.in;
        return revisions.filter((row) => ids.includes(row.judgeId)).sort((a, b) => b.revision - a.revision).map(withModel);
      }),
      findFirst: vi.fn(async ({ where }: { where: { judgeId: string } }) =>
        withModel(revisions.filter((row) => row.judgeId === where.judgeId).sort((a, b) => b.revision - a.revision)[0])),
      create: vi.fn(async ({ data }: { data: Omit<RevRow, 'id' | 'savedAt'> }) => addRevision(data)),
    },
    aiModel: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => models.get(where.id) ?? null) },
    $transaction: vi.fn(async (work: (client: unknown) => Promise<unknown>) => work(prisma)),
  };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  const registry = new AiAdapterRegistry();
  for (const provider of init.registered ?? ['anthropic', 'fake']) registry.register({ provider } as never);
  const service = new JudgesService(prisma as never, identity as never, registry, { ai: { fakeEnabled: init.fakeEnabled ?? true } } as never);
  return { service, prisma, judges, revisions, models };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, violations: (problem.extensions?.violations ?? []) as string[] };
}

describe('JudgesService.create (B12, E13)', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('an OpenAI model → 422 judge-provider and nothing is written', async () => {
    expect(await problemOf(ctx.service.create(ADMIN, body({ model_ref: GPT })))).toMatchObject({ status: 422, type: 'judge-provider' });
    expect(ctx.prisma.aiJudge.create).not.toHaveBeenCalled();
    expect(ctx.judges).toHaveLength(0);
  });

  it('an Anthropic model → created with revision 1, its model, who saved it and no trace of a draft or a publish', async () => {
    const view = await ctx.service.create(ADMIN, body());
    expect(view).toEqual({
      id: expect.any(String), name: 'Chỉ một đáp án (Sonnet)', operations: ['generate_cloze'], active: true, created_at: expect.any(String),
      latest: {
        id: expect.any(String), revision: 1, criteria: CRITERIA, instructions: 'Judge the question.', examples: [],
        model: { id: SONNET, provider: 'anthropic', model_id: 'claude-sonnet-x' }, effort: null, thinking: null, max_output_tokens: null,
        saved_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, saved_at: expect.any(String),
      },
    });
    expect(ctx.prisma.aiJudge.create).toHaveBeenCalledTimes(1);
    expect(ctx.revisions).toHaveLength(1);
    expect(ctx.judges[0]).toMatchObject({ createdBy: ADMIN });
  });

  it('the fake model with fakeEnabled false → 422; with true → created, latest.model.model_id fake:ok', async () => {
    const off = setup({ fakeEnabled: false });
    expect(await problemOf(off.service.create(ADMIN, body({ model_ref: FAKE })))).toMatchObject({ status: 422, type: 'judge-provider' });
    expect(off.judges).toHaveLength(0);
    const view = await ctx.service.create(ADMIN, body({ model_ref: FAKE }));
    expect(view.latest).toMatchObject({ revision: 1, model: { model_id: 'fake:ok', provider: 'fake' } });
  });

  it('a judge without a model is allowed (the seeded one has none yet)', async () => {
    const view = await ctx.service.create(ADMIN, body({ model_ref: null }));
    expect(view.latest.model).toBeNull();
  });

  it('the checks run in order: schema 400, prompt rules 400, unknown model 400, provider 422, provider not registered 409, selection 400', async () => {
    expect(await problemOf(ctx.service.create(ADMIN, body({ name: '   ' })))).toMatchObject({ status: 400, violations: [expect.stringMatching(/^name: /)] });
    expect(await problemOf(ctx.service.create(ADMIN, body({ instructions: '   ' })))).toMatchObject({ status: 400, violations: ['instructions: Must not be blank'] });
    expect(await problemOf(ctx.service.create(ADMIN, body({ model_ref: randomUUID() })))).toMatchObject({ status: 400, violations: ['model_ref: not found'] });
    expect(await problemOf(ctx.service.create(ADMIN, body({ model_ref: GPT })))).toMatchObject({ status: 422 });
    expect(await problemOf(setup({ registered: ['fake'] }).service.create(ADMIN, body()))).toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(await problemOf(ctx.service.create(ADMIN, body({ effort: 'nope' })))).toMatchObject({ status: 400, violations: ['effort: not offered by this model'] });
    expect(ctx.judges).toHaveLength(0);
  });

  it('criteria: duplicate codes → 400 criteria: codes must be unique; 0 or 11 criteria, a bad code, a long question are refused', async () => {
    const dup = [CRITERIA[0], { code: 'single_answer', question: 'Again?' }];
    expect(await problemOf(ctx.service.create(ADMIN, body({ criteria: dup })))).toMatchObject({ status: 400, violations: ['criteria: codes must be unique'] });
    expect((await problemOf(ctx.service.create(ADMIN, body({ criteria: [] })))).violations[0]).toMatch(/^criteria: /);
    const many = Array.from({ length: 11 }, (_, index) => ({ code: `c${index}`, question: 'Q' }));
    expect((await problemOf(ctx.service.create(ADMIN, body({ criteria: many })))).violations[0]).toMatch(/^criteria: /);
    expect((await problemOf(ctx.service.create(ADMIN, body({ criteria: [{ code: 'Bad Code', question: 'Q' }] })))).violations[0]).toMatch(/^criteria\.0\.code: /);
    expect((await problemOf(ctx.service.create(ADMIN, body({ criteria: [{ code: 'ok', question: 'q'.repeat(501) }] })))).violations[0]).toMatch(/^criteria\.0\.question: /);
    const ten = Array.from({ length: 10 }, (_, index) => ({ code: `c${index}`, question: 'Q' }));
    await expect(ctx.service.create(ADMIN, body({ criteria: ten }))).resolves.toMatchObject({ latest: { revision: 1 } });
  });

  it('operations: empty, a repeat or an unknown name are refused', async () => {
    expect((await problemOf(ctx.service.create(ADMIN, body({ operations: [] })))).violations[0]).toMatch(/^operations: /);
    expect((await problemOf(ctx.service.create(ADMIN, body({ operations: ['generate_cloze', 'generate_cloze'] })))).violations[0]).toMatch(/^operations: /);
    expect((await problemOf(ctx.service.create(ADMIN, body({ operations: ['judge'] })))).violations[0]).toMatch(/^operations\.0: /);
  });

  it('a name of 101 characters is refused, 100 accepted; the name is trimmed', async () => {
    expect((await problemOf(ctx.service.create(ADMIN, body({ name: 'n'.repeat(101) })))).violations[0]).toMatch(/^name: /);
    await expect(ctx.service.create(ADMIN, body({ name: `  ${'n'.repeat(100)}  ` }))).resolves.toMatchObject({ name: 'n'.repeat(100) });
  });
});

describe('JudgesService.save (Review focus 4, B12)', () => {
  let ctx: ReturnType<typeof setup>;
  let judgeId: string;
  beforeEach(async () => {
    ctx = setup();
    judgeId = (await ctx.service.create(ADMIN, body())).id;
  });

  it('a stale expected_revision → 409 judge-revision-conflict and nothing changes', async () => {
    await ctx.service.save(ADMIN, judgeId, saveBody({ criteria: [{ code: 'single_answer', question: 'Changed?' }] }));
    expect(ctx.revisions).toHaveLength(2);
    const before = structuredClone(ctx.judges);
    expect(await problemOf(ctx.service.save(ADMIN, judgeId, saveBody({ name: 'Renamed', expected_revision: 1 })))).toMatchObject({ status: 409, type: 'judge-revision-conflict' });
    expect(ctx.judges).toEqual(before);
    expect(ctx.revisions).toHaveLength(2);
  });

  it('only the name, the operations or active changed → no new revision, the view keeps revision 1 and the new name', async () => {
    const view = await ctx.service.save(OTHER_ADMIN, judgeId, saveBody({ name: 'Renamed', operations: ['generate_cloze', 'lookup_word'], active: false }));
    expect(ctx.prisma.aiJudgeRevision.create).not.toHaveBeenCalled();
    expect(ctx.revisions).toHaveLength(1);
    expect(view).toMatchObject({ name: 'Renamed', operations: ['generate_cloze', 'lookup_word'], active: false, latest: { revision: 1 } });
    // The revision keeps its saver: the rename is not a new version of the judge's text.
    expect(view.latest.saved_by_user.id).toBe(ADMIN);
  });

  it('a new criteria list → revision 2 by the actor; examples, model, effort, thinking, tokens each count as a change too', async () => {
    const changes: Array<[string, Record<string, unknown>]> = [
      ['criteria', { criteria: [{ code: 'single_answer', question: 'Changed?' }] }],
      ['instructions', { instructions: 'Other text.' }],
      ['examples', { examples: [{
        input: { target_operation: 'generate_cloze', input: { word: 'a', part_of_speech: 'verb', level: null, meaning_vi: 'b', context_label: null },
          output: { sentence: 'x ___', accepted_answers: ['a'], translation_vi: 'y' }, criteria: CRITERIA, context: null },
        output: { codes: ['single_answer'], verdicts: ['pass'], reasons: ['r'] },
      }] }],
      ['model_ref', { model_ref: OTHER_SONNET }],
      ['effort', { effort: 'low' }],
      ['thinking', { thinking: 'off' }],
      ['max_output_tokens', { max_output_tokens: 500 }],
    ];
    // Each save sends the whole body, changed in exactly one field from the revision before it.
    let current: Record<string, unknown> = body();
    let revision = 1;
    for (const [name, patch] of changes) {
      current = { ...current, ...patch };
      const view = await ctx.service.save(OTHER_ADMIN, judgeId, { ...current, expected_revision: revision } as never);
      revision += 1;
      expect(view.latest.revision, name).toBe(revision);
      expect(view.latest.saved_by_user.id, name).toBe(OTHER_ADMIN);
    }
    expect(ctx.revisions).toHaveLength(1 + changes.length);
  });

  it('the same body with the keys of criteria in another order is no change (jsonb does not keep key order)', async () => {
    ctx.revisions[0]!.criteria = [{ question: CRITERIA[0]!.question, code: CRITERIA[0]!.code }];
    await ctx.service.save(ADMIN, judgeId, saveBody({ name: 'Renamed' }));
    expect(ctx.revisions).toHaveLength(1);
  });

  it('save also runs the create checks: an OpenAI model → 422 and the judge is untouched', async () => {
    expect(await problemOf(ctx.service.save(ADMIN, judgeId, saveBody({ model_ref: GPT, name: 'Renamed' })))).toMatchObject({ status: 422, type: 'judge-provider' });
    expect(ctx.judges[0]!.name).toBe('Chỉ một đáp án (Sonnet)');
  });

  it('an unknown judge → 404; duplicate codes → 400 criteria: codes must be unique', async () => {
    expect(await problemOf(ctx.service.save(ADMIN, randomUUID(), saveBody()))).toMatchObject({ status: 404, type: 'not-found' });
    const dup = [CRITERIA[0], { code: 'single_answer', question: 'Again?' }];
    expect(await problemOf(ctx.service.save(ADMIN, judgeId, saveBody({ criteria: dup })))).toMatchObject({ status: 400, violations: ['criteria: codes must be unique'] });
  });

  it('two saves of the same revision at once: the loser of the unique index → 409 judge-revision-conflict', async () => {
    ctx.prisma.aiJudgeRevision.create.mockImplementationOnce(async () => { throw p2002(); });
    expect(await problemOf(ctx.service.save(ADMIN, judgeId, saveBody({ instructions: 'Other text.' })))).toMatchObject({ status: 409, type: 'judge-revision-conflict' });
  });

  it('a missing expected_revision, or 0, → 400', async () => {
    const { expected_revision: _omit, ...without } = saveBody();
    expect((await problemOf(ctx.service.save(ADMIN, judgeId, without as never))).violations[0]).toMatch(/^expected_revision: /);
    expect((await problemOf(ctx.service.save(ADMIN, judgeId, saveBody({ expected_revision: 0 })))).violations[0]).toMatch(/^expected_revision: /);
  });
});

describe('JudgesService.clone, list, revisions, latestRevision', () => {
  let ctx: ReturnType<typeof setup>;
  let judgeId: string;
  beforeEach(async () => {
    ctx = setup();
    judgeId = (await ctx.service.create(ADMIN, body({ name: 'Chỉ một đáp án', effort: 'low', max_output_tokens: 900 }))).id;
  });
  /** A save of the judge made in `beforeEach`, changed as the test says (the name and settings stay as they were made). */
  const resave = (over: Record<string, unknown>) => saveBody({ name: 'Chỉ một đáp án', effort: 'low', max_output_tokens: 900, ...over });


  it('clone makes a new judge with the same operations, active true and revision 1 = the source newest revision fields', async () => {
    await ctx.service.save(ADMIN, judgeId, resave({ instructions: 'Newest text.', active: false }));
    const cloned = await ctx.service.clone(OTHER_ADMIN, judgeId, { name: 'Chỉ một đáp án (Sonnet)' });
    expect(cloned.id).not.toBe(judgeId);
    expect(cloned).toMatchObject({
      name: 'Chỉ một đáp án (Sonnet)', operations: ['generate_cloze'], active: true,
      latest: {
        revision: 1, criteria: CRITERIA, instructions: 'Newest text.', model: { id: SONNET }, effort: 'low', max_output_tokens: 900,
        saved_by_user: { id: OTHER_ADMIN },
      },
    });
    expect(ctx.judges.find((row) => row.id === cloned.id)).toMatchObject({ createdBy: OTHER_ADMIN });
    // The source is untouched.
    expect(ctx.judges.find((row) => row.id === judgeId)).toMatchObject({ name: 'Chỉ một đáp án', active: false });
  });

  it('clone of an unknown judge → 404; a blank name → 400', async () => {
    expect(await problemOf(ctx.service.clone(ADMIN, randomUUID(), { name: 'x' }))).toMatchObject({ status: 404 });
    expect((await problemOf(ctx.service.clone(ADMIN, judgeId, { name: '  ' }))).violations[0]).toMatch(/^name: /);
  });

  it('list: oldest judge first, each with its newest revision; none → empty', async () => {
    expect(await setup().service.list()).toEqual({ items: [] });
    await ctx.service.save(ADMIN, judgeId, resave({ instructions: 'Newest text.' }));
    const second = await ctx.service.clone(ADMIN, judgeId, { name: 'Copy' });
    const { items } = await ctx.service.list();
    expect(items.map((item) => [item.id, item.latest.revision, item.latest.instructions])).toEqual([
      [judgeId, 2, 'Newest text.'], [second.id, 1, 'Newest text.'],
    ]);
  });

  it('a revision saved by the system actor is marked system', async () => {
    ctx.revisions[0]!.savedBy = AI_SYSTEM_ACTOR_ID;
    expect((await ctx.service.list()).items[0]!.latest.saved_by_user).toEqual({ id: AI_SYSTEM_ACTOR_ID, email: null, system: true });
  });

  it('revisions: newest first; an unknown judge → 404', async () => {
    await ctx.service.save(ADMIN, judgeId, resave({ instructions: 'Two.' }));
    await ctx.service.save(ADMIN, judgeId, resave({ instructions: 'Three.', expected_revision: 2 }));
    const { items } = await ctx.service.revisions(judgeId);
    expect(items.map((item) => [item.revision, item.instructions])).toEqual([[3, 'Three.'], [2, 'Two.'], [1, 'Judge the question.']]);
    expect(await problemOf(ctx.service.revisions(randomUUID()))).toMatchObject({ status: 404 });
  });

  it('latestRevision gives the id and number of the newest revision; an unknown judge → null', async () => {
    await ctx.service.save(ADMIN, judgeId, resave({ instructions: 'Two.' }));
    const newest = ctx.revisions.find((row) => row.judgeId === judgeId && row.revision === 2)!;
    await expect(ctx.service.latestRevision(judgeId)).resolves.toEqual({ id: newest.id, revision: 2 });
    await expect(ctx.service.latestRevision(randomUUID())).resolves.toBeNull();
  });
});
