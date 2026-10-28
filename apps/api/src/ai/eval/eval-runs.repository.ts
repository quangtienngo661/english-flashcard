import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation, AiProviderName, AiResult } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';

/** One example's result inside `ai_eval_runs.items`; `skipped` = the example was deleted since the run was created. */
export type EvalItem = {
  example_id: string;
  status: AiResult['status'] | 'skipped';
  reason: string | null;
  output: Record<string, unknown> | null;
  raw_output: string | null;
  latency_ms: number | null;
  cost_usd: string | null;
};

export type EvalRunStatus = 'queued' | 'running' | 'finished' | 'failed';

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
  exampleIds: string[];
  status: EvalRunStatus;
  total: number;
  items: EvalItem[];
  startedBy: string;
  startedAt: Date | null;
  heartbeatAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  validCount: number;
  avgLatencyMs: number | null;
  costUsd: string | null;
  costUnknownCount: number;
};

type Raw = {
  id: string; operation: string; provider: string; model: string; effort: string | null; thinking: string | null;
  max_output_tokens: number | null; prompt_revision: number | null; draft: unknown; example_ids: string[]; status: string; total: number;
  items: unknown; started_by: string; started_at: Date | null; heartbeat_at: Date | null; finished_at: Date | null; error: string | null;
  valid_count: number; avg_latency_ms: number | null; cost_usd: { toString(): string } | null; cost_unknown_count: number;
};

const toRow = (raw: Raw): EvalRunRow => ({
  id: raw.id, operation: raw.operation as AiOperation, provider: raw.provider as AiProviderName, model: raw.model, effort: raw.effort,
  thinking: raw.thinking as EvalRunRow['thinking'], maxOutputTokens: raw.max_output_tokens, promptRevision: raw.prompt_revision,
  draft: raw.draft as EvalRunRow['draft'], exampleIds: raw.example_ids, status: raw.status as EvalRunStatus, total: raw.total,
  items: raw.items as EvalItem[], startedBy: raw.started_by, startedAt: raw.started_at, heartbeatAt: raw.heartbeat_at,
  finishedAt: raw.finished_at, error: raw.error, validCount: raw.valid_count, avgLatencyMs: raw.avg_latency_ms,
  costUsd: raw.cost_usd === null ? null : raw.cost_usd.toString(), costUnknownCount: raw.cost_unknown_count,
});

/**
 * The job's writes to `ai_eval_runs` (design §10). Each is one conditional statement on the shared client, so no transaction is
 * open while a provider is called (R9) and a finished or failed run is never written again.
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

  /** Each example is written as soon as it is done (B6E92): a later run of the job skips it (B6E93). */
  async appendItem(id: string, item: EvalItem, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs SET items = items || ${JSON.stringify([item])}::jsonb, heartbeat_at = ${now}
      WHERE id = ${id}::uuid AND status = 'running'`;
  }

  /** The summary is computed from every stored item, so a resumed run counts the earlier part too. */
  async finish(id: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs r SET status = 'finished', finished_at = ${now}, heartbeat_at = ${now},
        valid_count = s.valid_count, avg_latency_ms = s.avg_latency_ms, cost_usd = s.cost_usd, cost_unknown_count = s.cost_unknown_count
      FROM (
        SELECT count(*) FILTER (WHERE i->>'status' = 'succeeded')::int AS valid_count,
          round(avg((i->>'latency_ms')::numeric))::int AS avg_latency_ms,
          COALESCE(sum((i->>'cost_usd')::numeric), 0) AS cost_usd,
          count(*) FILTER (WHERE i->>'status' <> 'skipped' AND i->>'cost_usd' IS NULL)::int AS cost_unknown_count
        FROM ai_eval_runs, jsonb_array_elements(items) AS i WHERE id = ${id}::uuid
      ) s
      WHERE r.id = ${id}::uuid AND r.status = 'running'`;
  }

  async fail(id: string, error: string, now: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_eval_runs SET status = 'failed', error = ${error}, finished_at = ${now}
      WHERE id = ${id}::uuid AND status = 'running'`;
  }
}
