import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
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
  maxOutputTokens: number | null; promptRevision: number | null; draft: unknown; status: string; total: number; items: unknown;
  validCount: number; avgLatencyMs: number | null; costUsd: { toFixed(digits: number): string } | null; costUnknownCount: number;
  error: string | null; startedBy: string; createdAt: Date; startedAt: Date | null; finishedAt: Date | null;
};

const cursorSchema = z.strictObject({ created_at: z.iso.datetime(), id: z.string() });

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

function summary(row: RunRecord) {
  return {
    id: row.id, operation: row.operation as AiOperation, provider: row.provider, model: row.model, effort: row.effort,
    thinking: row.thinking, max_output_tokens: row.maxOutputTokens, prompt_revision: row.promptRevision, status: row.status,
    total: row.total, done: Array.isArray(row.items) ? row.items.length : 0, valid_count: row.validCount,
    avg_latency_ms: row.avgLatencyMs, cost_usd: row.costUsd?.toFixed(8) ?? null, cost_unknown_count: row.costUnknownCount,
    error: row.error, started_by: row.startedBy, created_at: row.createdAt.toISOString(),
    started_at: row.startedAt?.toISOString() ?? null, finished_at: row.finishedAt?.toISOString() ?? null,
  };
}

/** Runs of the example set (design §10, §12.1 #14–#15). Creating one only inserts a row and enqueues: no provider call here. */
@Injectable()
export class EvalRunsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SelectionReader) private readonly selections: SelectionReader,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(PromptsRepository) private readonly prompts: PromptsRepository,
    @Inject(EvalQueue) private readonly queue: EvalQueue,
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
      where: { operation }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    if (examples.length === 0) throw invalid(['examples: at least one example is needed']);
    // The resolved selection is stored (plan choice 10): a later change of the operation's choice does not change this run.
    const row = await this.prisma.aiEvalRun.create({ data: {
      operation, provider: selection.provider, model: selection.modelId, effort: selection.effort, thinking: selection.thinking,
      maxOutputTokens: selection.maxOutputTokens, promptRevision,
      ...(draft ? { draft: draft as Prisma.InputJsonValue } : {}),
      exampleIds: examples.map((example) => example.id), status: 'queued', total: examples.length, startedBy: actorId,
    } });
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
    return {
      items: page.map(summary),
      next_page_token: rows.length > pageSize && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  async get(id: string) {
    const row = await this.prisma.aiEvalRun.findUnique({ where: { id } });
    if (!row) throw problem(404, 'not-found', 'Not found');
    return { ...summary(row), draft: row.draft, heartbeat_at: row.heartbeatAt?.toISOString() ?? null, items: row.items };
  }
}
