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
import { SelectionReader, toSelection, type ModelRow, type Selection } from '../runner/selection.js';
import { EvalQueue } from './eval-queue.service.js';
import type { EvalRunStatus } from './eval-runs.repository.js';
import type { EvalSplit, ExpectedResult, RuleResult, RunItemStatus } from './eval.types.js';
import { compareRuns, isComplete, runStats, type RunItemResult } from './run-stats.js';

/** Body of `POST /v1/admin/ai/eval/runs` (design §10): the prompt in use, or a draft checked by the save rules. */
export const createRunSchema = z.strictObject({
  operation: z.enum(AI_OPERATIONS),
  /** Exactly one of `prompt` and `config` (checked by `create`: the error then names both). */
  prompt: z.union([z.literal('current'), z.strictObject({ instructions: z.string(), examples: z.array(z.unknown()) })]).optional(),
  /** The live config, or the draft of the operation (M2). */
  config: z.enum(['live', 'draft']).optional(),
  /** A frozen version of the operation's set (design §5.3); without it the run takes the working set, a quick try that cannot be compared. */
  set_id: z.uuid().transform((value) => value.toLowerCase()).optional(),
});
export type CreateRunBody = z.input<typeof createRunSchema>;

type RunRecord = {
  id: string; operation: string; provider: string; model: string; effort: string | null; thinking: string | null;
  maxOutputTokens: number | null; promptRevision: number | null; draft: unknown; status: string; total: number;
  validCount: number; avgLatencyMs: number | null; costUsd: { toFixed(digits: number): string } | null; costUnknownCount: number;
  error: string | null; startedBy: string; createdAt: Date; startedAt: Date | null; finishedAt: Date | null;
  setId: string | null; legacy: boolean; configId: string | null; configVersion: number | null;
};

/** What the summary of a run needs besides its own row: how many items have a result, whether it is complete, which version it ran. */
type RunExtras = { done: number; complete: boolean; setVersion: number | null; configNumber: number | null };

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

function summary(row: RunRecord, extras: RunExtras, emails: ReadonlyMap<string, string>) {
  return {
    id: row.id, operation: row.operation as AiOperation, provider: row.provider, model: row.model, effort: row.effort,
    thinking: row.thinking, max_output_tokens: row.maxOutputTokens, prompt_revision: row.promptRevision, status: row.status,
    total: row.total, done: extras.done, valid_count: row.validCount, set_id: row.setId, set_version: extras.setVersion, legacy: row.legacy,
    complete: extras.complete, config_id: row.configId, config_version: row.configVersion, config_number: extras.configNumber,
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
    const { operation, prompt, config } = parsed.data;
    if ((prompt === undefined) === (config === undefined)) throw invalid(['prompt: send exactly one of prompt and config']);
    // A config run uses the config's own model and settings; a prompt run uses the operation's current choice (until M2-T8).
    const tried = config === undefined ? null : await this.configToRun(operation, config);
    const selection: Selection | null = tried ? tried.selection : await this.selections.load(operation);
    if (!selection) throw problem(409, 'model-not-set', 'Model not set');
    if (!this.registry.get(selection.provider)) throw problem(409, 'provider-not-configured', 'Provider not configured');
    let promptRevision: number | null = null;
    let draft: { instructions: string; examples: unknown[] } | null = null;
    if (tried) {
      // The run names the config and its version; no prompt revision and no draft text (the CHECK allows exactly one of the three).
    } else if (prompt === 'current') {
      promptRevision = (await this.prompts.current(operation)).revision;
    } else {
      const violations = promptViolations(operation, prompt!);
      if (violations.length) throw invalid(violations.map((violation) => `prompt.${violation}`));
      draft = prompt as { instructions: string; examples: unknown[] };
    }
    const examples = await this.examplesOf(operation, parsed.data.set_id);
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
        configId: tried?.id ?? null, configVersion: tried?.version ?? null,
        setId: parsed.data.set_id ?? null, status: 'queued', total: examples.length, startedBy: actorId,
      } });
      await tx.aiEvalRunItem.createMany({ data: examples.map((example) => ({
        runId: run.id, exampleId: example.id, position: example.position, split: example.split, input: example.input as Prisma.InputJsonValue,
        // A Json column takes no plain null: the key is left out and the column stays SQL NULL.
        ...(example.expected === null ? {} : { expected: example.expected as Prisma.InputJsonValue }),
      })) });
      return run;
    });
    // Redis down: the row stays queued and the hourly job enqueues it again (B6E91); `enqueue` logs the failure.
    await this.queue.enqueue(row.id);
    return { run_id: row.id, status: 'queued' };
  }

  async list(op: AiOperation, pageSize: number, pageToken: string | undefined, setId?: string) {
    const binding = createHash('sha256').update(JSON.stringify({ route: 'ai-eval-runs', operation: op, ...(setId ? { set_id: setId } : {}) })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (pageToken !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(pageToken, binding));
      if (!parsed.success) throw invalid(['page_token: Invalid page token']);
      cursor = parsed.data;
    }
    const rows = await this.prisma.aiEvalRun.findMany({
      where: {
        operation: op,
        ...(setId ? { setId } : {}),
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
    const extras = await this.extras(page);
    return {
      items: page.map((row) => summary(row, extras.get(row.id)!, emails)),
      next_page_token: rows.length > pageSize && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  async get(id: string) {
    const row = await this.prisma.aiEvalRun.findUnique({ where: { id } });
    if (!row) throw problem(404, 'not-found', 'Not found');
    const emails = await this.identity.emailsOf([row.startedBy]);
    const extras = await this.extras([row]);
    // Dev items that have a result: a held-out example's input, expected answer and output never leave the API (design §5.1, R7).
    const items = await this.prisma.aiEvalRunItem.findMany({
      where: { runId: id, split: 'dev', status: { not: 'pending' } }, orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return { ...summary(row, extras.get(row.id)!, emails), draft: row.draft, heartbeat_at: row.heartbeatAt?.toISOString() ?? null, items: items.map(itemView) };
  }

  /** The dev items with a result, and the statistics of every item split by dev and held-out (held-out only as numbers, B3). */
  async items(id: string): Promise<{ items: RunItemView[]; stats: ReturnType<typeof runStats> }> {
    const run = await this.prisma.aiEvalRun.findUnique({ where: { id }, select: { id: true } });
    if (!run) throw problem(404, 'not-found', 'Not found');
    const rows = await this.prisma.aiEvalRunItem.findMany({ where: { runId: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const { results } = await this.resultsOf(id, rows);
    return { items: rows.filter((row) => row.split === 'dev' && row.status !== 'pending').map(itemView), stats: runStats(results) };
  }

  /**
   * Two runs on the same frozen version (D20): both summaries, both statistics, and the dev examples that passed in `a` ("trước") and do not
   * in `b` ("nay"), each with `b`'s input. A held-out regression is only counted (R7). A run on the working set cannot be compared (B10).
   */
  async compare(a: string, b: string) {
    const [rowA, rowB] = await Promise.all([this.prisma.aiEvalRun.findUnique({ where: { id: a } }), this.prisma.aiEvalRun.findUnique({ where: { id: b } })]);
    if (!rowA || !rowB) throw problem(404, 'not-found', 'Not found');
    if (rowA.setId === null || rowA.setId !== rowB.setId) throw problem(409, 'eval-set-mismatch', 'The runs are not on the same set version');
    const [itemsA, itemsB] = await Promise.all([this.resultsOf(a), this.resultsOf(b)]);
    const compared = compareRuns(itemsA.results, itemsB.results);
    const [emails, extras] = await Promise.all([this.identity.emailsOf([rowA.startedBy, rowB.startedBy]), this.extras([rowA, rowB])]);
    return {
      a: summary(rowA, extras.get(rowA.id)!, emails),
      b: summary(rowB, extras.get(rowB.id)!, emails),
      stats: { a: compared.a, b: compared.b },
      regressions: {
        dev: compared.regressions.dev.map(({ exampleId, failed }) => ({ example_id: exampleId, input: itemsB.inputs.get(exampleId) ?? null, failed })),
        held_out: compared.regressions.held_out,
      },
    };
  }

  private async resultsOf(runId: string, loaded?: ItemRecord[]): Promise<{ results: RunItemResult[]; inputs: Map<string, unknown> }> {
    const rows = loaded ?? await this.prisma.aiEvalRunItem.findMany({ where: { runId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    return {
      results: rows.map((row) => ({
        exampleId: row.exampleId, position: row.position, split: row.split as EvalSplit, status: row.status as RunItemStatus,
        rule: row.rule as RuleResult | null, expectedResult: row.expectedResult as ExpectedResult | null,
      })),
      inputs: new Map(rows.map((row) => [row.exampleId, row.input])),
    };
  }

  /** The examples a new run takes: the items of a frozen version, or the working set; a version of another operation is refused. */
  private async examplesOf(op: AiOperation, setId: string | undefined): Promise<Array<{
    id: string; position: number; split: string; input: unknown; expected: unknown;
  }>> {
    if (setId !== undefined) {
      const set = await this.prisma.aiEvalSet.findUnique({ where: { id: setId } });
      if (!set || set.operation !== op) throw invalid([`set_id: not a version of ${op}`]);
      const items = await this.prisma.aiEvalSetItem.findMany({ where: { setId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
      return items.map((item) => ({ id: item.exampleId, position: item.position, split: item.split, input: item.input, expected: item.expected }));
    }
    const examples = await this.prisma.aiEvalExample.findMany({
      where: { operation: op }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, split: true, input: true, expected: true },
    });
    if (examples.length === 0) throw invalid(['examples: at least one example is needed']);
    return examples.map((example, position) => ({ ...example, position }));
  }

  /** The config a run of `config` kind tries: the live one or the draft, with the selection its model gives. */
  private async configToRun(op: AiOperation, which: 'live' | 'draft'): Promise<{ id: string; version: number; selection: Selection | null }> {
    let row;
    if (which === 'draft') {
      row = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } });
    } else {
      const live = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
      row = live ? await this.prisma.aiConfig.findUnique({ where: { id: live.configId }, include: { model: true } }) : null;
    }
    if (!row) throw problem(404, 'not-found', 'Not found');
    return { id: row.id, version: row.version, selection: row.model ? toSelection(op, row, row.model as ModelRow) : null };
  }

  /** Per run of a page: items with a result, whether the run is complete (R11), the version it ran. Two grouped queries, whatever the page size. */
  private async extras(rows: RunRecord[]): Promise<Map<string, RunExtras>> {
    const result = new Map<string, RunExtras>();
    if (rows.length === 0) return result;
    const groups = await this.prisma.aiEvalRunItem.groupBy({ by: ['runId', 'status'], where: { runId: { in: rows.map((row) => row.id) } }, _count: { _all: true } });
    const setIds = [...new Set(rows.flatMap((row) => (row.setId ? [row.setId] : [])))];
    const sets = setIds.length > 0 ? await this.prisma.aiEvalSet.findMany({ where: { id: { in: setIds } }, select: { id: true, version: true } }) : [];
    const versions = new Map(sets.map((set) => [set.id, set.version]));
    const configIds = [...new Set(rows.flatMap((row) => (row.configId ? [row.configId] : [])))];
    const configs = configIds.length > 0 ? await this.prisma.aiConfig.findMany({ where: { id: { in: configIds } }, select: { id: true, number: true } }) : [];
    const numbers = new Map(configs.map((config) => [config.id, config.number]));
    for (const row of rows) {
      const own = groups.filter((group) => group.runId === row.id);
      result.set(row.id, {
        done: own.filter((group) => group.status !== 'pending').reduce((sum, group) => sum + group._count._all, 0),
        complete: isComplete(row.status as EvalRunStatus, own.map((group) => ({ status: group.status as RunItemStatus }))),
        setVersion: row.setId ? (versions.get(row.setId) ?? null) : null,
        configNumber: row.configId ? (numbers.get(row.configId) ?? null) : null,
      });
    }
    return result;
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
    // A run that a publish or rollback names as its evidence stays (B33); the foreign key is the last word if an event lands meanwhile.
    const evidence = problem(409, 'run-is-evidence', 'The run is evidence of a publish');
    if (await this.prisma.aiConfigEvent.findFirst({ where: { OR: [{ candidateRunId: id }, { baselineRunId: id }] }, select: { id: true } })) throw evidence;
    let count: number;
    try {
      ({ count } = await this.prisma.aiEvalRun.deleteMany({ where: { id, status: { in: ['finished', 'failed'] } } }));
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2003') throw evidence;
      throw error;
    }
    if (count === 0) throw await this.refusal(id, 'run-active', 'Run is still active');
  }

  /** The guarded statement changed no row: the run is gone (404) or in the other state (409). */
  private async refusal(id: string, type: string, title: string): Promise<ProblemDetailsException> {
    const row = await this.prisma.aiEvalRun.findUnique({ where: { id }, select: { id: true } });
    return row ? problem(409, type, title) : problem(404, 'not-found', 'Not found');
  }
}
