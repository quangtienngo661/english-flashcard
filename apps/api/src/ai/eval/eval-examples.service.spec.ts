import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { EVAL_EXAMPLES_PER_OPERATION_MAX, EVAL_NOTE_MAX } from '../ai.constants.js';
import { EvalExamplesService } from './eval-examples.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };

type Row = { id: string; operation: string; input: unknown; note: string | null; createdBy: string; createdAt: Date; updatedAt: Date };

function fakePrisma() {
  const rows: Row[] = [];
  return {
    rows,
    aiEvalExample: {
      findMany: vi.fn(async ({ where }: { where: { operation: string } }) => rows.filter((row) => row.operation === where.operation)),
      count: vi.fn(async ({ where }: { where: { operation: string } }) => rows.filter((row) => row.operation === where.operation).length),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null),
      create: vi.fn(async ({ data }: { data: Omit<Row, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
        rows.push(row);
        return row;
      }),
      createMany: vi.fn(async ({ data }: { data: Array<Omit<Row, 'id' | 'updatedAt'>> }) => {
        for (const item of data) rows.push({ id: randomUUID(), updatedAt: new Date(), ...item });
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
  beforeEach(() => {
    prisma = fakePrisma();
    emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
    service = new EvalExamplesService(prisma as never, { emailsOf } as never);
  });

  it('create stores the example and returns its view', async () => {
    const view = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, note: 'a natural B1 sentence' });
    expect(view).toMatchObject({ operation: 'generate_cloze', input: INPUT, note: 'a natural B1 sentence', created_by: ADMIN });
    expect(prisma.rows).toHaveLength(1);
  });

  it('an input that breaks the operation rules → 400 with paths input.<field>, nothing saved', async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: { ...INPUT, meaning_vi: '' } }));
    expect(problem.status).toBe(400);
    expect(problem.type).toBe('validation-failed');
    expect(problem.extensions!.violations).toEqual([expect.stringMatching(/^input\.meaning_vi: /)]);
    expect(prisma.rows).toHaveLength(0);
  });

  it(`a note over ${EVAL_NOTE_MAX} characters → 400 note`, async () => {
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT, note: 'x'.repeat(EVAL_NOTE_MAX + 1) }));
    expect(problem.extensions!.violations).toEqual([expect.stringMatching(/^note: /)]);
  });

  it('plan choice 13: the 101st example → 400 operation: at most 100 examples', async () => {
    for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX; i += 1) {
      prisma.rows.push({ id: randomUUID(), operation: 'generate_cloze', input: INPUT, note: null, createdBy: ADMIN, createdAt: new Date(), updatedAt: new Date() });
    }
    const problem = await problemOf(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT }));
    expect(problem.extensions!.violations).toEqual([`operation: at most ${EVAL_EXAMPLES_PER_OPERATION_MAX} examples`]);
    expect(prisma.rows).toHaveLength(EVAL_EXAMPLES_PER_OPERATION_MAX);
  });

  it('another operation does not count toward the limit', async () => {
    for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX; i += 1) {
      prisma.rows.push({ id: randomUUID(), operation: 'lookup_word', input: {}, note: null, createdBy: ADMIN, createdAt: new Date(), updatedAt: new Date() });
    }
    await expect(service.create(ADMIN, { operation: 'generate_cloze', input: INPUT })).resolves.toMatchObject({ operation: 'generate_cloze' });
  });

  it('list asks for the operation\'s examples, oldest first, at most 100', async () => {
    await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT });
    const { items } = await service.list('generate_cloze');
    expect(items).toHaveLength(1);
    expect(prisma.aiEvalExample.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: EVAL_EXAMPLES_PER_OPERATION_MAX,
    }));
  });

  it('update checks the new input against the example\'s own operation', async () => {
    const { id } = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT });
    const problem = await problemOf(service.update(id, { input: { sentence: 'Hello.' } }));
    expect(problem.extensions!.violations.every((v) => v.startsWith('input.') || v.startsWith('input:'))).toBe(true);
    const view = await service.update(id, { input: { ...INPUT, word: 'release' }, note: null });
    expect(view).toMatchObject({ input: { word: 'release' }, note: null });
  });

  it('update and remove of an unknown id → 404 not-found', async () => {
    expect((await problemOf(service.update(randomUUID(), { note: 'x' }))).type).toBe('not-found');
    expect((await problemOf(service.remove(randomUUID()))).type).toBe('not-found');
  });

  it('remove deletes the example', async () => {
    const { id } = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT });
    await service.remove(id);
    expect(prisma.rows).toHaveLength(0);
  });

  it('list: one emailsOf call with every author; unknown author has email null', async () => {
    const other = '22222222-2222-4222-8222-222222222222';
    await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT });
    await service.create(other, { operation: 'generate_cloze', input: INPUT });
    emailsOf.mockClear();
    const { items } = await service.list('generate_cloze');
    expect(emailsOf).toHaveBeenCalledTimes(1);
    expect([...emailsOf.mock.calls[0]![0] as string[]].sort()).toEqual([ADMIN, other].sort());
    expect(items.map((item) => item.created_by_user)).toEqual([
      { id: ADMIN, email: 'admin@x.test', system: false }, { id: other, email: null, system: false },
    ]);
  });

  it('create and update return created_by_user', async () => {
    const created = await service.create(ADMIN, { operation: 'generate_cloze', input: INPUT });
    expect(created.created_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
    const updated = await service.update(created.id, { note: 'n' });
    expect(updated.created_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
  });

  describe('createMany', () => {
    const good = (word: string) => ({ input: { ...INPUT, word }, note: word });
    const bad = { input: { ...INPUT, meaning_vi: '' } };

    it('stores the valid rows in file order and lists the invalid ones by row number (owner: only the right rows go in)', async () => {
      const answer = await service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), bad, good('c'), good('d')] });
      expect(answer).toEqual({
        total: 5, valid: 4, created: 4,
        invalid: [{ row: 3, violations: [expect.stringMatching(/^input.meaning_vi/)] }],
      });
      expect(prisma.rows.map((row) => (row.input as { word: string }).word)).toEqual(['a', 'b', 'c', 'd']);
      expect(prisma.rows.every((row) => row.createdBy === ADMIN && row.operation === 'generate_cloze')).toBe(true);
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
      for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX - 2; i += 1) {
        prisma.rows.push({ id: randomUUID(), operation: 'generate_cloze', input: INPUT, note: null, createdBy: ADMIN, createdAt: new Date(), updatedAt: new Date() });
      }
      const problem = await problemOf(service.createMany(ADMIN, { operation: 'generate_cloze', rows: [good('a'), good('b'), bad, good('c')] }));
      expect(problem).toMatchObject({ status: 400, extensions: { violations: ['operation: room for 2 more examples, 3 valid rows sent'] } });
      expect(prisma.rows).toHaveLength(EVAL_EXAMPLES_PER_OPERATION_MAX - 2);
    });

    it('invalid rows do not count against the room left', async () => {
      for (let i = 0; i < EVAL_EXAMPLES_PER_OPERATION_MAX - 1; i += 1) {
        prisma.rows.push({ id: randomUUID(), operation: 'generate_cloze', input: INPUT, note: null, createdBy: ADMIN, createdAt: new Date(), updatedAt: new Date() });
      }
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
});
