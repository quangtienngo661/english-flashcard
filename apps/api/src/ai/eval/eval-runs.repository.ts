import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';
import type { EvalSplit, ExpectedResult, RuleResult, RunItemStatus } from './eval.types.js';

export type EvalRunStatus = 'queued' | 'running' | 'finished' | 'failed';

type DecimalLike = { toString(): string };

export type EvalRunRow = {
  id: string;
  operation: AiOperation;
  provider: AiProviderName;
  model: string;
  effort: string | null;
  thinking: 'disabled' | 'between_tools' | null;
  maxOutputTokens: number | null;
  promptRevision: number | null;
  draft: { instructions: string; examples: PromptExample[] } | null;
  status: EvalRunStatus;
  total: number;
  startedBy: string;
  startedAt: Date | null;
  heartbeatAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  validCount: number;
  avgLatencyMs: number | null;
  costUsd: string | null;
  costUnknownCount: number;
  /** null = the working set (a quick try). */
  setId: string | null;
  /** USD per million tokens when the run was created; null when the model had no price. */
  priceInput: number | null;
  priceCachedInput: number | null;
  priceOutput: number | null;
  /** Made before nhóm B. */
  legacy: boolean;
  /** The config this run tried and the version of it (M2); both null for a run of a prompt revision or a Prompt-page draft. */
  configId: string | null;
  configVersion: number | null;
};

/** What a config run needs from its config row: the text, and the version it must still have. */
export type ConfigPrompt = { number: number; version: number; instructions: string; examples: PromptExample[] };

/** One example's snapshot and result inside a run (`ai_eval_run_items`). */
export type EvalRunItemRow = {
  id: string;
  runId: string;
  exampleId: string;
  position: number;
  split: EvalSplit;
  /** null only for a result migrated from before nhóm B whose example was already deleted. */
  input: Record<string, unknown> | null;
  expected: Record<string, unknown> | null;
  status: RunItemStatus;
  reason: string | null;
  output: Record<string, unknown> | null;
  rawOutput: string | null;
  rule: RuleResult | null;
  expectedResult: ExpectedResult | null;
  latencyMs: number | null;
  costUsd: string | null;
};

/** What the job writes for one item once it is done (never `pending`). */
export type ItemResult = {
  status: Exclude<RunItemStatus, 'pending'>;
  reason: string | null;
  output: Record<string, unknown> | null;
  raw_output: string | null;
  latency_ms: number | null;
  cost_usd: string | null;
  rule: RuleResult | null;
  expected_result: ExpectedResult | null;
};

type Raw = {
  id: string; operation: string; provider: string; model: string; effort: string | null; thinking: string | null;
  max_output_tokens: number | null; prompt_revision: number | null; draft: unknown; status: string; total: number;
  started_by: string; started_at: Date | null; heartbeat_at: Date | null; finished_at: Date | null; error: string | null;
  valid_count: number; avg_latency_ms: number | null; cost_usd: DecimalLike | null; cost_unknown_count: number;
  set_id: string | null; price_input: DecimalLike | null; price_cached_input: DecimalLike | null; price_output: DecimalLike | null; legacy: boolean;
  config_id: string | null; config_version: number | null;
};

type RawItem = {
  id: string; run_id: string; example_id: string; position: number; split: string; input: unknown; expected: unknown; status: string;
  reason: string | null; output: unknown; raw_output: string | null; rule: unknown; expected_result: string | null; latency_ms: number | null;
  cost_usd: DecimalLike | null;
};

const toNumber = (value: DecimalLike | null): number | null => (value === null ? null : Number(value.toString()));

const toRow = (raw: Raw): EvalRunRow => ({
  id: raw.id, operation: raw.operation as AiOperation, provider: raw.provider as AiProviderName, model: raw.model, effort: raw.effort,
  thinking: raw.thinking as EvalRunRow['thinking'], maxOutputTokens: raw.max_output_tokens, promptRevision: raw.prompt_revision,
  draft: raw.draft as EvalRunRow['draft'], status: raw.status as EvalRunStatus, total: raw.total,
  startedBy: raw.started_by, startedAt: raw.started_at, heartbeatAt: raw.heartbeat_at,
  finishedAt: raw.finished_at, error: raw.error, validCount: raw.valid_count, avgLatencyMs: raw.avg_latency_ms,
  costUsd: raw.cost_usd === null ? null : raw.cost_usd.toString(), costUnknownCount: raw.cost_unknown_count,
  setId: raw.set_id, priceInput: toNumber(raw.price_input), priceCachedInput: toNumber(raw.price_cached_input), priceOutput: toNumber(raw.price_output),
  legacy: raw.legacy, configId: raw.config_id, configVersion: raw.config_version,
});

const toItemRow = (raw: RawItem): EvalRunItemRow => ({
  id: raw.id, runId: raw.run_id, exampleId: raw.example_id, position: raw.position, split: raw.split as EvalSplit,
  input: raw.input as EvalRunItemRow['input'], expected: raw.expected as EvalRunItemRow['expected'], status: raw.status as RunItemStatus,
  reason: raw.reason, output: raw.output as EvalRunItemRow['output'], rawOutput: raw.raw_output, rule: raw.rule as RuleResult | null,
  expectedResult: raw.expected_result as ExpectedResult | null, latencyMs: raw.latency_ms,
  costUsd: raw.cost_usd === null ? null : raw.cost_usd.toString(),
});

/** SQL NULL, not the JSON `null`, for an absent Json value. */
const jsonOrNull = (value: unknown): string | null => (value === null || value === undefined ? null : JSON.stringify(value));

/**
 * The job's writes to `ai_eval_runs` and `ai_eval_run_items` (design §10). Each is one conditional statement on the shared client,
 * so no transaction is open while a provider is called (R9) and a finished or failed run is never written again.
 */
@Injectable()
export class EvalRunsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Marks the run `running` (keeping a first `started_at`); null when it is finished, failed or gone. */
  async start(id: string, now: Date): Promise<EvalRunRow | null> {
    const [raw] = await this.prisma.$queryRaw<Raw[]>`
      UPDATE ai_eval_runs SET status = 'running', started_at = COALESCE(started_at, ${now}), heartbeat_at = ${now}
      WHERE id = ${id}::uuid AND status IN ('queued', 'running')
      RETURNING *`;
    return raw ? toRow(raw) : null;
  }

  /** True only while the run is `running`; the job asks before each paid call, so a cancelled run costs no more. */
  async isRunning(id: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ one: number }>>`
      SELECT 1 AS one FROM ai_eval_runs WHERE id = ${id}::uuid AND status = 'running'`;
    return rows.length > 0;
  }

  /** The config row a config run tried; null when it was deleted since (a draft that was removed). */
  async configOf(id: string): Promise<ConfigPrompt | null> {
    const row = await this.prisma.aiConfig.findUnique({ where: { id }, select: { number: true, version: true, instructions: true, examples: true } });
    return row ? { number: row.number, version: row.version, instructions: row.instructions, examples: row.examples as PromptExample[] } : null;
  }

  /** The examples of the run that have no result yet, in position order (B6E93: a resumed run skips the finished ones). */
  async pendingItems(runId: string): Promise<EvalRunItemRow[]> {
    const rows = await this.prisma.$queryRaw<RawItem[]>`
      SELECT * FROM ai_eval_run_items WHERE run_id = ${runId}::uuid AND status = 'pending' ORDER BY position, id`;
    return rows.map(toItemRow);
  }

  /** Each example is written as soon as it is done (B6E92), only while it is pending and its run is running. */
  async completeItem(itemId: string, result: ItemResult, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      WITH written AS (
        UPDATE ai_eval_run_items i SET status = ${result.status}, reason = ${result.reason}, output = ${jsonOrNull(result.output)}::jsonb,
          raw_output = ${result.raw_output}, rule = ${jsonOrNull(result.rule)}::jsonb, expected_result = ${result.expected_result},
          latency_ms = ${result.latency_ms}, cost_usd = ${result.cost_usd}::numeric
        FROM ai_eval_runs r
        WHERE i.id = ${itemId}::uuid AND i.status = 'pending' AND r.id = i.run_id AND r.status = 'running'
        RETURNING i.run_id)
      UPDATE ai_eval_runs SET heartbeat_at = ${now} WHERE id IN (SELECT run_id FROM written)`;
  }

  /** The summary is computed from every stored item, so a resumed run counts the earlier part too. */
  async finish(id: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs r SET status = 'finished', finished_at = ${now}, heartbeat_at = ${now},
        valid_count = s.valid_count, avg_latency_ms = s.avg_latency_ms, cost_usd = s.cost_usd, cost_unknown_count = s.cost_unknown_count
      FROM (
        SELECT count(*) FILTER (WHERE status = 'succeeded')::int AS valid_count,
          round(avg(latency_ms))::int AS avg_latency_ms,
          COALESCE(sum(cost_usd), 0) AS cost_usd,
          count(*) FILTER (WHERE status NOT IN ('skipped', 'pending') AND cost_usd IS NULL)::int AS cost_unknown_count
        FROM ai_eval_run_items WHERE run_id = ${id}::uuid
      ) s
      WHERE r.id = ${id}::uuid AND r.status = 'running'`;
  }

  async fail(id: string, error: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs SET status = 'failed', error = ${error}, finished_at = ${now}
      WHERE id = ${id}::uuid AND status = 'running'`;
  }
}
