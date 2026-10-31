import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { EvalSetsService } from './eval-sets.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-30T02:00:00Z');
const INPUT = { word: 'deploy' };

type Example = { id: string; operation: string; split: string; input: unknown; expected: unknown };
type SetRow = { id: string; operation: string; version: number; heldOutRatio: { toString(): string }; frozenBy: string; frozenAt: Date };
type SetItem = { setId: string; exampleId: string; position: number; split: string; input: unknown; expected: unknown; revealedAt: Date | null };

const example = (id: string, over: Partial<Example> = {}): Example => ({ id, operation: 'generate_cloze', split: 'dev', input: INPUT, expected: { forms: ['go'] }, ...over });

function setup(examples: Example[] = [], sets: SetRow[] = [], setItems: SetItem[] = [], workingIds: string[] = []) {
  const created: Array<Record<string, unknown>> = [];
  const tx = {
    aiEvalExample: { findMany: vi.fn(async () => examples) },
    aiEvalSet: {
      findFirst: vi.fn(async () => [...sets].sort((a, b) => b.version - a.version)[0] ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'new-set', frozenAt: NOW, ...data };
        created.push(row);
        return row;
      }),
    },
    aiEvalSetItem: { createMany: vi.fn(async (_args: { data: unknown[] }) => ({ count: 0 })) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    aiEvalSet: {
      findMany: vi.fn(async () => sets),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => sets.find((row) => row.id === where.id) ?? null),
      findFirst: tx.aiEvalSet.findFirst,
    },
    aiEvalSetItem: {
      groupBy: vi.fn(async (args: { by: string[]; where: { split?: string } }) => {
        if (args.by.length === 2) {
          const key = (item: SetItem) => `${item.setId}|${item.split}`;
          const counts = new Map<string, number>();
          for (const item of setItems) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
          return [...counts].map(([k, n]) => ({ setId: k.split('|')[0], split: k.split('|')[1], _count: { _all: n } }));
        }
        const revealed = new Map<string, number>();
        for (const item of setItems.filter((i) => i.split === 'held_out' && i.revealedAt !== null)) revealed.set(item.setId, (revealed.get(item.setId) ?? 0) + 1);
        return [...revealed].map(([setId, n]) => ({ setId, _count: { _all: n } }));
      }),
      findMany: vi.fn(async () => [...setItems].sort((a, b) => a.position - b.position)),
    },
    aiEvalExample: { findMany: vi.fn(async () => workingIds.map((id) => ({ id }))) },
  };
  const emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
  const settings = { get: vi.fn(async () => ({ ai: { evalHeldOutRatio: 0.3 } })) };
  const service = new EvalSetsService(prisma as never, { emailsOf } as never, settings as never);
  return { service, prisma, tx, created, emailsOf };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, extensions: problem.extensions as Record<string, unknown> | undefined };
}

describe('EvalSetsService.freeze (D9)', () => {
  it('B1: an example without an expected answer and no held-out one → 422 listing both', async () => {
    const { service, tx } = setup([example('e1', { expected: null })]);
    expect(await problemOf(service.freeze(ADMIN, 'generate_cloze'))).toMatchObject({
      status: 422, type: 'eval-set-incomplete', extensions: { missing_expected: ['e1'], no_held_out: true },
    });
    expect(tx.aiEvalSet.create).not.toHaveBeenCalled();
  });

  it('B1: an empty working set has nothing missing but no held-out example', async () => {
    const { service } = setup([]);
    expect(await problemOf(service.freeze(ADMIN, 'generate_cloze'))).toMatchObject({
      status: 422, type: 'eval-set-incomplete', extensions: { missing_expected: [], no_held_out: true },
    });
  });

  it('B1: held-out present but one expected answer missing → only that one is listed', async () => {
    const { service } = setup([example('e1', { split: 'held_out' }), example('e2', { expected: null }), example('e3')]);
    expect(await problemOf(service.freeze(ADMIN, 'generate_cloze'))).toMatchObject({
      extensions: { missing_expected: ['e2'], no_held_out: false },
    });
  });

  it('translate_sentence needs no expected answer: one held-out example is enough', async () => {
    const { service, created } = setup([example('t1', { operation: 'translate_sentence', split: 'held_out', expected: null })]);
    await service.freeze(ADMIN, 'translate_sentence');
    expect(created).toHaveLength(1);
  });

  it('the next version follows the highest existing one, with the ratio of the setting and the examples copied in list order', async () => {
    const sets: SetRow[] = [
      { id: 's1', operation: 'generate_cloze', version: 1, heldOutRatio: { toString: () => '0.30' }, frozenBy: ADMIN, frozenAt: NOW },
      { id: 's2', operation: 'generate_cloze', version: 2, heldOutRatio: { toString: () => '0.30' }, frozenBy: ADMIN, frozenAt: NOW },
    ];
    const { service, tx, created } = setup([example('e1', { split: 'held_out' }), example('e2')], sets);
    const answer = await service.freeze(ADMIN, 'generate_cloze');
    expect(created[0]).toMatchObject({ operation: 'generate_cloze', version: 3, heldOutRatio: 0.3, frozenBy: ADMIN });
    expect(tx.aiEvalSetItem.createMany).toHaveBeenCalledExactlyOnceWith({ data: [
      { setId: 'new-set', exampleId: 'e1', position: 0, split: 'held_out', input: INPUT, expected: { forms: ['go'] } },
      { setId: 'new-set', exampleId: 'e2', position: 1, split: 'dev', input: INPUT, expected: { forms: ['go'] } },
    ] });
    expect(answer).toMatchObject({
      id: 'new-set', operation: 'generate_cloze', version: 3, held_out_ratio: 0.3, frozen_by: ADMIN, dev_count: 1, held_out_count: 1, revealed_count: 0,
      frozen_by_user: { id: ADMIN, email: 'admin@x.test', system: false },
    });
  });

  it('the first version is 1; an item without an expected answer leaves the key out', async () => {
    const { service, created, tx } = setup([example('t1', { operation: 'translate_sentence', split: 'held_out', expected: null })]);
    await service.freeze(ADMIN, 'translate_sentence');
    expect(created[0]).toMatchObject({ version: 1 });
    const { data } = tx.aiEvalSetItem.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> };
    expect(data[0]).not.toHaveProperty('expected');
  });

  it('B37: two admins freezing at once → the unique index refuses the second with 409 eval-set-conflict', async () => {
    const { service, tx } = setup([example('e1', { split: 'held_out' })]);
    tx.aiEvalSet.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await problemOf(service.freeze(ADMIN, 'generate_cloze'))).toMatchObject({ status: 409, type: 'eval-set-conflict' });
  });

  it('any other database error is not turned into a conflict', async () => {
    const { service, tx } = setup([example('e1', { split: 'held_out' })]);
    tx.aiEvalSet.create.mockRejectedValueOnce(new Error('connection lost'));
    await expect(service.freeze(ADMIN, 'generate_cloze')).rejects.toThrow('connection lost');
  });
});

describe('EvalSetsService.list and latest', () => {
  const sets: SetRow[] = [
    { id: 's2', operation: 'generate_cloze', version: 2, heldOutRatio: { toString: () => '0.30' }, frozenBy: ADMIN, frozenAt: NOW },
    { id: 's1', operation: 'generate_cloze', version: 1, heldOutRatio: { toString: () => '0.30' }, frozenBy: ADMIN, frozenAt: NOW },
  ];
  const items: SetItem[] = [
    { setId: 's2', exampleId: 'e1', position: 0, split: 'held_out', input: INPUT, expected: null, revealedAt: new Date('2026-10-30T01:00:00Z') },
    { setId: 's2', exampleId: 'e2', position: 1, split: 'held_out', input: INPUT, expected: null, revealedAt: null },
    { setId: 's2', exampleId: 'e3', position: 2, split: 'dev', input: INPUT, expected: null, revealedAt: null },
    { setId: 's1', exampleId: 'e1', position: 0, split: 'held_out', input: INPUT, expected: null, revealedAt: null },
  ];

  it('B4: newest first, with the counts of dev, held-out and revealed items per version', async () => {
    const { service, prisma } = setup([], sets, items);
    const { items: views } = await service.list('generate_cloze');
    expect(prisma.aiEvalSet.findMany).toHaveBeenCalledWith({ where: { operation: 'generate_cloze' }, orderBy: { version: 'desc' } });
    expect(views.map((view) => [view.version, view.dev_count, view.held_out_count, view.revealed_count])).toEqual([[2, 1, 2, 1], [1, 0, 1, 0]]);
  });

  it('latest is the highest version, or null', async () => {
    expect(await setup([], sets, items).service.latest('generate_cloze')).toEqual({ id: 's2', version: 2 });
    expect(await setup().service.latest('generate_cloze')).toBeNull();
  });
});

describe('EvalSetsService.get', () => {
  const set: SetRow = { id: 's1', operation: 'generate_cloze', version: 1, heldOutRatio: { toString: () => '0.30' }, frozenBy: ADMIN, frozenAt: NOW };
  const items: SetItem[] = [
    { setId: 's1', exampleId: 'e1', position: 0, split: 'held_out', input: { word: 'hidden' }, expected: { forms: ['hidden'] }, revealedAt: null },
    { setId: 's1', exampleId: 'e2', position: 1, split: 'held_out', input: { word: 'seen' }, expected: { forms: ['seen'] }, revealedAt: new Date('2026-10-30T01:00:00Z') },
    { setId: 's1', exampleId: 'e3', position: 2, split: 'dev', input: { word: 'dev' }, expected: { forms: ['dev'] }, revealedAt: null },
    { setId: 's1', exampleId: 'e4', position: 3, split: 'dev', input: { word: 'gone' }, expected: null, revealedAt: null },
  ];

  it('B4, R7: an unrevealed held-out item shows no input and no expected answer; a revealed or dev one does', async () => {
    const { service } = setup([], [set], items, ['e1', 'e2', 'e3']);
    const view = await service.get('s1');
    expect(view.items).toEqual([
      { example_id: 'e1', position: 0, split: 'held_out', revealed_at: null, in_working_set: true, input: null, expected: null },
      { example_id: 'e2', position: 1, split: 'held_out', revealed_at: '2026-10-30T01:00:00.000Z', in_working_set: true, input: { word: 'seen' }, expected: { forms: ['seen'] } },
      { example_id: 'e3', position: 2, split: 'dev', revealed_at: null, in_working_set: true, input: { word: 'dev' }, expected: { forms: ['dev'] } },
      { example_id: 'e4', position: 3, split: 'dev', revealed_at: null, in_working_set: false, input: { word: 'gone' }, expected: null },
    ]);
    expect(view).toMatchObject({ id: 's1', version: 1, dev_count: 2, held_out_count: 2, revealed_count: 1 });
  });

  it('an unknown set → 404', async () => {
    expect(await problemOf(setup().service.get('nope'))).toMatchObject({ status: 404, type: 'not-found' });
  });
});
