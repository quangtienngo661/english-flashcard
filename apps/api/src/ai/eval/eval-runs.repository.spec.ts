import { describe, expect, it, vi } from 'vitest';
import { EvalRunsRepository, type ItemResult } from './eval-runs.repository.js';

const RUN = '22222222-2222-4222-8222-222222222222';
const ITEM = '33333333-3333-4333-8333-333333333333';
const EXAMPLE = '44444444-4444-4444-8444-444444444444';

/** The SQL text of a tagged-template call, with its values. */
const sqlOf = (call: unknown[]) => ({ text: (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' ').trim(), values: call.slice(1) });

function setup(rows: unknown[]) {
  const prisma = { $queryRaw: vi.fn(async (..._args: unknown[]) => rows), $executeRaw: vi.fn(async (..._args: unknown[]) => 0) };
  return { prisma, repository: new EvalRunsRepository(prisma as never) };
}

const RESULT: ItemResult = {
  status: 'succeeded', reason: null, output: { sentence: 'x' }, raw_output: '{}', latency_ms: 40, cost_usd: '0.00000300', rule: null, expected_result: null,
};

describe('EvalRunsRepository.isRunning', () => {
  it('asks for the run only while its status is running, with one read and no write', async () => {
    const { prisma, repository } = setup([{ one: 1 }]);
    await repository.isRunning(RUN);
    const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]!);
    expect(text).toBe("SELECT 1 AS one FROM ai_eval_runs WHERE id = ?::uuid AND status = 'running'");
    expect(values).toEqual([RUN]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('a row found → true', async () => {
    expect(await setup([{ one: 1 }]).repository.isRunning(RUN)).toBe(true);
  });

  it('no row (queued, finished, failed, cancelled or gone) → false', async () => {
    expect(await setup([]).repository.isRunning(RUN)).toBe(false);
  });
});

describe('EvalRunsRepository writes stay guarded by status = running', () => {
  it.each(['finish', 'fail'] as const)('%s changes a row only while it is running', async (method) => {
    const { prisma, repository } = setup([]);
    const now = new Date('2026-10-28T03:00:00Z');
    if (method === 'finish') await repository.finish(RUN, now);
    if (method === 'fail') await repository.fail(RUN, 'boom', now);
    const { text } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(text).toMatch(/WHERE (r\.)?id = \?::uuid AND (r\.)?status = 'running'$/);
  });

  it('E1: finish sums the run from its item rows, not from a Json column', async () => {
    const { prisma, repository } = setup([]);
    await repository.finish(RUN, new Date('2026-10-28T03:00:00Z'));
    const { text } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain('FROM ai_eval_run_items');
    expect(text).toContain("status = 'running'");
    expect(text).not.toContain('jsonb_array_elements');
  });

  it('E1: completeItem writes only an item that is still pending, and only while its run is running, and beats the heartbeat', async () => {
    const { prisma, repository } = setup([]);
    const now = new Date('2026-10-28T03:00:00Z');
    await repository.completeItem(ITEM, RESULT, now);
    const { text, values } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain("i.status = 'pending'");
    expect(text).toContain("r.status = 'running'");
    expect(text).toContain('heartbeat_at =');
    expect(values).toContain(ITEM);
    expect(values).toContain(40);
    expect(values).toContain('{"sentence":"x"}');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('completeItem stores a missing output as SQL NULL, not as the JSON null', async () => {
    const { prisma, repository } = setup([]);
    await repository.completeItem(ITEM, { ...RESULT, status: 'transient_failure', reason: 'timeout', output: null, raw_output: null }, new Date());
    const { values } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(values).not.toContain('null');
    expect(values).toContain(null);
  });
});

describe('EvalRunsRepository.pendingItems', () => {
  it('reads the pending rows of one run in position order and maps them', async () => {
    const { prisma, repository } = setup([{
      id: ITEM, run_id: RUN, example_id: EXAMPLE, position: 2, split: 'dev', input: { word: 'go' }, expected: { forms: ['go'] }, status: 'pending',
      reason: null, output: null, raw_output: null, rule: null, expected_result: null, latency_ms: null, cost_usd: null,
    }]);
    const rows = await repository.pendingItems(RUN);
    const { text, values } = sqlOf(prisma.$queryRaw.mock.calls[0]!);
    expect(text).toBe("SELECT * FROM ai_eval_run_items WHERE run_id = ?::uuid AND status = 'pending' ORDER BY position, id");
    expect(values).toEqual([RUN]);
    expect(rows).toEqual([{
      id: ITEM, runId: RUN, exampleId: EXAMPLE, position: 2, split: 'dev', input: { word: 'go' }, expected: { forms: ['go'] }, status: 'pending',
      reason: null, output: null, rawOutput: null, rule: null, expectedResult: null, latencyMs: null, costUsd: null,
    }]);
  });
});

describe('EvalRunsRepository.start', () => {
  it('maps the stored prices and flags of the run row', async () => {
    const { repository } = setup([{
      id: RUN, operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: null, max_output_tokens: null,
      prompt_revision: 3, draft: null, status: 'running', total: 3, started_by: ITEM, started_at: null, heartbeat_at: null, finished_at: null,
      error: null, valid_count: 0, avg_latency_ms: null, cost_usd: null, cost_unknown_count: 0, set_id: null, legacy: false,
      price_input: { toString: () => '1.0000' }, price_cached_input: null, price_output: { toString: () => '2.0000' },
      config_id: '55555555-5555-4555-8555-555555555555', config_version: 2,
    }]);
    const row = await repository.start(RUN, new Date());
    expect(row).toMatchObject({ setId: null, legacy: false, priceInput: 1, priceCachedInput: null, priceOutput: 2, configId: '55555555-5555-4555-8555-555555555555', configVersion: 2 });
    expect(row).not.toHaveProperty('items');
    expect(row).not.toHaveProperty('exampleIds');
  });
});
