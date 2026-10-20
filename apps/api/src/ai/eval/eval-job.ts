import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { EVAL_JOB_CONCURRENCY } from '../ai.constants.js';
import { PromptsRepository } from '../prompts/prompts.repository.js';
import type { Price } from '../runner/cost.js';
import { RunnerService, type RunReport } from '../runner/runner.service.js';
import type { Selection } from '../runner/selection.js';
import { EvalRunsRepository, type EvalItem, type EvalRunRow } from './eval-runs.repository.js';

/** An error whose message is safe to store (it carries no content). */
class EvalRunError extends Error {}

type DecimalLike = { toString(): string } | number;
const toNumber = (value: DecimalLike | null): number | null => (value === null ? null : Number(value.toString()));

/** Only names and codes are stored: a driver message may echo the data (design §10, ≤ 240 characters). */
function oneLine(error: unknown): string {
  if (error instanceof EvalRunError) return error.message.slice(0, 240);
  const name = error instanceof Error ? error.name : 'Error';
  const code = error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? ` ${error.code}` : '';
  return `${name}${code}`.slice(0, 240);
}

function toItem(exampleId: string, report: RunReport): EvalItem {
  const { result, calls } = report;
  const costs = calls.map((call) => call.cost_usd);
  return {
    example_id: exampleId,
    status: result.status,
    reason: 'reason' in result ? result.reason : null,
    output: result.status === 'succeeded' ? result.result : null,
    raw_output: report.rawOutput,
    latency_ms: calls.length ? calls.reduce((sum, call) => sum + call.latency_ms, 0) : null,
    cost_usd: costs.some((cost) => cost === null) ? null : costs.reduce((sum, cost) => sum + Number(cost), 0).toFixed(8),
  };
}

/** Runs `items` through `task` with at most `limit` at once. */
async function inPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await task(item);
  }));
}

/**
 * One run of the example set (design §10, plan choice 10): exactly the ids stored when the run was created, skipping those already
 * in `items` (B6E93), up to `EVAL_JOB_CONCURRENCY` at once, each a real `eval` call with the run row's selection and prompt.
 */
@Injectable()
export class EvalJob {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(EvalRunsRepository) private readonly runs: EvalRunsRepository,
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(PromptsRepository) private readonly prompts: PromptsRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async run(runId: string): Promise<void> {
    const run = await this.runs.start(runId, this.clock.now());
    if (!run) return;
    try {
      const done = new Set(run.items.map((item) => item.example_id));
      const pending = run.exampleIds.filter((id) => !done.has(id));
      const prompt = await this.prompt(run);
      const selection = await this.selection(run);
      const rows = await this.prisma.aiEvalExample.findMany({ where: { id: { in: pending } } });
      const inputs = new Map(rows.map((row) => [row.id, row.input]));
      await inPool(pending, EVAL_JOB_CONCURRENCY, async (exampleId) => {
        const item = inputs.has(exampleId)
          ? toItem(exampleId, await this.runner.execute({
            purpose: 'eval', operation: run.operation, data: inputs.get(exampleId), actorId: run.startedBy,
            callOperationId: `eval-${run.id}-${exampleId}`, selection, prompt,
          }))
          : {
            example_id: exampleId, status: 'skipped' as const, reason: 'example-deleted', output: null, raw_output: null, latency_ms: null,
            cost_usd: null,
          };
        await this.runs.appendItem(run.id, item, this.clock.now());
      });
      await this.runs.finish(run.id, this.clock.now());
    } catch (error) {
      const message = oneLine(error);
      this.logger.warn('ai_eval_run_failed', { run_id: run.id, error: message });
      await this.runs.fail(run.id, message, this.clock.now());
    }
  }

  private async prompt(run: EvalRunRow) {
    if (run.draft) return { ...run.draft, revision: null };
    const stored = await this.prompts.atRevision(run.operation, run.promptRevision as number);
    if (!stored) throw new EvalRunError(`prompt revision ${run.promptRevision} not found`);
    return stored;
  }

  /** The stored selection; the price is the model's current one, or none when the model was removed since. */
  private async selection(run: EvalRunRow): Promise<Selection> {
    const model = await this.prisma.aiModel.findUnique({ where: { provider_modelId: { provider: run.provider, modelId: run.model } } });
    const input = model ? toNumber(model.priceInput) : null;
    const output = model ? toNumber(model.priceOutput) : null;
    const price: Price | null = model && input !== null && output !== null
      ? { input, cachedInput: toNumber(model.priceCachedInput), output } : null;
    return {
      operation: run.operation, modelRef: null, provider: run.provider, modelId: run.model, effort: run.effort, thinking: run.thinking,
      maxOutputTokens: run.maxOutputTokens, price,
    };
  }
}
