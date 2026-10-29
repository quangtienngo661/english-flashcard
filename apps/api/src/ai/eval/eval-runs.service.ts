import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { userRef } from '../../common/user-ref.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { AI_OPERATIONS, type AiOperation } from '../ai.types.js';
import { promptViolations } from '../prompts/prompt-rules.js';
import { PromptsRepository } from '../prompts/prompts.repository.js';
import { SelectionReader } from '../runner/selection.js';
import { EvalQueue } from './eval-queue.service.js';

/** Body of `POST /v1/admin/ai/eval/runs` (design §10): the prompt in use, or a draft checked by the save rules. */
export const createRunSchema = z.strictObject({
  operation: z.enum(AI_OPERATIONS),
  prompt: z.union([z.literal('current'), z.strictObject({ instructions: z.string(), examples: z.array(z.unknown()) })]),
});
export type CreateRunBody = z.input<typeof createRunSchema>;

type RunRecord = {
  id: string; operation: string; provider: string; model: string; effort: string | null; thinking: string | null;
  maxOutputTokens: number | null; promptRevision: number | null; draft: unknown; status: string; total: number;
  validCount: number; avgLatencyMs: number | null; costUsd: { toFixed(digits: number): string } | null; costUnknownCount: number;
  error: string | null; startedBy: string; createdAt: Date; startedAt: Date | null; finishedAt: Date | null;
};

type ItemRecord = {
  exampleId: string; position: number; split: string; input: unknown; expected: unknown; status: string; reason: string | null; output: unknown;
  rawOutput: string | null; rule: unknown; expectedResult: string | null; latencyMs: number | null; costUsd: { toFixed(digits: number): string } | null;
};

/** One example's snapshot and result as the API shows it (`GET …/runs/:id` keeps the old keys and adds the rest). */
function itemView(row: ItemRecord) {
  return {
    example_id: row.exampleId, position: row.position, split: row.split, input: row.input, expected: row.expected, status: row.status,
    reason: row.reason, output: row.output, raw_output: row.rawOutput, rule: row.rule, expected_result: row.expectedResult,
    latency_ms: row.latencyMs, cost_usd: row.costUsd?.toFixed(8) ?? null,
  };
}
export type RunItemView = ReturnType<typeof itemView>;

const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.string() });

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

function summary(row: RunRecord, done: number, emails: ReadonlyMap<string, string>) {
  return {
    id: row.id, operation: row.operation as AiOperation, provider: row.provider, model: row.model, effort: row.effort,
    thinking: row.thinking, max_output_tokens: row.maxOutputTokens, prompt_revision: row.promptRevision, status: row.status,
    total: row.total, done, valid_count: row.validCount,
    avg_latency_ms: row.avgLatencyMs, cost_usd: row.costUsd?.toFixed(8) ?? null, cost_unknown_count: row.costUnknownCount,
    error: row.error, started_by: row.startedBy, started_by_user: userRef(row.startedBy, emails, SYSTEM_IDS), created_at: row.createdAt.toISOString(),
    started_at: row.startedAt?.toISOString() ?? null, finished_at: row.finishedAt?.toISOString() ?? null,
  };
}

/** Runs of the example set (design §10, §12.1 #14–#15). Creating one only inserts rows and enqueues: no provider call here. */
@Injectable()
export class EvalRunsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SelectionReader) private readonly selections: SelectionReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(PromptsRepository) private readonly prompts: PromptsRepository,
    @Inject(EvalQueue) private readonly queue: EvalQueue,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async create(actorId: string, body: CreateRunBody): Promise<{ run_id: string; status: 'queued' }> {
    const parsed = createRunSchema.safeParse(body);
    if (!parsed.success) throw invalid(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    const { operation, prompt } = parsed.data;
    const selection = await this.selections.load(operation);
    if (!selection) throw problem(409, 'model-not-set', 'Model not set');
    if (!this.registry.get(selection.provider)) throw problem(409, 'provider-not-configured', 'Provider not configured');
    let promptRevision: number | null = null;
    let draft: { instructions: string; examples: unknown[] } | null = null;
    if (prompt === 'current') {
      promptRevision = (await this.prompts.current(operation)).revision;
    } else {
      const violations = promptViolations(operation, prompt);
      if (violations.length) throw invalid(violations.map((violation) => `prompt.${violation}`));
      draft = prompt;
    }
    const examples = await this.prisma.aiEvalExample.findMany({
      where: { operation }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, split: true, input: true, expected: true },
    });
    if (examples.length === 0) throw invalid(['examples: at least one example is needed']);
    // The run counts against `ai.test` only now: a request refused above (no model, bad draft, no example) costs nothing.
    await this.limiter.hit('ai.test', actorId);
    // The resolved selection and price are stored (plan choice 10, E1): a later change of the operation's choice or of the model's
    // price does not change this run. Each example is copied into an item row, so editing or deleting it later changes nothing either.
    const row = await this.prisma.$transaction(async (tx) => {
      const run = await tx.aiEvalRun.create({ data: {
        operation, provider: selection.provider, model: selection.modelId, effort: selection.effort, thinking: selection.thinking,
        maxOutputTokens: selection.maxOutputTokens, promptRevision,
        ...(draft ? { draft: draft as Prisma.InputJsonValue } : {}),
        priceInput: selection.price?.input ?? null, priceCachedInput: selection.price?.cachedInput ?? null, priceOutput: selection.price?.output ?? null,
        status: 'queued', total: examples.length, startedBy: actorId,
      } });
      await tx.aiEvalRunItem.createMany({ data: examples.map((example, position) => ({
        runId: run.id, exampleId: example.id, position, split: example.split, input: example.input as Prisma.InputJsonValue,
        // A Json column takes no plain null: the key is left out and the column stays SQL NULL.
        ...(example.expected === null ? {} : { expected: example.expected as Prisma.InputJsonValue }),
      })) });
      return run;
    });
    // Redis down: the row stays queued and the hourly job enqueues it again (B6E91); `enqueue` logs the failure.
    await this.queue.enqueue(row.id);
    return { run_id: row.id, status: 'queued' };
  }

  async list(op: AiOperation, pageSize: number, pageToken: string | undefined) {
    const binding = createHash('sha256').update(JSON.stringify({ route: 'ai-eval-runs', operation: op })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (pageToken !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(pageToken, binding));
      if (!parsed.success) throw invalid(['page_token: Invalid page token']);
      cursor = parsed.data;
    }
    const rows = await this.prisma.aiEvalRun.findMany({
      where: {
        operation: op,
        ...(cursor ? { OR: [
          { createdAt: { lt: new Date(cursor.created_at) } },
          { createdAt: new Date(cursor.created_at), id: { lt: cursor.id } },
        ] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const last = page.at(-1);
    const emails = await this.identity.emailsOf(page.map((row) => row.startedBy));
    const done = await this.doneCounts(page.map((row) => row.id));
    return {
      items: page.map((row) => summary(row, done.get(row.id) ?? 0, emails)),
      next_page_token: rows.length > pageSize && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  async get(id: string) {
    const row = await this.prisma.aiEvalRun.findUnique({ where: { id } });
    if (!row) throw problem(404, 'not-found', 'Not found');
    const emails = await this.identity.emailsOf([row.startedBy]);
    const done = await this.doneCounts([row.id]);
    // Dev examples only: a held-out example's input, expected answer and output never leave the API (design §5.1, R7).
    const items = await this.prisma.aiEvalRunItem.findMany({ where: { runId: id, split: 'dev' }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    return { ...summary(row, done.get(row.id) ?? 0, emails), draft: row.draft, heartbeat_at: row.heartbeatAt?.toISOString() ?? null, items: items.map(itemView) };
  }

  /** Items of each run that have a result (anything but `pending`), in one grouped query for a page of runs. */
  private async doneCounts(runIds: string[]): Promise<Map<string, number>> {
    if (runIds.length === 0) return new Map();
    const groups = await this.prisma.aiEvalRunItem.groupBy({
      by: ['runId'], where: { runId: { in: runIds }, status: { not: 'pending' } }, _count: { _all: true },
    });
    return new Map(groups.map((group) => [group.runId, group._count._all]));
  }

  /**
   * Stops a queued or running run. It is stored as `failed` with `error = 'cancelled'` (no new status, no migration). The guarded
   * UPDATE is the only write, so a run that finished a moment earlier is not overwritten; the job asks before each paid call
   * (`EvalRunsRepository.isRunning`), so no new provider call starts once this has committed.
   */
  async cancel(id: string) {
    const { count } = await this.prisma.aiEvalRun.updateMany({
      where: { id, status: { in: ['queued', 'running'] } },
      data: { status: 'failed', error: 'cancelled', finishedAt: this.clock.now() },
    });
    if (count === 0) throw await this.refusal(id, 'run-not-active', 'Run is not active');
    return this.get(id);
  }

  /** Deletes a finished or failed run (its item rows go with it). `ai_calls` is not touched: the costs report reads it, not the runs. */
  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.aiEvalRun.deleteMany({ where: { id, status: { in: ['finished', 'failed'] } } });
    if (count === 0) throw await this.refusal(id, 'run-active', 'Run is still active');
  }

  /** The guarded statement changed no row: the run is gone (404) or in the other state (409). */
  private async refusal(id: string, type: string, title: string): Promise<ProblemDetailsException> {
    const row = await this.prisma.aiEvalRun.findUnique({ where: { id }, select: { id: true } });
    return row ? problem(409, type, title) : problem(404, 'not-found', 'Not found');
  }
}
