import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ReportsService, type CostTotals, type StatusReport } from './reports.service.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');

const totals = (calls: number, cost: string, vnd: number): CostTotals => ({
  calls, input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_tokens: 0, cost_usd: cost, cost_vnd: vnd, unknown_cost_calls: 0,
});

const STATUS: StatusReport = {
  operations: [{
    operation: 'generate_cloze', ready: true, reason: null, model: { provider: 'fake', model_id: 'fake:ok' }, effort: 'low', thinking: null,
    max_output_tokens: 1_200, last_error: null, model_warning: null,
  }],
  today: { calls: 3, cap: 500, failed_calls: 1, failed_cost_usd: '0.00000000', cost_usd: '0.00100000', cost_vnd: 26 },
  ai_enabled: true,
  providers: { openai: false, anthropic: true, fake: true } as StatusReport['providers'],
};

function setup(rows: { health?: unknown[]; outcomes?: unknown[]; learnerDays?: unknown[] } = {}) {
  const statements: string[] = [];
  const prisma = {
    $queryRaw: vi.fn(async (statement: { sql: string }) => {
      const sql = statement.sql.replace(/\s+/g, ' ');
      statements.push(sql);
      if (sql.includes('percentile_cont')) return rows.health ?? [];
      if (sql.includes('SELECT operation, outcome')) return rows.outcomes ?? [];
      return rows.learnerDays ?? [];
    }),
  } as unknown as PrismaClient;
  const service = new ReportsService(prisma, {} as never, {} as never, {} as never, {} as never, {} as never);
  vi.spyOn(service, 'status').mockResolvedValue(STATUS);
  const costs = vi.spyOn(service, 'costs').mockImplementation(async (query) => ({
    items: query.group_by === 'day' ? [{ key: '2026-10-19', ...totals(5, '0.00200000', 52) }] : [{ key: query.group_by, ...totals(5, '0.00200000', 52) }],
    total: totals(5, '0.00200000', 52),
  }));
  return { service, statements, costs };
}

describe('ReportsService.dashboard', () => {
  it('defaults to the 30 Vietnam days ending today; every group of the costs report is read over that range', async () => {
    const { service, costs } = setup();
    const report = await service.dashboard({}, NOW);
    expect(report).toMatchObject({ from: '2026-09-21', to: '2026-10-20', ai_enabled: true, today: STATUS.today, total: totals(5, '0.00200000', 52) });
    expect(costs.mock.calls.map(([query]) => query)).toEqual(['day', 'operation', 'model', 'purpose'].map((group_by) => ({
      from: '2026-09-21', to: '2026-10-20', group_by,
    })));
    expect(report.by_operation).toEqual([{ key: 'operation', ...totals(5, '0.00200000', 52) }]);
  });

  it('operations keep only readiness, model and the last error (no effort or token setting)', async () => {
    const { service } = setup();
    const { operations } = await service.dashboard({}, NOW);
    expect(operations).toEqual([{ operation: 'generate_cloze', ready: true, reason: null, model: { provider: 'fake', model_id: 'fake:ok' }, last_error: null }]);
  });

  it('days: one per day, a day without a call is zero; learner calls and failures come from learner calls only', async () => {
    const { service, statements } = setup({ learnerDays: [{ key: '2026-10-19', calls: 4, failed: 1 }] });
    const { days } = await service.dashboard({ from: '2026-10-18', to: '2026-10-20' }, NOW);
    expect(days).toEqual([
      { date: '2026-10-18', calls: 0, cost_usd: '0.00000000', cost_vnd: 0, learner_calls: 0, learner_failed: 0 },
      { date: '2026-10-19', calls: 5, cost_usd: '0.00200000', cost_vnd: 52, learner_calls: 4, learner_failed: 1 },
      { date: '2026-10-20', calls: 0, cost_usd: '0.00000000', cost_vnd: 0, learner_calls: 0, learner_failed: 0 },
    ]);
    expect(statements).toHaveLength(3);
    for (const sql of statements) expect(sql).toContain("purpose = 'learner'");
  });

  it('learner health carries p50/p95 and the count of each outcome of its operation', async () => {
    const { service } = setup({
      health: [{ operation: 'generate_cloze', calls: 4, failed: 1, p50_ms: 2_000, p95_ms: 9_000 }],
      outcomes: [
        { operation: 'generate_cloze', outcome: 'succeeded', calls: 3 }, { operation: 'generate_cloze', outcome: 'timeout', calls: 1 },
        { operation: 'lookup_word', outcome: 'succeeded', calls: 2 },
      ],
    });
    const { learner_health } = await service.dashboard({}, NOW);
    expect(learner_health).toEqual([
      { operation: 'generate_cloze', calls: 4, failed: 1, p50_ms: 2_000, p95_ms: 9_000, outcomes: { succeeded: 3, timeout: 1 } },
    ]);
  });

  it('a reversed range → 400 before any query', async () => {
    const { service, statements, costs } = setup();
    const error = await service.dashboard({ from: '2026-10-21', to: '2026-10-20' }, NOW).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).getStatus()).toBe(400);
    expect(statements).toHaveLength(0);
    expect(costs).not.toHaveBeenCalled();
  });
});
