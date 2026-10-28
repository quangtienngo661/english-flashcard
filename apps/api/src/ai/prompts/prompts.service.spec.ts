import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiAdapter, type AdapterOutcome, type ModelDescription } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiProviderName } from '../ai.types.js';
import type { ExecuteInput, RunnerService, RunReport } from '../runner/runner.service.js';
import type { Selection, SelectionReader } from '../runner/selection.js';
import { INITIAL_PROMPTS } from './initial-prompts.js';
import { PromptsRepository } from './prompts.repository.js';
import { PROMPT_GUARD } from './prompt-rules.js';
import { PromptsService } from './prompts.service.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const SEED_ACTOR = '00000000-0000-4000-8000-000000000060';
const NOW = new Date('2026-10-20T05:00:00.000Z');
const OP = 'generate_cloze' as const;
const INPUT = { word: 'borrow', part_of_speech: 'verb', level: 'A2', meaning_vi: 'mượn', context_label: null };
const OUTPUT = { sentence: 'Can I ___ your pen?', accepted_answers: ['borrow'], translation_vi: 'Mình mượn bút nhé?' };
const EXAMPLE = { input: INPUT, output: OUTPUT };

class StubAdapter extends AiAdapter {
  constructor(readonly provider: AiProviderName) {
    super();
  }
  async call(): Promise<AdapterOutcome> {
    throw new Error('the service never calls an adapter itself');
  }
  async describeModel(): Promise<ModelDescription> {
    return { kind: 'not-found' };
  }
}

type PromptRow = { operation: string; instructions: string; examples: unknown; revision: number; updatedBy: string; updatedAt: Date };
type RevisionRow = { id: string; operation: string; revision: number; instructions: string; examples: unknown; savedBy: string; savedAt: Date };
type ExampleRow = { id: string; operation: string; input: unknown; createdAt: Date };

/** A tiny in-memory Prisma for the three tables the service reads and writes; a transaction rolls back on a throw. */
function memoryPrisma(examples: ExampleRow[] = []) {
  let prompts: PromptRow[] = [{
    operation: OP, instructions: INITIAL_PROMPTS[OP].instructions, examples: INITIAL_PROMPTS[OP].examples, revision: 1,
    updatedBy: SEED_ACTOR, updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  }];
  let revisions: RevisionRow[] = [{
    id: 'rev-1', operation: OP, revision: 1, instructions: prompts[0].instructions, examples: prompts[0].examples, savedBy: SEED_ACTOR,
    savedAt: prompts[0].updatedAt,
  }];
  let nextId = 2;
  const client = {
    aiPrompt: {
      findUnique: vi.fn(async ({ where }: { where: { operation: string } }) => prompts.find((row) => row.operation === where.operation) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { operation: string } }) => {
        const row = prompts.find((item) => item.operation === where.operation);
        if (!row) throw new Error('not found');
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { operation: string; revision: number }; data: Partial<PromptRow> & { revision: { increment: number } } }) => {
        const row = prompts.find((item) => item.operation === where.operation && item.revision === where.revision);
        if (!row) return { count: 0 };
        Object.assign(row, { ...data, revision: row.revision + data.revision.increment });
        return { count: 1 };
      }),
    },
    aiPromptRevision: {
      create: vi.fn(async ({ data }: { data: Omit<RevisionRow, 'id'> }) => {
        const row = { ...data, id: `rev-${nextId++}` };
        revisions.push(row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id?: string; operation_revision?: { operation: string; revision: number } } }) => (
        revisions.find((row) => (where.id ? row.id === where.id
          : row.operation === where.operation_revision?.operation && row.revision === where.operation_revision?.revision)) ?? null
      )),
      findMany: vi.fn(async ({ where, take }: { where: { operation: string; revision?: { lt: number } }; take: number }) => revisions
        .filter((row) => row.operation === where.operation && (where.revision === undefined || row.revision < where.revision.lt))
        .sort((a, b) => b.revision - a.revision)
        .slice(0, take)),
    },
    aiEvalExample: {
      findMany: vi.fn(async ({ where, take }: { where: { operation?: string; id?: { in: string[] } }; take?: number }) => examples
        .filter((row) => (where.operation === undefined || row.operation === where.operation) && (!where.id || where.id.in.includes(row.id)))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, take ?? examples.length)),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const saved = { prompts: structuredClone(prompts), revisions: structuredClone(revisions) };
      try {
        return await fn(client);
      } catch (error) {
        prompts = saved.prompts;
        revisions = saved.revisions;
        throw error;
      }
    }),
  };
  return { prisma: client as unknown as PrismaClient, client, rows: () => ({ prompts, revisions }) };
}

const selection: Selection = {
  operation: OP, modelRef: '00000000-0000-4000-8000-0000000000b1', provider: 'fake', modelId: 'fake:ok', effort: null, thinking: null,
  maxOutputTokens: 1_200, price: { input: 0.1, cachedInput: null, output: 0.5 },
};

type Setup = { examples?: ExampleRow[]; selection?: Selection | null; registered?: AiProviderName[]; report?: (input: ExecuteInput) => RunReport };

function setup(input: Setup = {}) {
  const memory = memoryPrisma(input.examples);
  const executed: ExecuteInput[] = [];
  const runner = {
    execute: vi.fn(async (run: ExecuteInput) => {
      executed.push(run);
      return input.report?.(run) ?? {
        result: { status: 'succeeded', operation_id: 'test', result: OUTPUT, meta: {} as never },
        calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 120, cost_usd: '0.00003500', http_status: null }],
        rawOutput: JSON.stringify(OUTPUT),
      } satisfies RunReport;
    }),
  } as unknown as RunnerService;
  const registry = new AiAdapterRegistry();
  for (const provider of input.registered ?? ['fake']) registry.register(new StubAdapter(provider));
  const repository = new PromptsRepository(memory.prisma);
  const emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
  const limiter = { hit: vi.fn(async (): Promise<void> => undefined) };
  const service = new PromptsService(
    memory.prisma, new FakeClock(NOW), repository, runner,
    { load: async () => (input.selection === undefined ? selection : input.selection) } as unknown as SelectionReader, registry,
    { emailsOf } as unknown as IdentityService, limiter as never,
  );
  return { service, repository, executed, emailsOf, limiter, ...memory };
}

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string; violations?: string[] }> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    const problemError = error as ProblemDetailsException;
    return {
      status: problemError.getStatus(), type: problemError.problemType,
      violations: problemError.extensions?.violations as string[] | undefined,
    };
  }
  throw new Error('expected a problem');
}

const eval_ = (id: string, minute: number, operation: string = OP): ExampleRow => ({
  id, operation, input: { ...INPUT, word: id }, createdAt: new Date(NOW.getTime() + minute * 60_000),
});

describe('PromptsService.get', () => {
  it('returns the prompt in use with its revision and the operation’s input fields', async () => {
    const { service } = setup();
    await expect(service.get(OP)).resolves.toEqual({
      operation: OP, instructions: INITIAL_PROMPTS[OP].instructions, examples: INITIAL_PROMPTS[OP].examples, revision: 1,
      input_fields: ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'], updated_at: '2026-10-20T00:00:00.000Z',
      updated_by: SEED_ACTOR, updated_by_user: { id: SEED_ACTOR, email: null, system: true }, guard: PROMPT_GUARD,
    });
  });

  it('PUT response carries updated_by_user with the actor email and the guard', async () => {
    const { service } = setup();
    const saved = await service.save(ADMIN, OP, { expected_revision: 1, instructions: 'New text.', examples: [] });
    expect(saved.updated_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
    expect(saved.guard).toBe(PROMPT_GUARD);
  });
});

describe('PromptsService.save', () => {
  it('B6E57/B6#14: save with an old expected_revision → 409, nothing written', async () => {
    const { service, rows } = setup();
    const before = structuredClone(rows());
    expect(await problem(service.save(ADMIN, OP, { expected_revision: 0, instructions: 'New.', examples: [] })))
      .toMatchObject({ status: 409, type: expect.stringContaining('prompt-revision-conflict') });
    expect(rows()).toEqual(before);
  });

  it.each([
    ['blank instructions', { instructions: '   ', examples: [] }, 'instructions: Must not be blank'],
    ['8 001 characters', { instructions: 'x'.repeat(8_001), examples: [] }, 'instructions: Expected at most 8000 characters'],
    ['11 examples', { instructions: 'Ok.', examples: Array.from({ length: 11 }, () => EXAMPLE) }, 'examples: Expected at most 10 examples'],
  ])('B6E58: %s → 400 with the path', async (_name, body, violation) => {
    const { service, rows } = setup();
    const result = await problem(service.save(ADMIN, OP, { expected_revision: 1, ...body }));
    expect(result).toMatchObject({ status: 400, type: expect.stringContaining('validation-failed') });
    expect(result.violations).toContain(violation);
    expect(rows().revisions).toHaveLength(1);
  });

  it('B6E59/B6#15: an example without meaning_vi or with two blanks → 400 with the paths', async () => {
    const { meaning_vi: _drop, ...noMeaning } = INPUT;
    const { service } = setup();
    const result = await problem(service.save(ADMIN, OP, {
      expected_revision: 1, instructions: 'Ok.',
      examples: [{ input: noMeaning, output: OUTPUT }, { input: INPUT, output: { ...OUTPUT, sentence: 'I ___ and ___.' } }],
    }));
    expect(result.status).toBe(400);
    expect(result.violations?.some((violation) => violation.startsWith('examples[0].input.meaning_vi'))).toBe(true);
    expect(result.violations).toContain('examples[1].output: blank-count');
  });

  it('B6E60: save → revision + 1 and one revision row in the same transaction', async () => {
    const { service, rows, client } = setup();
    const saved = await service.save(ADMIN, OP, { expected_revision: 1, instructions: 'New text.', examples: [EXAMPLE] });
    expect(saved).toMatchObject({ revision: 2, instructions: 'New text.', updated_by: ADMIN, updated_at: NOW.toISOString() });
    expect(rows().revisions.map((row) => [row.revision, row.instructions, row.savedBy])).toEqual([
      [1, INITIAL_PROMPTS[OP].instructions, SEED_ACTOR], [2, 'New text.', ADMIN],
    ]);
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(client.aiPrompt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { operation: OP, revision: 1 } }));
  });

  it('B6E60: after a save, PromptsRepository.current returns the new text and revision (the next learner call uses it)', async () => {
    const { service, repository } = setup();
    await service.save(ADMIN, OP, { expected_revision: 1, instructions: 'New text.', examples: [] });
    await expect(repository.current(OP)).resolves.toEqual({ instructions: 'New text.', examples: [], revision: 2 });
  });

  it('B6E61: saving the text of revision 1 again → a new revision 3, history kept', async () => {
    const { service, rows } = setup();
    await service.save(ADMIN, OP, { expected_revision: 1, instructions: 'Wrong text.', examples: [] });
    const first = rows().revisions[0];
    const saved = await service.save(ADMIN, OP, {
      expected_revision: 2, instructions: first.instructions, examples: first.examples as unknown[],
    });
    expect(saved.revision).toBe(3);
    expect(rows().revisions.map((row) => row.revision)).toEqual([1, 2, 3]);
  });

  it('a conditional update that matches nothing (another save won) → 409, nothing written', async () => {
    const { service, client, rows } = setup();
    client.aiPrompt.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await problem(service.save(ADMIN, OP, { expected_revision: 1, instructions: 'New.', examples: [] }))).status).toBe(409);
    expect(rows().revisions).toHaveLength(1);
  });
});

describe('PromptsService.revisions', () => {
  it('revisions are newest first and paginate', async () => {
    const { service, emailsOf } = setup();
    await service.save(ADMIN, OP, { expected_revision: 1, instructions: 'Two.', examples: [] });
    await service.save(ADMIN, OP, { expected_revision: 2, instructions: 'Three.', examples: [] });
    emailsOf.mockClear();
    const first = await service.revisions(OP, 2);
    expect(emailsOf).toHaveBeenCalledTimes(1);
    expect(first.items.map((item) => item.revision)).toEqual([3, 2]);
    expect(first.items[0]).toEqual({
      revision: 3, instructions: 'Three.', examples: [], saved_by: ADMIN, saved_at: NOW.toISOString(),
      saved_by_user: { id: ADMIN, email: 'admin@x.test', system: false },
    });
    expect(first.next_page_token).toEqual(expect.any(String));
    const second = await service.revisions(OP, 2, first.next_page_token as string);
    expect(second.items.map((item) => item.revision)).toEqual([1]);
    expect(second.next_page_token).toBeNull();
  });

  it('a bad page token → 400', async () => {
    const { service } = setup();
    expect((await problem(service.revisions(OP, 20, 'nonsense'))).status).toBe(400);
  });
});

describe('PromptsService.test', () => {
  const draft = { instructions: 'Draft text.', examples: [EXAMPLE] };

  it('B6E62/B6#16: test → items per example, ai_prompts untouched, the runner called with purpose test and the draft', async () => {
    const { service, executed, rows } = setup({ examples: [eval_('e1', 1), eval_('e2', 2)] });
    const before = structuredClone(rows().prompts);
    const result = await service.test(ADMIN, OP, draft);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      input: { ...INPUT, word: 'e1' }, status: 'succeeded', reason: null, output: OUTPUT, raw_output: JSON.stringify(OUTPUT),
      latency_ms: 120, cost_usd: '0.00003500',
      calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 120, cost_usd: '0.00003500', http_status: null }],
    });
    expect(rows().prompts).toEqual(before);
    for (const run of executed) {
      expect(run).toMatchObject({
        purpose: 'test', operation: OP, actorId: ADMIN, selection, prompt: { instructions: 'Draft text.', examples: [EXAMPLE], revision: null },
      });
      expect((run as { callOperationId: string }).callOperationId).toMatch(/^test-[0-9a-f-]{36}$/);
    }
    expect(new Set(executed.map((run) => (run as { callOperationId: string }).callOperationId)).size).toBe(2);
  });

  it('a test counts one ai.test use, taken before the provider is called', async () => {
    const { service, limiter, executed } = setup({ examples: [eval_('e1', 1), eval_('e2', 2)] });
    limiter.hit.mockImplementation(async () => { expect(executed).toHaveLength(0); });
    await service.test(ADMIN, OP, draft);
    expect(limiter.hit).toHaveBeenCalledExactlyOnceWith('ai.test', ADMIN);
  });

  it('over the ai.test limit → the 429 from the limiter and no provider call', async () => {
    const { service, limiter, executed } = setup({ examples: [eval_('e1', 1)] });
    limiter.hit.mockRejectedValue(new ProblemDetailsException({ status: 429, type: 'rate-limited', title: 'Too many requests' }));
    await expect(service.test(ADMIN, OP, draft)).rejects.toMatchObject({ status: 429 });
    expect(executed).toHaveLength(0);
  });

  it('a refused test (no model, no provider, bad draft, bad example ids, no example) does not use up an ai.test run', async () => {
    const noModel = setup({ selection: null });
    await expect(noModel.service.test(ADMIN, OP, draft)).rejects.toMatchObject({ status: 409 });
    const noProvider = setup({ registered: [] });
    await expect(noProvider.service.test(ADMIN, OP, draft)).rejects.toMatchObject({ status: 409 });
    const badDraft = setup({ examples: [eval_('e1', 1)] });
    await expect(badDraft.service.test(ADMIN, OP, { instructions: '  ', examples: [] })).rejects.toMatchObject({ status: 400 });
    const badIds = setup({ examples: [eval_('e1', 1)] });
    await expect(badIds.service.test(ADMIN, OP, { ...draft, example_ids: ['nope'] })).rejects.toMatchObject({ status: 400 });
    const none = setup();
    await expect(none.service.test(ADMIN, OP, { instructions: 'Draft text.', examples: [] })).rejects.toMatchObject({ status: 400 });
    for (const { limiter } of [noModel, noProvider, badDraft, badIds, none]) expect(limiter.hit).not.toHaveBeenCalled();
  });

  it('B6E84: a test whose call is truncated → the item has reason truncated', async () => {
    const { service } = setup({
      examples: [eval_('e1', 1)],
      report: () => ({
        result: { status: 'transient_failure', operation_id: 'test', reason: 'truncated' },
        calls: [{ attempt: 1, outcome: 'truncated', latency_ms: 900, cost_usd: '0.00060000', http_status: null }],
        rawOutput: '{"sentence":"Can',
      }),
    });
    const [item] = (await service.test(ADMIN, OP, draft)).items;
    expect(item).toMatchObject({ status: 'transient_failure', reason: 'truncated', output: null, raw_output: '{"sentence":"Can' });
  });

  it('cost_usd is the sum of the calls, and null when one call’s cost is unknown', async () => {
    const reports: RunReport[] = [
      {
        result: { status: 'succeeded', operation_id: 't', result: OUTPUT, meta: {} as never }, rawOutput: '{}',
        calls: [
          { attempt: 1, outcome: 'provider-error', latency_ms: 300, cost_usd: '0.00001000', http_status: 503 },
          { attempt: 2, outcome: 'succeeded', latency_ms: 700, cost_usd: '0.00003500', http_status: null },
        ],
      },
      {
        result: { status: 'transient_failure', operation_id: 't', reason: 'timeout' }, rawOutput: null,
        calls: [{ attempt: 1, outcome: 'timeout', latency_ms: 10_000, cost_usd: null, http_status: null }],
      },
    ];
    let index = 0;
    const { service } = setup({ examples: [eval_('e1', 1), eval_('e2', 2)], report: () => reports[index++] });
    const items = (await service.test(ADMIN, OP, draft)).items;
    expect(items.map((item) => [item.latency_ms, item.cost_usd])).toEqual([[1_000, '0.00004500'], [10_000, null]]);
  });

  it('example source order: ids → first five eval examples → the body’s examples → 400', async () => {
    const examples = Array.from({ length: 7 }, (_, i) => eval_(`e${i + 1}`, i + 1));
    const words = (executed: ExecuteInput[]) => executed.map((run) => (run.data as { word: string }).word);

    const byIds = setup({ examples });
    await byIds.service.test(ADMIN, OP, { ...draft, example_ids: ['e6', 'e2'] });
    expect(words(byIds.executed).sort()).toEqual(['e2', 'e6']);

    const firstFive = setup({ examples });
    await firstFive.service.test(ADMIN, OP, draft);
    expect(words(firstFive.executed)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);

    const fromBody = setup();
    await fromBody.service.test(ADMIN, OP, { instructions: 'Ok.', examples: Array.from({ length: 6 }, () => EXAMPLE) });
    expect(words(fromBody.executed)).toEqual(['borrow', 'borrow', 'borrow', 'borrow', 'borrow']);

    const none = setup();
    const result = await problem(none.service.test(ADMIN, OP, { instructions: 'Ok.', examples: [] }));
    expect(result).toMatchObject({ status: 400, violations: ['examples: at least one example is needed'] });
    expect(none.executed).toEqual([]);
  });

  it('example_ids of another operation or unknown → 400', async () => {
    const { service, executed } = setup({ examples: [eval_('e1', 1), eval_('x1', 2, 'lookup_word')] });
    expect((await problem(service.test(ADMIN, OP, { ...draft, example_ids: ['e1', 'x1'] }))).status).toBe(400);
    expect((await problem(service.test(ADMIN, OP, { ...draft, example_ids: ['nope'] }))).status).toBe(400);
    expect(executed).toEqual([]);
  });

  it('model-not-set → 409', async () => {
    const { service } = setup({ selection: null });
    expect(await problem(service.test(ADMIN, OP, draft))).toMatchObject({ status: 409, type: expect.stringContaining('model-not-set') });
  });

  it('provider not registered → 409 provider-not-configured', async () => {
    const { service } = setup({ selection: { ...selection, provider: 'openai' }, registered: ['fake'] });
    expect(await problem(service.test(ADMIN, OP, draft)))
      .toMatchObject({ status: 409, type: expect.stringContaining('provider-not-configured') });
  });

  it('an invalid draft → 400 before any call', async () => {
    const { service, executed } = setup({ examples: [eval_('e1', 1)] });
    expect((await problem(service.test(ADMIN, OP, { instructions: ' ', examples: [] }))).status).toBe(400);
    expect(executed).toEqual([]);
  });
});
