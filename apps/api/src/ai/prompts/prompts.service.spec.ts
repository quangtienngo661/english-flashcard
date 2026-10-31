import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AiAdapter, type AdapterOutcome, type ModelDescription } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiProviderName } from '../ai.types.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
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
type ExampleRow = { id: string; operation: string; input: unknown; createdAt: Date; split: string };

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
    aiLiveConfig: { findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null) },
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
      findMany: vi.fn(async ({ where, take }: { where: { operation?: string; split?: string; id?: { in: string[] } }; take?: number }) => examples
        .filter((row) => (where.operation === undefined || row.operation === where.operation) && (where.split === undefined || row.split === where.split)
          && (!where.id || where.id.in.includes(row.id)))
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

/** The real AdminSpend over a stub ledger and settings: the cap and the day's spend are the test's to set (nhóm B M3). */
function spendOf(state: { spent: number; cap: number | null }) {
  return new AdminSpend(
    { get: async () => ({ ai: { adminDailyUsdCap: state.cap } }) } as never,
    { adminSpentToday: async () => state.spent } as never,
  );
}

type Setup = {
  examples?: ExampleRow[]; selection?: Selection | null; registered?: AiProviderName[]; report?: (input: ExecuteInput) => RunReport;
  spent?: number;
};

function setup(input: Setup = {}) {
  const spend = { spent: input.spent ?? 0, cap: 2 as number | null };
  const memory = memoryPrisma(input.examples);
  const executed: ExecuteInput[] = [];
  const runner = {
    execute: vi.fn(async (run: ExecuteInput) => {
      executed.push(run);
      return input.report?.(run) ?? {
        result: { status: 'succeeded', operation_id: 'test', result: OUTPUT, meta: {} as never },
        calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 120, cost_usd: '0.00003500', http_status: null, call_id: 'C1' }],
        rawOutput: JSON.stringify(OUTPUT),
      } satisfies RunReport;
    }),
  } as unknown as RunnerService;
  const registry = new AiAdapterRegistry();
  for (const provider of input.registered ?? ['fake']) registry.register(new StubAdapter(provider));
  const live = { load: vi.fn(async (_op: string) => ({ configId: 'c9', number: 7, prompt: { instructions: 'Live text.', examples: [], revision: 7 }, selection: null })) };
  const repository = new PromptsRepository(memory.prisma, live as never);
  const emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
  const limiter = { hit: vi.fn(async (): Promise<void> => undefined) };
  const service = new PromptsService(
    memory.prisma, repository, runner,
    { load: async () => (input.selection === undefined ? selection : input.selection) } as unknown as SelectionReader, registry,
    { emailsOf } as unknown as IdentityService, limiter as never, spendOf(spend), new FakeClock(NOW),
  );
  return { service, repository, executed, emailsOf, limiter, live, spend, ...memory };
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

const eval_ = (id: string, minute: number, operation: string = OP, split = 'dev'): ExampleRow => ({
  id, operation, input: { ...INPUT, word: id }, createdAt: new Date(NOW.getTime() + minute * 60_000), split,
});

describe('PromptsService.get (nhóm B M2: the prompt of the live config)', () => {
  it('returns the live config text as the prompt in use: revision = its number, updated by whoever published it', async () => {
    const { service, client } = setup();
    client.aiLiveConfig.findUnique.mockResolvedValue({
      operation: OP,
      config: { number: 4, instructions: 'Live text.', examples: [], publishedBy: ADMIN, publishedAt: new Date('2026-10-30T01:00:00Z'), createdBy: SEED_ACTOR, createdAt: new Date('2026-10-20T00:00:00Z') },
    });
    await expect(service.get(OP)).resolves.toEqual({
      operation: OP, instructions: 'Live text.', examples: [], revision: 4,
      input_fields: ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'], updated_at: '2026-10-30T01:00:00.000Z',
      updated_by: ADMIN, updated_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, guard: PROMPT_GUARD,
    });
    expect(client.aiLiveConfig.findUnique).toHaveBeenCalledWith({ where: { operation: OP }, include: { config: true } });
  });

  it('a config never published (migrated seed) falls back to its creator and creation time', async () => {
    const { service, client } = setup();
    client.aiLiveConfig.findUnique.mockResolvedValue({
      operation: OP,
      config: { number: 2, instructions: 'Seed.', examples: [], publishedBy: null, publishedAt: null, createdBy: SEED_ACTOR, createdAt: new Date('2026-10-20T00:00:00Z') },
    });
    expect(await service.get(OP)).toMatchObject({ revision: 2, updated_at: '2026-10-20T00:00:00.000Z', updated_by: SEED_ACTOR, updated_by_user: { system: true } });
  });

  it('an operation with no live config → 404', async () => {
    const { service, client } = setup();
    client.aiLiveConfig.findUnique.mockResolvedValue(null);
    await expect(service.get(OP)).rejects.toMatchObject({ status: 404 });
  });
});

describe('PromptsRepository', () => {
  it('nhóm B M2: current is the live config prompt, whatever ai_prompts holds; atRevision still reads the saved revisions', async () => {
    const { repository, live } = setup();
    await expect(repository.current(OP)).resolves.toEqual({ instructions: 'Live text.', examples: [], revision: 7 });
    expect(live.load).toHaveBeenCalledExactlyOnceWith(OP);
    await expect(repository.atRevision(OP, 1)).resolves.toMatchObject({ revision: 1 });
  });
});

describe('PromptsService.revisions', () => {
  it('revisions are newest first and paginate', async () => {
    const { service, emailsOf, client } = setup();
    // The revisions saved before nhóm B M2 are history now: nothing writes new ones.
    await client.aiPromptRevision.create({ data: { operation: OP, revision: 2, instructions: 'Two.', examples: [], savedBy: ADMIN, savedAt: NOW } });
    await client.aiPromptRevision.create({ data: { operation: OP, revision: 3, instructions: 'Three.', examples: [], savedBy: ADMIN, savedAt: NOW } });
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
      calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 120, cost_usd: '0.00003500', http_status: null, call_id: 'C1' }],
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

  it('E14: a model without its prices → 409 model-price-missing: no provider call and no ai.test use', async () => {
    const { service, limiter, executed } = setup({ examples: [eval_('e1', 1)], selection: { ...selection, price: null } });
    expect(await problem(service.test(ADMIN, OP, draft))).toMatchObject({ status: 409, type: 'model-price-missing' });
    expect(executed).toHaveLength(0);
    expect(limiter.hit).not.toHaveBeenCalled();
  });

  it('B20: the usd cap reached → 409 admin-usd-cap, no provider call and no ai.test use', async () => {
    const { service, limiter, executed } = setup({ examples: [eval_('e1', 1)], spent: 2 });
    expect(await problem(service.test(ADMIN, OP, draft))).toMatchObject({ status: 409, type: 'admin-usd-cap' });
    expect(executed).toHaveLength(0);
    expect(limiter.hit).not.toHaveBeenCalled();
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
        calls: [{ attempt: 1, outcome: 'truncated', latency_ms: 900, cost_usd: '0.00060000', http_status: null, call_id: 'C1' }],
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
          { attempt: 1, outcome: 'provider-error', latency_ms: 300, cost_usd: '0.00001000', http_status: 503, call_id: 'C1' },
          { attempt: 2, outcome: 'succeeded', latency_ms: 700, cost_usd: '0.00003500', http_status: null, call_id: 'C1' },
        ],
      },
      {
        result: { status: 'transient_failure', operation_id: 't', reason: 'timeout' }, rawOutput: null,
        calls: [{ attempt: 1, outcome: 'timeout', latency_ms: 10_000, cost_usd: null, http_status: null, call_id: 'C1' }],
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

  it('B7, R7: the default inputs are dev examples only, and the query says so', async () => {
    const { service, executed, client } = setup({ examples: [eval_('h1', 1, OP, 'held_out'), eval_('e2', 2), eval_('e3', 3)] });
    await service.test(ADMIN, OP, draft);
    expect(executed.map((run) => (run.data as { word: string }).word)).toEqual(['e2', 'e3']);
    expect(client.aiEvalExample.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { operation: OP, split: 'dev' }, take: 5 }));
  });

  it('B7, R7: only held-out examples in the set → the draft\'s own examples are used, nothing hidden is computed', async () => {
    const { service, executed } = setup({ examples: [eval_('h1', 1, OP, 'held_out')] });
    await service.test(ADMIN, OP, { instructions: 'Ok.', examples: [EXAMPLE] });
    expect(executed.map((run) => (run.data as { word: string }).word)).toEqual(['borrow']);
  });

  it('Review focus 3: a held-out id in example_ids → 400 naming dev examples, nothing computed, no ai.test run used', async () => {
    const { service, executed, limiter } = setup({ examples: [eval_('e1', 1), eval_('h1', 2, OP, 'held_out')] });
    const result = await problem(service.test(ADMIN, OP, { ...draft, example_ids: ['e1', 'h1'] }));
    expect(result).toMatchObject({ status: 400, violations: [`example_ids: every id must be a dev example of ${OP}`] });
    expect(executed).toEqual([]);
    expect(limiter.hit).not.toHaveBeenCalled();
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
