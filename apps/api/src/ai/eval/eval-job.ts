import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { EVAL_JOB_CONCURRENCY } from '../ai.constants.js';
import { PromptsRepository } from '../prompts/prompts.repository.js';
import type { Price } from '../runner/cost.js';
import { RunnerService, type RunReport } from '../runner/runner.service.js';
import type { Selection } from '../runner/selection.js';
import { EvalRunsRepository, type EvalRunItemRow, type EvalRunRow, type ItemResult } from './eval-runs.repository.js';

/** An error whose message is safe to store (it carries no content). */
class EvalRunError extends Error {}

/** Only names and codes are stored: a driver message may echo the data (design §10, ≤ 240 characters). */
function oneLine(error: unknown): string {
  if (error instanceof EvalRunError) return error.message.slice(0, 240);
  const name = error instanceof Error ? error.name : 'Error';
  const code = error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? ` ${error.code}` : '';
  return `${name}${code}`.slice(0, 240);
}

function toResult(report: RunReport): ItemResult {
  const { result, calls } = report;
  const costs = calls.map((call) => call.cost_usd);
  return {
    status: result.status,
    reason: 'reason' in result ? result.reason : null,
    output: result.status === 'succeeded' ? result.result : null,
    raw_output: report.rawOutput,
    latency_ms: calls.length ? calls.reduce((sum, call) => sum + call.latency_ms, 0) : null,
    cost_usd: costs.some((cost) => cost === null) ? null : costs.reduce((sum, cost) => sum + Number(cost), 0).toFixed(8),
    rule: null,
    expected_result: null,
  };
}

const SKIPPED: ItemResult = {
  status: 'skipped', reason: 'example-deleted', output: null, raw_output: null, latency_ms: null, cost_usd: null, rule: null, expected_result: null,
};

/** Runs `items` through `task` with at most `limit` at once. */
async function inPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await task(item);
  }));
}

/**
 * One run of the example set (design §10, plan choice 10): the items stored when the run was created, skipping those that already
 * have a result (B6E93), up to `EVAL_JOB_CONCURRENCY` at once, each a real `eval` call from the item's snapshot with the run row's
 * selection, stored price and prompt.
 */
@Injectable()
export class EvalJob {
  constructor(
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
      const pending = await this.runs.pendingItems(run.id);
      const prompt = await this.prompt(run);
      const selection = this.selection(run);
      let stopped = false;
      await inPool(pending, EVAL_JOB_CONCURRENCY, async (item) => {
        // A run cancelled (or closed as stalled) meanwhile is no longer `running`: no further paid call, nothing written.
        if (!stopped && !(await this.runs.isRunning(run.id))) stopped = true;
        if (stopped) return;
        const result = item.input === null ? SKIPPED : toResult(await this.execute(run, item, selection, prompt));
        await this.runs.completeItem(item.id, result, this.clock.now());
      });
      // `finish` is guarded by `status = 'running'` as well; skipping it just spares a statement.
      if (!stopped) await this.runs.finish(run.id, this.clock.now());
    } catch (error) {
      const message = oneLine(error);
      this.logger.warn('ai_eval_run_failed', { run_id: run.id, error: message });
      await this.runs.fail(run.id, message, this.clock.now());
    }
  }

  private execute(run: EvalRunRow, item: EvalRunItemRow, selection: Selection, prompt: Awaited<ReturnType<EvalJob['prompt']>>): Promise<RunReport> {
    return this.runner.execute({
      purpose: 'eval', operation: run.operation, data: item.input, actorId: run.startedBy,
      callOperationId: `eval-${run.id}-${item.exampleId}`, selection, prompt,
    });
  }

  private async prompt(run: EvalRunRow) {
    if (run.draft) return { ...run.draft, revision: null };
    const stored = await this.prompts.atRevision(run.operation, run.promptRevision as number);
    if (!stored) throw new EvalRunError(`prompt revision ${run.promptRevision} not found`);
    return stored;
  }

  /** The stored selection; the price is the one stored on the run row when it was created (E1), so a later price edit changes nothing. */
  private selection(run: EvalRunRow): Selection {
    const price: Price | null = run.priceInput !== null && run.priceOutput !== null
      ? { input: run.priceInput, cachedInput: run.priceCachedInput, output: run.priceOutput } : null;
    return {
      operation: run.operation, modelRef: null, provider: run.provider, modelId: run.model, effort: run.effort, thinking: run.thinking,
      maxOutputTokens: run.maxOutputTokens, price,
    };
  }
}
