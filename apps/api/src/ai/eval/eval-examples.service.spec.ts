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
  beforeEach(() => {
    prisma = fakePrisma();
    service = new EvalExamplesService(prisma as never);
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
});
