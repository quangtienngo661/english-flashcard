import { describe, expect, it, vi } from 'vitest';
import { EvalRunsRepository } from './eval-runs.repository.js';

const RUN = '22222222-2222-4222-8222-222222222222';

/** The SQL text of a tagged-template call, with its values. */
const sqlOf = (call: unknown[]) => ({ text: (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' ').trim(), values: call.slice(1) });

function setup(rows: unknown[]) {
  const prisma = { $queryRaw: vi.fn(async (..._args: unknown[]) => rows), $executeRaw: vi.fn(async (..._args: unknown[]) => 0) };
  return { prisma, repository: new EvalRunsRepository(prisma as never) };
}

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
  it.each(['appendItem', 'finish', 'fail'] as const)('%s changes a row only while it is running', async (method) => {
    const { prisma, repository } = setup([]);
    const now = new Date('2026-10-28T03:00:00Z');
    if (method === 'appendItem') await repository.appendItem(RUN, { example_id: 'x', status: 'succeeded', reason: null, output: null, raw_output: null, latency_ms: null, cost_usd: null }, now);
    if (method === 'finish') await repository.finish(RUN, now);
    if (method === 'fail') await repository.fail(RUN, 'boom', now);
    const { text } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(text).toMatch(/WHERE (r\.)?id = \?::uuid AND (r\.)?status = 'running'$/);
  });
});
