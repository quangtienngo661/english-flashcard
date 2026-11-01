import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dayRange } from '../../common/time/day-range.js';
import { userRef, type UserRef } from '../../common/user-ref.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AI_DAY_ZONE, AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { GATEWAY_OPERATIONS } from '../ai.types.js';

export const BATCH_KINDS = ['test', 'eval', 'judge'] as const;
export const BATCH_STATUSES = ['queued', 'running', 'finished', 'failed', 'cancelled'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export const batchesQuerySchema = z.strictObject({
  from: z.iso.date().optional(), to: z.iso.date().optional(), operation: z.enum(GATEWAY_OPERATIONS).optional(),
  kind: z.enum(BATCH_KINDS).optional(), status: z.enum(BATCH_STATUSES).optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().min(1).max(4096).optional(),
});
export const batchParamsSchema = z.strictObject({ id: z.uuid().transform((id) => id.toLowerCase()) });
export type BatchQuery = z.input<typeof batchesQuerySchema>;
export type NewBatch = {
  kind: (typeof BATCH_KINDS)[number]; operation: string; configId?: string | null; configVersion?: number | null;
  fingerprint?: string | null; snapshot?: unknown; sourceId?: string | null; parentId?: string | null;
  model: string; provider: string; total: number; actorId: string; status?: BatchStatus;
};

type BatchRow = {
  id: string; kind: NewBatch['kind']; operation: string; status: BatchStatus; config_id: string | null; config_version: number | null;
  fingerprint: string | null; source_id: string | null; parent_id: string | null; model: string; provider: string; total: number; done: number;
  actor_id: string; created_at: Date; started_at: Date | null; finished_at: Date | null; snapshot?: unknown;
  known_cost_usd: string; unknown_cost_calls: number; calls: number; retries: number;
  input_tokens: bigint | number; cached_input_tokens: bigint | number; output_tokens: bigint | number; reasoning_tokens: bigint | number;
};
export type BatchView = Omit<BatchRow, 'actor_id' | 'snapshot' | 'created_at' | 'started_at' | 'finished_at' | 'input_tokens' | 'cached_input_tokens' | 'output_tokens' | 'reasoning_tokens'> & {
  started_by_user: UserRef; created_at: string; started_at: string | null; finished_at: string | null; cost_usd: string | null;
  input_tokens: number; cached_input_tokens: number; output_tokens: number; reasoning_tokens: number;
};
export type BatchTestItem = { call_id: string; operation_id: string; attempt: number; outcome: string; content: {
  request: unknown; response: string | null; expires_at: string;
} | null };

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

/** Only configuration is durable. Examples here are intentional prompt few-shot, never the eval/test subjects. */
function snapshotOf(snapshot: unknown): Prisma.InputJsonObject | null {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const allowed = new Set(['instructions', 'examples', 'model_ref', 'effort', 'thinking', 'max_output_tokens', 'criteria']);
  return Object.fromEntries(Object.entries(snapshot).filter(([key, value]) => allowed.has(key) && value !== undefined)) as Prisma.InputJsonObject;
}

// Progress belongs to the source, not the number of paid calls (retry, skipped items, and failures all differ).
const SOURCE_JOINS = Prisma.raw(`
  FROM ai_batches b
  LEFT JOIN ai_eval_runs r ON b.kind = 'eval' AND r.id = b.source_id
  LEFT JOIN ai_judge_passes p ON b.kind = 'judge' AND p.id = b.source_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS done FROM ai_eval_run_items i WHERE b.kind = 'eval' AND i.run_id = r.id AND i.status <> 'pending'
  ) progress ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS calls, count(DISTINCT c.operation_id)::int AS done,
      (count(*) FILTER (WHERE c.attempt > 1))::int AS retries,
      coalesce(sum(c.cost_usd) FILTER (WHERE c.cost_known AND c.cost_usd IS NOT NULL), 0)::text AS known_cost_usd,
      (count(*) FILTER (WHERE NOT c.cost_known OR c.cost_usd IS NULL))::int AS unknown_cost_calls,
      coalesce(sum(c.input_tokens), 0)::bigint AS input_tokens, coalesce(sum(c.cached_input_tokens), 0)::bigint AS cached_input_tokens,
      coalesce(sum(c.output_tokens), 0)::bigint AS output_tokens, coalesce(sum(c.reasoning_tokens), 0)::bigint AS reasoning_tokens
    FROM ai_calls c WHERE c.batch_id = b.id
  ) usage ON true`);
const STATUS = Prisma.raw("CASE WHEN (r.status = 'failed' AND r.error = 'cancelled') OR (p.status = 'failed' AND p.error = 'cancelled') THEN 'cancelled' ELSE coalesce(r.status, p.status, b.status) END");
const VIEW_COLUMNS = Prisma.raw(`b.id, b.kind, b.operation, ${STATUS.sql} AS status,
  b.config_id, b.config_version, b.fingerprint, b.source_id, b.parent_id, b.model, b.provider,
  coalesce(r.total, p.total, b.total)::int AS total,
  CASE WHEN b.kind = 'eval' THEN progress.done WHEN b.kind = 'judge' THEN coalesce(p.judged, 0) ELSE usage.done END::int AS done,
  b.actor_id, b.created_at, coalesce(r.started_at, p.started_at, b.started_at) AS started_at,
  coalesce(r.finished_at, p.finished_at, b.finished_at) AS finished_at,
  usage.known_cost_usd, usage.unknown_cost_calls, usage.calls, usage.retries,
  usage.input_tokens, usage.cached_input_tokens, usage.output_tokens, usage.reasoning_tokens`);
const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);
const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.uuid() });

@Injectable()
export class AiBatchesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async create(input: NewBatch, tx: Prisma.TransactionClient = this.prisma): Promise<string> {
    const now = this.clock.now();
    const status = input.status ?? 'queued';
    const snapshot = snapshotOf(input.snapshot);
    const data = {
      kind: input.kind, operation: input.operation, configId: input.configId ?? null, configVersion: input.configVersion ?? null,
      fingerprint: input.fingerprint ?? null, ...(snapshot === null ? {} : { snapshot }), sourceId: input.sourceId ?? null,
      parentId: input.parentId ?? null, model: input.model, provider: input.provider, total: input.total, actorId: input.actorId,
      status, createdAt: now, ...(status === 'running' ? { startedAt: now } : {}),
      ...(['finished', 'failed', 'cancelled'].includes(status) ? { startedAt: now, finishedAt: now } : {}),
    };
    const row = input.sourceId
      ? await tx.aiBatch.upsert({ where: { sourceId: input.sourceId }, create: data, update: {}, select: { id: true } })
      : await tx.aiBatch.create({ data, select: { id: true } });
    return row.id;
  }

  async start(id: string): Promise<void> {
    await this.prisma.$executeRaw(Prisma.sql`UPDATE ai_batches SET status = 'running', started_at = COALESCE(started_at, ${this.clock.now()})
      WHERE id = ${id}::uuid AND status IN ('queued', 'running')`);
  }

  async finish(id: string, status: 'finished' | 'failed' | 'cancelled' = 'finished'): Promise<void> {
    await this.prisma.aiBatch.updateMany({ where: { id, status: { in: ['queued', 'running'] } }, data: { status, finishedAt: this.clock.now() } });
  }

  async list(input: BatchQuery): Promise<{ items: BatchView[]; next_page_token: string | null }> {
    const query = parse(batchesQuerySchema, input);
    const range = dayRange(query, AI_DAY_ZONE, this.clock.now(), 1);
    const binding = JSON.stringify(['ai-batches', range.from, range.to, query.operation ?? null, query.kind ?? null, query.status ?? null]);
    const cursor = query.page_token ? parse(cursorSchema, decodeBoundToken(query.page_token, binding)) : null;
    const clauses = [Prisma.sql`b.created_at >= ${range.start}`, Prisma.sql`b.created_at < ${range.end}`];
    if (query.operation) clauses.push(Prisma.sql`b.operation = ${query.operation}`);
    if (query.kind) clauses.push(Prisma.sql`b.kind = ${query.kind}`);
    if (query.status) clauses.push(Prisma.sql`${STATUS} = ${query.status}`);
    if (cursor) clauses.push(Prisma.sql`(b.created_at, b.id) < (${new Date(cursor.created_at)}, ${cursor.id}::uuid)`);
    const rows = await this.prisma.$queryRaw<BatchRow[]>(Prisma.sql`
      SELECT ${VIEW_COLUMNS} ${SOURCE_JOINS} WHERE ${Prisma.join(clauses, ' AND ')}
      ORDER BY b.created_at DESC, b.id DESC LIMIT ${query.page_size + 1}`);
    const page = rows.slice(0, query.page_size);
    const last = page.at(-1);
    return {
      items: await this.views(page),
      next_page_token: rows.length > query.page_size && last ? encodeBoundToken({ created_at: last.created_at.toISOString(), id: last.id }, binding) : null,
    };
  }

  async get(id: string): Promise<BatchView & { snapshot: Prisma.InputJsonObject | null; items: BatchTestItem[] }> {
    const params = parse(batchParamsSchema, { id });
    const [row] = await this.prisma.$queryRaw<BatchRow[]>(Prisma.sql`
      SELECT ${VIEW_COLUMNS}, b.snapshot ${SOURCE_JOINS} WHERE b.id = ${params.id}::uuid`);
    if (!row) throw new ProblemDetailsException({ status: 404, type: 'not-found', title: 'Not found' });
    const [view] = await this.views([row]);
    // No eval/judge content is fetched here. Their own source endpoints enforce held-out redaction.
    const items = row.kind === 'test' ? await this.prisma.$queryRaw<BatchTestItem[]>(Prisma.sql`
      SELECT DISTINCT ON (c.operation_id) c.id AS call_id, c.operation_id, c.attempt, c.outcome,
        CASE WHEN cc.call_id IS NULL THEN NULL ELSE jsonb_build_object('request', cc.request, 'response', cc.response,
          'expires_at', cc.expires_at) END AS content
      FROM ai_calls c LEFT JOIN ai_call_contents cc ON cc.call_id = c.id AND cc.expires_at > ${this.clock.now()}
      WHERE c.batch_id = ${params.id}::uuid AND c.purpose = 'test'
      ORDER BY c.operation_id, c.created_at DESC, c.attempt DESC, c.id DESC`) : [];
    return { ...view!, snapshot: snapshotOf(row.snapshot), items };
  }

  private async views(rows: BatchRow[]): Promise<BatchView[]> {
    if (rows.length === 0) return [];
    const emails = await this.identity.emailsOf([...new Set(rows.map((row) => row.actor_id))]);
    return rows.map((row) => ({
      id: row.id, kind: row.kind, operation: row.operation, status: row.status, config_id: row.config_id, config_version: row.config_version,
      fingerprint: row.fingerprint, source_id: row.source_id, parent_id: row.parent_id, model: row.model, provider: row.provider,
      total: row.total, done: row.done, started_by_user: userRef(row.actor_id, emails, SYSTEM_IDS), created_at: row.created_at.toISOString(),
      started_at: row.started_at?.toISOString() ?? null, finished_at: row.finished_at?.toISOString() ?? null,
      known_cost_usd: row.known_cost_usd, cost_usd: row.unknown_cost_calls > 0 ? null : row.known_cost_usd,
      unknown_cost_calls: row.unknown_cost_calls, calls: row.calls, retries: row.retries,
      input_tokens: Number(row.input_tokens), cached_input_tokens: Number(row.cached_input_tokens),
      output_tokens: Number(row.output_tokens), reasoning_tokens: Number(row.reasoning_tokens),
    }));
  }
}
