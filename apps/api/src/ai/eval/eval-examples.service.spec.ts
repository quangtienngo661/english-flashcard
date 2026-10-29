import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { EVAL_EXAMPLES_PER_OPERATION_MAX, EVAL_NOTE_MAX } from '../ai.constants.js';
import { EvalExamplesService } from './eval-examples.service.js';
import { EvalRulesRegistry, type EvalRules } from './eval-rules.port.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };
const FORMS = { forms: ['deploy', 'deployed'] };

type Row = {
  id: string; operation: string; input: unknown; note: string | null; createdBy: string; createdAt: Date; updatedAt: Date;
  split: string; expected: unknown; source: string; sourceRef: string | null; revealedAt: Date | null;
};

const stored = (over: Partial<Row> = {}): Row => ({
  id: randomUUID(), operation: 'generate_cloze', input: INPUT, note: null, createdBy: ADMIN, createdAt: new Date(), updatedAt: new Date(),
  split: 'dev', expected: FORMS, source: 'manual', sourceRef: null, revealedAt: null, ...over,
});

type Where = { operation?: string; split?: string };
const matches = (row: Row, where: Where) => (where.operation === undefined || row.operation === where.operation)
  && (where.split === undefined || row.split === where.split);

function fakePrisma() {
  const rows: Row[] = [];
  return {
    rows,
    aiEvalExample: {
      findMany: vi.fn(async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where))),
      count: vi.fn(async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where)).length),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Partial<Row> }) => {
        const row = stored({ expected: null, ...data });
        rows.push(row);
        return row;
      }),
      createMany: vi.fn(async ({ data }: { data: Array<Partial<Row>> }) => {
        for (const item of data) rows.push(stored({ expected: null, ...item }));
        return { count: data.length };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = rows.findIndex((row) => row.id === where.id);
        if (index >= 0) rows.splice(index, 1);
        return { count: index >= 0 ? 1 : 0 };
      }),
    },
  };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return {
    status: problem.getStatus(), type: problem.problemType, extensions: problem.extensions as { violations: string[] } | undefined,
  };
}

describe('EvalExamplesService', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let service: EvalExamplesService;
  let emailsOf: ReturnType<typeof vi.fn>;
  let registry: EvalRulesRegistry;
  beforeEach(() => {
    prisma = fakePrisma();
    emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
    registry = new EvalRulesRegistry();
    const settings = { get: vi.fn(async () => ({ ai: { evalHeldOutRatio: 0.3 } })) };
    service = new EvalExamplesService(prisma as never, { emailsOf } as never, settings as never, registry);
  });

  /** A dev example is made by putting a held-out one first: the empty set always starts with held-out. */
  const seed = (...rows: Array<Partial<Row>>) => { for (const row of rows) prisma.rows.push(stored(row)); };

  it('create stores the example and returns its view', async () => {
    seed({ split: 'held_out' });
    const view = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS, note: 'a natural B1 sentence' });
    expect(view).toMatchObject({ operation: 'generate_cloze', input: INPUT, note: 'a natural B1 sentence', created_by: ADMIN, split: 'dev' });
    expect(prisma.rows).toHaveLength(2);
  });

  it('an input that breaks the operation rules → 400 with paths input.<field>, nothing saved', async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: { ...INPUT, meaning_vi: '' }, expected: FORMS }));
    expect(problem.status).toBe(400);
    expect(problem.type).toBe('validation-failed');
    expect(problem.extensions!.violations).toEqual([expect.stringMatching(/^input\.meaning_vi: /)]);
    expect(prisma.rows).toHaveLength(0);
  });

  it('B2: a bad input without an expected answer is still a 400, before the 422', async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: { ...INPUT, meaning_vi: '' } }));
    expect(problem).toMatchObject({ status: 400, type: 'validation-failed' });
  });

  it('B2: a cloze without an expected answer → 422 expected-invalid with the violation, nothing created', async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT }));
    expect(problem).toMatchObject({ status: 422, type: 'expected-invalid', extensions: { violations: ['expected: required for generate_cloze'] } });
    expect(prisma.rows).toHaveLength(0);
    expect(prisma.aiEvalExample.create).not.toHaveBeenCalled();
  });

  it('B2: translate_sentence takes no expected answer', async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'translate_sentence', input: { sentence: 'Hi.' }, expected: FORMS }));
    expect(problem).toMatchObject({ status: 422, type: 'expected-invalid', extensions: { violations: ['expected: translate_sentence has no expected answer'] } });
  });

  it(`a note over ${EVAL_NOTE_MAX} characters → 400 note`, async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS, note: 'x'.repeat(EVAL_NOTE_MAX + 1) }));
    expect(problem.extensions!.violations).toEqual([expect.stringMatching(/^note: /)]);
  });

  it('plan choice 13: the 101st example → 400 operation: at most 100 examples (after the expected check)', async () => {
    for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX; i += 1) seed({ split: 'dev' });
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS }));
    expect(problem.extensions!.violations).toEqual([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    expect(prisma.rows).toHaveLength(EVAL_EXAMPLES_PER_OPERATION_MAX);
    const missing = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT }));
    expect(missing.type).toBe('expected-invalid');
  });

  it('another operation does not count toward the limit', async () => {
    for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX; i += 1) seed({ operation: 'lookup_word', input: {}, expected: null });
    await expect(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS })).resolves.toMatchObject({ id: expect.any(String) });
  });

  describe('E10: the split of a new example', () => {
    it('B3: the first example of an empty working set is held-out, and its answer does not echo it', async () => {
      const answer = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS });
      expect(prisma.rows[0]).toMatchObject({ split: 'held_out', source: 'manual', createdBy: ADMIN });
      expect(answer).toEqual({ id: prisma.rows[0]!.id, split: 'held_out' });
    });

    it('with 1 held-out of 1 the next is dev', async () => {
      seed({ split: 'held_out' });
      const answer = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS });
      expect(prisma.rows[1]).toMatchObject({ split: 'dev', source: 'manual' });
      expect(answer).toMatchObject({ split: 'dev', input: INPUT });
    });

    it('uses the ratio setting and counts the whole working set of the operation, not another operation', async () => {
      seed(...Array.from({ length: 7 }, () => stored({ split: 'dev' })), { operation: 'lookup_word', split: 'dev' });
      // 0 held-out of 7 cloze examples: 0×100 < 30×7 → held-out.
      await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS });
      expect(prisma.rows.at(-1)).toMatchObject({ operation: 'generate_cloze', split: 'held_out' });
    });

    it('the expected answer is stored normalized (trimmed, no repeated form)', async () => {
      seed({ split: 'held_out' });
      await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: { forms: [' deploy ', 'deploy', 'deployed'] } });
      expect(prisma.rows[1]!.expected).toEqual({ forms: ['deploy', 'deployed'] });
    });
  });

  describe('list', () => {
    it('B3: a held-out row is exactly { id, split }; a dev row carries its answer, source and reveal time', async () => {
      seed({ id: 'e1', split: 'dev', source: 'manual', createdAt: new Date('2026-10-01T00:00:00Z') }, { id: 'e2', split: 'held_out', note: 'secret' });
      const { items } = await service.list('generate_cloze');
      expect(items[1]).toEqual({ id: 'e2', split: 'held_out' });
      expect(items[0]).toMatchObject({
        id: 'e1', split: 'dev', expected: FORMS, source: 'manual', source_ref: null, revealed_at: null, input: INPUT,
      });
    });

    it('a revealed example is a dev example with its reveal time', async () => {
      seed({ id: 'e1', split: 'dev', source: 'import', sourceRef: 'row 3', revealedAt: new Date('2026-10-05T01:02:03Z') });
      const { items } = await service.list('generate_cloze');
      expect(items[0]).toMatchObject({ source: 'import', source_ref: 'row 3', revealed_at: '2026-10-05T01:02:03.000Z' });
    });

    it('asks for the operation\'s examples, oldest first, at most 1000', async () => {
      seed({ split: 'dev' });
      await service.list('generate_cloze');
      expect(prisma.aiEvalExample.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: EVAL_EXAMPLES_PER_OPERATION_MAX,
      }));
    });

    it('one emailsOf call with every author of the dev rows; unknown author has email null', async () => {
      const other = '22222222-2222-4222-8222-222222222222';
      seed({ createdBy: ADMIN }, { createdBy: other });
      emailsOf.mockClear();
      const { items } = await service.list('generate_cloze');
      expect(emailsOf).toHaveBeenCalledTimes(1);
      expect([...emailsOf.mock.calls[0]![0] as string[]].sort()).toEqual([ADMIN, other].sort());
      expect(items.map((item) => (item as { created_by_user: unknown }).created_by_user)).toEqual([
        { id: ADMIN, email: 'admin@x.test', system: false }, { id: other, email: null, system: false },
      ]);
    });
  });

  describe('update', () => {
    it('checks the new input against the example\'s own operation', async () => {
      seed({ id: 'e1', split: 'dev' });
      const problem = await problemOf(service.update('e1', { input: { sentence: 'Hello.' } }));
      expect(problem.extensions!.violations.every((v) => v.startsWith('input.') || v.startsWith('input:'))).toBe(true);
      const view = await service.update('e1', { input: { ...INPUT, word: 'release' }, note: null });
      expect(view).toMatchObject({ input: { word: 'release' }, note: null });
    });

    it('B3: a held-out example cannot be edited → 409 example-held-out, nothing written', async () => {
      seed({ id: 'h1', split: 'held_out' });
      expect(await problemOf(service.update('h1', { note: 'x' }))).toMatchObject({ status: 409, type: 'example-held-out' });
      expect(prisma.aiEvalExample.update).not.toHaveBeenCalled();
    });

    it('B2: a note change on a migrated cloze example (no expected answer) → 422 until the answer is given', async () => {
      seed({ id: 'e1', split: 'dev', expected: null });
      expect(await problemOf(service.update('e1', { note: 'x' }))).toMatchObject({
        status: 422, type: 'expected-invalid', extensions: { violations: ['expected: required for generate_cloze'] },
      });
      expect(prisma.aiEvalExample.update).not.toHaveBeenCalled();
    });

    it('B2: a patch with an expected answer stores it normalized', async () => {
      seed({ id: 'e1', split: 'dev', expected: null });
      const view = await service.update('e1', { expected: { forms: ['go', ' go'] } });
      expect(view).toMatchObject({ expected: { forms: ['go'] } });
      expect(prisma.rows[0]!.expected).toEqual({ forms: ['go'] });
    });

    it('a patch without an expected answer keeps the stored one', async () => {
      seed({ id: 'e1', split: 'dev', expected: FORMS });
      await service.update('e1', { note: 'changed' });
      expect(prisma.aiEvalExample.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { note: 'changed' } });
    });

    it('B5: editing a dev example never touches the frozen set items or the run items', async () => {
      seed({ id: 'e1', split: 'dev' });
      const prismaWithOthers = prisma as unknown as Record<string, unknown>;
      prismaWithOthers.aiEvalSetItem = { updateMany: vi.fn() };
      prismaWithOthers.aiEvalRunItem = { updateMany: vi.fn() };
      await service.update('e1', { note: 'n' });
      expect((prismaWithOthers.aiEvalSetItem as { updateMany: unknown }).updateMany).not.toHaveBeenCalled();
      expect((prismaWithOthers.aiEvalRunItem as { updateMany: unknown }).updateMany).not.toHaveBeenCalled();
    });

    it('update and remove of an unknown id → 404 not-found', async () => {
      expect((await problemOf(service.update(randomUUID(), { note: 'x' }))).type).toBe('not-found');
      expect((await problemOf(service.remove(randomUUID()))).type).toBe('not-found');
    });

    it('create and update return created_by_user', async () => {
      seed({ id: 'e0', split: 'held_out' });
      const created = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, expected: FORMS });
      expect((created as { created_by_user: unknown }).created_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
      const updated = await service.update((created as { id: string }).id, { note: 'n' });
      expect(updated.created_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
    });
  });

  it('remove deletes the example', async () => {
    seed({ id: 'e1' });
    await service.remove('e1');
    expect(prisma.rows).toHaveLength(0);
  });

  describe('createMany', () => {
    const good = (word: string, over: Record<string, unknown> = {}) => ({ input: { ...INPUT, word }, note: word, expected: { forms: [word] }, ...over });
    const bad = { input: { ...INPUT, meaning_vi: '' }, expected: FORMS };

    it('stores the valid rows in file order and lists the invalid ones by row number (owner: only the right rows go in)', async () => {
      const answer = await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), bad, good('c'), good('d')] });
      expect(answer).toEqual({
        total: 5, valid: 4, created: 4,
        invalid: [{ row: 3, violations: [expect.stringMatching(/^input.meaning_vi/)] }],
      });
      expect(prisma.rows.map((row) => (row.input as { word: string }).word)).toEqual(['a', 'b', 'c', 'd']);
      expect(prisma.rows.every((row) => row.createdBy === ADMIN && row.operation === 'generate_cloze')).toBe(true);
    });

    it('E10: on an empty set four rows without split land held-out, dev, dev, dev, as source import', async () => {
      await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), good('c'), good('d')] });
      expect(prisma.rows.map((row) => row.split)).toEqual(['held_out', 'dev', 'dev', 'dev']);
      expect(prisma.rows.every((row) => row.source === 'import')).toBe(true);
      expect(prisma.rows[0]!.expected).toEqual({ forms: ['a'] });
    });

    it('D8.2: a row with its own split keeps it, and still counts for the rows after it', async () => {
      await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a', { split: 'dev' }), good('b'), good('c', { split: 'held_out' }), good('d')] });
      // a: dev [0 of 1 held-out]; b: 0×100 < 30×1 → held_out [1 of 2]; c: held_out by the file [2 of 3]; d: 200 < 90? no → dev.
      expect(prisma.rows.map((row) => row.split)).toEqual(['dev', 'held_out', 'held_out', 'dev']);
    });

    it('a row with split "x" → only that row is rejected', async () => {
      const answer = await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b', { split: 'x' })] });
      expect(answer).toMatchObject({ valid: 1, invalid: [{ row: 2, violations: ['split: dev or held_out'] }] });
    });

    it('B2: a row without expected is rejected by line', async () => {
      const answer = await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), { input: { ...INPUT, word: 'b' } }] });
      expect(answer).toMatchObject({ valid: 1, invalid: [{ row: 2, violations: ['expected: required for generate_cloze'] }] });
    });

    it('Review focus 5: an expected cell of plain text rejects only its row, the others are stored', async () => {
      const answer = await service.createMany(ADMIN, {
        operation: 'generate_cloze', rows: [good('a'), good('b', { expected: 'deploy, deployed' }), good('c')],
      });
      expect(answer).toMatchObject({ total: 3, valid: 2, created: 2, invalid: [{ row: 2, violations: ['expected: must be an object'] }] });
      expect(prisma.rows.map((row) => (row.input as { word: string }).word)).toEqual(['a', 'c']);
    });

    it('rows keep their order when listed: createdAt rises by row even inside one batch', async () => {
      await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), good('c')] });
      const times = prisma.rows.map((row) => row.createdAt.getTime());
      expect(times).toEqual([...times].sort((x, y) => x - y));
      expect(new Set(times).size).toBe(3);
    });

    it('all rows invalid → nothing stored and no insert is made', async () => {
      const answer = await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [bad, bad] });
      expect(answer).toMatchObject({ total: 2, valid: 0, created: 0, invalid: [{ row: 1 }, { row: 2 }] });
      expect(prisma.aiEvalExample.createMany).not.toHaveBeenCalled();
    });

    it('a note over the limit makes only that row invalid', async () => {
      const answer = await service.createMany(ADMIN, {
        operation: 'generate_cloze', rows: [good('a'), { ...good('b'), note: 'x'.repeat(EVAL_NOTE_MAX + 1) }],
      });
      expect(answer).toMatchObject({ valid: 1, created: 1, invalid: [{ row: 2, violations: [expect.stringMatching(/^note: /)] }] });
    });

    it('the valid rows that would pass the limit refuse the whole batch: nothing stored, the room left is named', async () => {
      for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX - 2; i += 1) seed({ split: 'dev' });
      const problem = await problemOf(service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), bad, good('c')] }));
      expect(problem).toMatchObject({ status: 400, extensions: { violations: ['operation: room for 2 more examples, 3 valid rows sent'] } });
      expect(prisma.rows).toHaveLength(EVAL_EXAMPLES_PER_OPERATION_MAX - 2);
    });

    it('invalid rows do not count against the room left', async () => {
      for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX - 1; i += 1) seed({ split: 'dev' });
      await expect(service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), bad, bad] })).resolves.toMatchObject({ created: 1 });
    });

    it('no rows, an unknown operation or an extra key → 400', async () => {
      await expect(service.createMany(ADMIN, { operation: 'generate_cloze', rows: [] })).rejects.toBeInstanceOf(ProblemDetailsException);
      await expect(service.createMany(ADMIN, { operation: 'nope' as never, rows: [good('a')] })).rejects.toBeInstanceOf(ProblemDetailsException);
      await expect(service.createMany(ADMIN, { operation: 'generate_cloze', rows: [{ ...good('a'), extra: 1 } as never] })).rejects.toBeInstanceOf(ProblemDetailsException);
      expect(prisma.rows).toHaveLength(0);
    });

    it('more rows than the per-operation limit in one request → 400 before any check', async () => {
      const rows = Array.from({ length: EVAL_EXAMPLES_PER_OPERATION_MAX + 1 }, (_, i) => good(`w${i}`));
      const problem = await problemOf(service.createMany(ADMIN, { operation: 'generate_cloze', rows }));
      expect(problem.status).toBe(400);
      expect(prisma.rows).toHaveLength(0);
    });
  });

  describe('forms (design §5.1, B2)', () => {
    const stub = (forms: string[] | null): EvalRules => ({
      check: vi.fn(), formsOf: vi.fn(async () => forms), matchesExpected: vi.fn(),
    }) as unknown as EvalRules;

    it('asks the registered rules for the catalog forms of the word', async () => {
      const rules = stub(['deploy', 'deployed']);
      registry.register(rules);
      expect(await service.forms('deploy', 'verb')).toEqual({ forms: ['deploy', 'deployed'] });
      expect(rules.formsOf).toHaveBeenCalledWith('deploy', 'verb');
    });

    it('no rules registered, or a word the catalog does not have → forms null', async () => {
      expect(await service.forms('deploy', 'verb')).toEqual({ forms: null });
      registry.register(stub(null));
      expect(await service.forms('lit', 'adjective')).toEqual({ forms: null });
    });
  });

  describe('createFromSource (D27.3, contract §4)', () => {
    const args = {
      operation: 'generate_cloze' as const, input: INPUT, expected: FORMS, note: 'from a report', source: 'report' as const, sourceRef: 'r-1', actorId: ADMIN,
    };

    it('stores a dev example with the source and its reference, whatever the ratio says, and returns its id', async () => {
      const answer = await service.createFromSource(args);
      expect(prisma.rows).toHaveLength(1);
      expect(prisma.rows[0]).toMatchObject({ split: 'dev', source: 'report', sourceRef: 'r-1', note: 'from a report', createdBy: ADMIN });
      expect(prisma.rows[0]!.expected).toEqual(FORMS);
      expect(answer).toEqual({ id: prisma.rows[0]!.id });
    });

    it('runs the same checks: no expected answer → 422; a bad input → 400; the 1000 limit', async () => {
      expect(await problemOf(service.createFromSource({ ...args, expected: null }))).toMatchObject({ status: 422, type: 'expected-invalid' });
      expect(await problemOf(service.createFromSource({ ...args, input: { ...INPUT, meaning_vi: '' } }))).toMatchObject({ status: 400 });
      for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX; i += 1) seed({ split: 'dev' });
      expect((await problemOf(service.createFromSource(args))).extensions!.violations)
        .toEqual([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    });

    it('an operation without an expected answer takes null', async () => {
      await service.createFromSource({ ...args, operation: 'translate_sentence', input: { sentence: 'Hi.' }, expected: null });
      expect(prisma.rows[0]).toMatchObject({ operation: 'translate_sentence', split: 'dev' });
    });
  });
});
