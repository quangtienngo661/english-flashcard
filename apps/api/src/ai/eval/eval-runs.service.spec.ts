import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Selection } from '../runner/selection.js';
import { EvalRunsService } from './eval-runs.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const SELECTION: Selection = {
  operation: 'generate_cloze', modelRef: randomUUID(), provider: 'fake', modelId: 'fake:ok', effort: null, thinking: 'disabled',
  maxOutputTokens: 4096, price: null,
};
const [EX1, EX2] = [randomUUID(), randomUUID()];
const EXAMPLE_INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };

function setup() {
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    aiEvalExample: { findMany: vi.fn(async () => [{ id: EX1 }, { id: EX2 }]) },
    aiEvalRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), ...data };
        created.push(row);
        return row;
      }),
      findUnique: vi.fn(async () => null),
    },
  };
  const selections = { load: vi.fn(async (): Promise<Selection | null> => SELECTION) };
  const registry = { get: vi.fn((provider: string) => (provider === 'fake' ? {} : undefined)) };
  const prompts = { current: vi.fn(async () => ({ instructions: 'x', examples: [], revision: 4 })) };
  const queue = { enqueue: vi.fn(async () => true) };
  const service = new EvalRunsService(
    prisma as never, selections as never, registry as never, prompts as never, queue as never,
  );
  return { service, prisma, created, selections, registry, prompts, queue };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, violations: (problem.extensions?.violations ?? []) as string[] };
}

describe('EvalRunsService.create', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('the row stores the resolved selection, the current revision, the example ids and their number; enqueued; 202 body', async () => {
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created).toHaveLength(1);
    expect(ctx.created[0]).toMatchObject({
      operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
      promptRevision: 4, exampleIds: [EX1, EX2], status: 'queued', total: 2, startedBy: ADMIN,
    });
    expect(ctx.created[0]).not.toHaveProperty('draft');
    expect(ctx.prisma.aiEvalExample.findMany).toHaveBeenCalledWith({
      where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    expect(ctx.queue.enqueue).toHaveBeenCalledWith(ctx.created[0]!.id);
    expect(answer).toEqual({ run_id: ctx.created[0]!.id, status: 'queued' });
  });

  it('the row stores the draft and no revision', async () => {
    const draft = { instructions: 'Draft.', examples: [{ input: EXAMPLE_INPUT, output: {
      sentence: 'We ___ on Friday.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi triển khai vào thứ Sáu.',
    } }] };
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: draft });
    expect(ctx.created[0]).toMatchObject({ draft, promptRevision: null });
    expect(ctx.prompts.current).not.toHaveBeenCalled();
  });

  it('B6E73: no model → 409 model-not-set, no row', async () => {
    ctx.selections.load.mockResolvedValue(null);
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 409, type: 'model-not-set' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('provider not registered → 409 provider-not-configured, no row', async () => {
    ctx.selections.load.mockResolvedValue({ ...SELECTION, provider: 'openai' });
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(ctx.created).toHaveLength(0);
  });

  it('a draft that breaks the prompt rules → 400 with paths under prompt., no row', async () => {
    const draft = { instructions: '   ', examples: [{ input: { ...EXAMPLE_INPUT, meaning_vi: undefined }, output: {} }] };
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: draft }));
    expect(problem.status).toBe(400);
    expect(problem.type).toBe('validation-failed');
    expect(problem.violations[0]).toBe('prompt.instructions: Must not be blank');
    expect(problem.violations.some((v) => v.startsWith('prompt.examples[0].input.meaning_vi'))).toBe(true);
    expect(ctx.created).toHaveLength(0);
  });

  it('plan choice 21: no example for the operation → 400 examples: at least one example is needed', async () => {
    ctx.prisma.aiEvalExample.findMany.mockResolvedValue([]);
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 400, violations: ['examples: at least one example is needed'] });
    expect(ctx.created).toHaveLength(0);
  });

  it('B6E91: enqueue returns false → the answer is still queued and the row stays queued', async () => {
    ctx.queue.enqueue.mockResolvedValue(false);
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(answer.status).toBe('queued');
    expect(ctx.created[0]).toMatchObject({ status: 'queued' });
  });
});

describe('EvalRunsService.get', () => {
  it('plan review #4: an unknown id → 404 not-found', async () => {
    const ctx = setup();
    const problem = await problemOf(ctx.service.get(randomUUID()));
    expect(problem).toMatchObject({ status: 404, type: 'not-found' });
  });
});
