import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { TEST_EXAMPLES_MAX } from '../ai.constants.js';
import type { AiOperation } from '../ai.types.js';
import type { CallSummary, RunReport } from '../runner/runner.service.js';
import type { PromptExample } from './prompt-rules.js';

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

/**
 * The inputs of a prompt or config test: `example_ids` → those examples; else the first five dev examples of the example set; else the
 * draft's own examples (design §7.4). A held-out example is never computed here: its input must not reach anyone through a test
 * (design §5.1, R7).
 */
export async function testInputs(
  prisma: Pick<PrismaClient, 'aiEvalExample'>,
  op: AiOperation,
  body: { example_ids?: string[]; examples: unknown[] },
): Promise<unknown[]> {
  if (body.example_ids !== undefined) {
    const ids = [...new Set(body.example_ids)];
    const rows = await prisma.aiEvalExample.findMany({ where: { id: { in: ids } } });
    if (ids.length === 0 || rows.length !== ids.length || rows.some((row) => row.operation !== op || row.split !== 'dev')) {
      throw invalid([`example_ids: every id must be a dev example of ${op}`]);
    }
    return rows.map((row) => row.input);
  }
  const stored = await prisma.aiEvalExample.findMany({
    where: { operation: op, split: 'dev' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: TEST_EXAMPLES_MAX,
  });
  if (stored.length > 0) return stored.map((row) => row.input);
  const own = (body.examples as PromptExample[]).slice(0, TEST_EXAMPLES_MAX).map((example) => example.input);
  if (own.length === 0) throw invalid(['examples: at least one example is needed']);
  return own;
}

export type TestItem = {
  input: unknown;
  status: string;
  reason: string | null;
  output: Record<string, unknown> | null;
  raw_output: string | null;
  latency_ms: number;
  cost_usd: string | null;
  calls: CallSummary[];
};

const USD_SCALE = 1e8;

/** Sum of the calls' costs; unknown when any call's cost is (or when no call was made). */
function totalCost(calls: CallSummary[]): string | null {
  if (calls.length === 0 || calls.some((call) => call.cost_usd === null)) return null;
  const units = calls.reduce((sum, call) => sum + Math.round(Number(call.cost_usd) * USD_SCALE), 0);
  return (units / USD_SCALE).toFixed(8);
}

export function toTestItem(input: unknown, report: RunReport): TestItem {
  const { result } = report;
  return {
    input,
    status: result.status,
    reason: 'reason' in result ? result.reason : null,
    output: result.status === 'succeeded' ? result.result : null,
    raw_output: report.rawOutput,
    latency_ms: report.calls.reduce((sum, call) => sum + call.latency_ms, 0),
    cost_usd: totalCost(report.calls),
    calls: report.calls,
  };
}
