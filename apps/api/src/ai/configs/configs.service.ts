import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { userRef } from '../../common/user-ref.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID, CONFIG_NOTE_MAX, TEST_EXAMPLES_MAX } from '../ai.constants.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import { AiBatchesService } from '../batches/ai-batches.service.js';
import { EvalRulesRegistry, ruleResultFor } from '../eval/eval-rules.port.js';
import { selectionViolations } from '../models/model-rules.js';
import { operationEstimate } from '../models/operation-estimate.js';
import { OPERATIONS } from '../operations/operations.js';
import { PROMPT_GUARD, promptViolations, type PromptExample } from '../prompts/prompt-rules.js';
import { testInputs, toTestItem, type TestItem } from '../prompts/test-inputs.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import { RunnerService } from '../runner/runner.service.js';
import { toSelection, type Selection } from '../runner/selection.js';
import { configContentSchema, configFingerprint, contentOfConfig, type ConfigContent } from './config-snapshot.js';
import type { ConfigLastRun, ConfigStatus, ConfigsView, ConfigView } from './configs.types.js';

/** Body of `PUT /v1/admin/ai/configs/{op}/draft` (design §6.2); the content rules run in the service so every error has a path. */
export const saveDraftSchema = z.strictObject({
  expected_version: z.number().int().min(0),
  instructions: z.string(),
  examples: z.array(z.unknown()),
  model_ref: z.uuid().transform((value) => value.toLowerCase()).nullable(),
  effort: z.string().min(1).max(20).nullable(),
  thinking: z.literal('off').nullable(),
  max_output_tokens: z.number().int().nullable(),
  note: z.string().trim().max(CONFIG_NOTE_MAX).nullable(),
  name: z.string().trim().max(CONFIG_NOTE_MAX).nullable().optional(),
});
export type SaveDraftBody = z.input<typeof saveDraftSchema>;

/** Body of `POST /v1/admin/ai/configs/{op}/draft`: the config to copy (default: the live one). */
export const createDraftSchema = z.strictObject({ from_config_id: z.uuid().transform((value) => value.toLowerCase()).optional(), name: z.string().trim().max(CONFIG_NOTE_MAX).nullable().optional() });
export type CreateDraftBody = z.input<typeof createDraftSchema>;

/** Body of `POST /v1/admin/ai/configs/{op}/draft/test` (design §6.2): the same example choice as a prompt test. */
export const testDraftSchema = z.strictObject({
  snapshot: configContentSchema.optional(),
  example_ids: z.array(z.uuid().transform((value) => value.toLowerCase())).max(TEST_EXAMPLES_MAX).optional(),
});
export type TestDraftBody = z.input<typeof testDraftSchema>;

type Decimalish = { toString(): string } | null;
type ModelRow = {
  id: string; provider: string; modelId: string; effortLevels: string[]; thinkingOff: string | null; maxOutputTokens: number | null;
  priceInput: Decimalish; priceCachedInput: Decimalish; priceOutput: Decimalish;
};
export type ConfigRow = {
  name: string | null; fingerprint: string | null; updatedAt: Date; deletedAt: Date | null;
  id: string; operation: string; number: number; version: number; instructions: string; examples: unknown; modelRef: string | null; effort: string | null;
  thinking: string | null; maxOutputTokens: number | null; status: string; createdFrom: string | null; note: string | null; createdBy: string; createdAt: Date;
  publishedBy: string | null; publishedAt: Date | null; model: ModelRow | null;
};

const problem = (status: number, type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status, type, title, ...(extensions ? { extensions } : {}) });
const invalid = (violations: string[]) => problem(400, 'validation-failed', 'Validation failed', { violations });
const notFound = () => problem(404, 'not-found', 'Not found');
const versionConflict = () => problem(409, 'draft-version-conflict', 'The draft changed');
const selectionRequired = () => problem(409, 'draft-selection-required', 'Choose a draft');
const numberCursor = z.strictObject({ number: z.number().int().min(0) });
const versionCursor = z.strictObject({ version: z.number().int().min(0) });
const revisionHistoryCursor = z.strictObject({ saved_at: z.iso.datetime(), id: z.uuid() });

export type PreparedConfig = {
  content: ConfigContent; fingerprint: string; selection: Selection | null;
  prompt: { instructions: string; examples: PromptExample[]; revision: number | null };
};

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

/** The configs of an operation: the live one, independent drafts and the one before the live one. Publishing is `PublishService`. */
@Injectable()
export class ConfigsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(EvalRulesRegistry) private readonly rules: EvalRulesRegistry,
    @Inject(RunnerService) private readonly runner: RunnerService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AdminSpend) private readonly spend: AdminSpend,
    @Inject(Clock) private readonly clock: Clock,
    @Optional() @Inject(AiBatchesService) private readonly batches?: AiBatchesService,
  ) {}

  /** The live config, the draft and the previous config; 404 for an operation with no live pointer (only before the switch-over). */
  async get(op: AiOperation): Promise<ConfigsView> {
    const live = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
    if (!live) throw notFound();
    const ids = [live.configId, ...(live.previousConfigId ? [live.previousConfigId] : [])];
    const rows = await this.prisma.aiConfig.findMany({ where: { id: { in: ids }, operation: op, deletedAt: null }, include: { model: true } });
    const drafts = await this.prisma.aiConfig.findMany({ where: { operation: op, status: 'draft', deletedAt: null }, include: { model: true } });
    const draft = drafts.length === 1 ? drafts[0] : null;
    const byId = new Map(rows.map((row) => [row.id, row as ConfigRow]));
    const liveRow = byId.get(live.configId);
    if (!liveRow) throw notFound();
    const all = [liveRow, ...(live.previousConfigId && byId.get(live.previousConfigId) ? [byId.get(live.previousConfigId)!] : []), ...(draft ? [draft as ConfigRow] : [])];
    const views = await this.views(all);
    const viewOf = (id: string) => views.find((view) => view.id === id) ?? null;
    return {
      operation: op, input_fields: [...OPERATIONS[op].inputFields], guard: PROMPT_GUARD, live_version: live.version,
      draft_count: drafts.length, live: viewOf(liveRow.id)!, draft: draft ? viewOf(draft.id) : null, previous: live.previousConfigId ? viewOf(live.previousConfigId) : null,
    };
  }

  /** Raw draft for execution/publish; every caller must select the exact operation, ID, state and deletion flag. */
  async getDraft(op: AiOperation, id: string): Promise<ConfigRow> {
    const row = await this.prisma.aiConfig.findFirst({ where: { id, operation: op, status: 'draft', deletedAt: null }, include: { model: true } });
    if (!row) throw notFound();
    return row as ConfigRow;
  }

  /** Legacy clients can select a draft only when there is exactly one. */
  async legacyDraft(op: AiOperation): Promise<ConfigRow> {
    const rows = await this.prisma.aiConfig.findMany({ where: { operation: op, status: 'draft', deletedAt: null }, include: { model: true }, take: 2 });
    if (rows.length === 0) throw notFound();
    if (rows.length > 1) throw selectionRequired();
    return rows[0] as ConfigRow;
  }

  async listDrafts(op: AiOperation, pageSize = 20, pageToken?: string) {
    const binding = this.binding('ai-config-drafts', op);
    const cursor = pageToken === undefined ? undefined : parse(numberCursor, decodeBoundToken(pageToken, binding));
    const rows = await this.prisma.aiConfig.findMany({
      where: { operation: op, status: 'draft', deletedAt: null, ...(cursor ? { number: { lt: cursor.number } } : {}) },
      orderBy: [{ number: 'desc' }], take: pageSize + 1, include: { model: true },
    });
    const page = rows.slice(0, pageSize);
    const [items, lastRuns] = await Promise.all([this.views(page as ConfigRow[]), this.lastRuns(op, page.map((row) => row.id))]);
    return { items: items.map((view) => ({ ...view, last_run: lastRuns.get(view.id) ?? null })), next_page_token: rows.length > pageSize && page.length > 0 ? encodeBoundToken({ number: page.at(-1)!.number }, binding) : null };
  }

  /** History remains readable after soft deletion or publishing; it is bound to the config's operation. */
  async revisions(op: AiOperation, id: string, pageSize = 20, pageToken?: string) {
    const config = await this.prisma.aiConfig.findUnique({ where: { id } });
    if (!config || config.operation !== op) throw notFound();
    const binding = this.binding('ai-config-revisions', op, id);
    const cursor = pageToken === undefined ? undefined : parse(versionCursor, decodeBoundToken(pageToken, binding));
    const rows = await this.prisma.aiConfigRevision.findMany({
      where: { configId: id, ...(cursor ? { version: { lt: cursor.version } } : {}) }, orderBy: [{ version: 'desc' }], take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const emails = await this.identity.emailsOf(page.map((row) => row.savedBy));
    return {
      items: page.map((row) => ({
        id: row.id, config_id: row.configId, version: row.version, content: row.content,
        fingerprint: row.fingerprint ?? configFingerprint(op, row.content as ConfigContent), name: row.name, note: row.note,
        saved_by_user: userRef(row.savedBy, emails, SYSTEM_IDS), saved_at: row.savedAt.toISOString(),
      })),
      next_page_token: rows.length > pageSize && page.length > 0 ? encodeBoundToken({ version: page.at(-1)!.version }, binding) : null,
    };
  }

  /** Saved prompt history across drafts, published/retired configs and soft-deleted configs of this operation. */
  async operationRevisions(op: AiOperation, pageSize = 20, pageToken?: string) {
    const binding = this.binding('ai-operation-revisions', op);
    const decoded = pageToken === undefined ? null : revisionHistoryCursor.safeParse(decodeBoundToken(pageToken, binding));
    if (decoded && !decoded.success) throw invalid(['page_token: Invalid page token']);
    const cursor = decoded?.success ? decoded.data : null;
    const rows = await this.prisma.aiConfigRevision.findMany({
      where: { config: { operation: op } },
      orderBy: [{ savedAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
      // Let the DB resolve the cursor row's exact timestamp; JS Date truncates PostgreSQL microseconds.
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      include: { config: { select: { operation: true, number: true, status: true, deletedAt: true } } },
    });
    const page = rows.slice(0, pageSize);
    const emails = await this.identity.emailsOf(page.map((row) => row.savedBy));
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id, config_id: row.configId, operation: row.config.operation as AiOperation,
        config_number: row.config.number, config_status: row.config.deletedAt ? 'deleted' as const : row.config.status as ConfigStatus, config_deleted_at: row.config.deletedAt?.toISOString() ?? null,
        version: row.version, content: row.content, fingerprint: row.fingerprint ?? configFingerprint(op, row.content as ConfigContent),
        name: row.name, note: row.note, saved_by_user: userRef(row.savedBy, emails, SYSTEM_IDS), saved_at: row.savedAt.toISOString(),
      })),
      next_page_token: rows.length > pageSize && last ? encodeBoundToken({ saved_at: last.savedAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  /** Plural create permits independent drafts and clones; the singular route retains its one-draft contract. */
  async createDraft(actorId: string, op: AiOperation, body: CreateDraftBody, multiple = false): Promise<ConfigView> {
    const input = parse(createDraftSchema, body);
    const created = await this.prisma.$transaction(async (tx) => {
      // The counter serializes concurrent legacy creates too, after removal of the old partial unique index.
      const live = await tx.aiLiveConfig.findUnique({ where: { operation: op } });
      if (!live) throw notFound();
      const counter = await tx.aiLiveConfig.update({ where: { operation: op }, data: { lastNumber: { increment: 1 } } });
      if (!multiple) {
        const drafts = await tx.aiConfig.findMany({ where: { operation: op, status: 'draft', deletedAt: null }, include: { model: true }, take: 2 });
        if (drafts.length > 1) throw selectionRequired();
        if (drafts.length === 1) throw problem(409, 'draft-exists', 'There already is a draft', { draft: (await this.views([drafts[0] as ConfigRow]))[0] });
      }
      const sourceId = input.from_config_id ?? counter.configId;
      const source = await tx.aiConfig.findUnique({ where: { id: sourceId } });
      if (!source || source.operation !== op || source.deletedAt !== null || (!multiple && source.status === 'draft') || !['published', 'retired', 'draft'].includes(source.status)) {
        throw invalid([`from_config_id: not a ${multiple ? 'published, retired or draft' : 'published or retired'} config of ${op}`]);
      }
      const content = contentOfConfig(source);
      const fingerprint = configFingerprint(op, content);
      const row = await tx.aiConfig.create({ data: {
        operation: op, number: counter.lastNumber, version: 0, instructions: content.instructions, examples: content.examples as Prisma.InputJsonArray,
        modelRef: content.model_ref, effort: content.effort, thinking: content.thinking, maxOutputTokens: content.max_output_tokens,
        status: 'draft', createdFrom: source.id, note: null, name: input.name || null, fingerprint, createdBy: actorId,
      }, include: { model: true } });
      await tx.aiConfigRevision.create({ data: { configId: row.id, version: 0, content: content as Prisma.InputJsonValue, fingerprint, name: row.name, note: row.note, savedBy: actorId, savedAt: this.clock.now() } });
      return row as ConfigRow;
    });
    return (await this.views([created]))[0];
  }

  /** Single normalization/validation path shared by saving drafts and executing temporary snapshots. */
  async prepare(op: AiOperation, value: unknown): Promise<PreparedConfig> {
    const content = parse(configContentSchema, value);
    const violations = promptViolations(op, content);
    if (violations.length > 0) throw invalid(violations);
    let selection: Selection | null = null;
    if (content.model_ref !== null) {
      const model = await this.prisma.aiModel.findUnique({ where: { id: content.model_ref } });
      if (!model) throw invalid(['model_ref: not found']);
      const provider = model.provider as AiProviderName;
      if (!this.registry.get(provider)) throw problem(409, 'provider-not-configured', 'Provider not configured');
      const choice = selectionViolations({ provider, model, effort: content.effort, thinking: content.thinking, maxOutputTokens: content.max_output_tokens });
      if (choice.length > 0) throw invalid(choice);
      selection = toSelection(op, { effort: content.effort, thinking: content.thinking, maxOutputTokens: content.max_output_tokens }, model);
    }
    await this.checkFewShot(op, content.examples);
    return { content, fingerprint: configFingerprint(op, content), selection, prompt: { instructions: content.instructions, examples: content.examples, revision: null } };
  }

  async saveDraft(actorId: string, op: AiOperation, body: SaveDraftBody, draftId?: string): Promise<ConfigView> {
    const input = parse(saveDraftSchema, body);
    const draft = draftId === undefined ? await this.legacyDraft(op) : await this.getDraft(op, draftId);
    if (draft.version !== input.expected_version) throw versionConflict();
    const { expected_version: _v, note: _note, name: _name, ...rawContent } = input;
    const { content, fingerprint } = await this.prepare(op, rawContent);
    const note = input.note || null;
    const name = input.name === undefined ? draft.name : input.name || null;
    const changed = configFingerprint(op, contentOfConfig(draft)) !== fingerprint || note !== draft.note || name !== draft.name;
    const saved = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.aiConfig.updateMany({
        where: { id: draft.id, operation: op, status: 'draft', deletedAt: null, version: input.expected_version },
        data: changed ? {
          instructions: content.instructions, examples: content.examples as Prisma.InputJsonArray, modelRef: content.model_ref,
          effort: content.effort, thinking: content.thinking, maxOutputTokens: content.max_output_tokens, note, name, fingerprint, version: { increment: 1 },
        } : { updatedAt: draft.updatedAt },
      });
      if (count === 0) throw versionConflict();
      const row = await tx.aiConfig.findUnique({ where: { id: draft.id }, include: { model: true } });
      if (!row || row.deletedAt !== null || row.status !== 'draft') throw versionConflict();
      if (changed) await tx.aiConfigRevision.create({ data: {
        configId: row.id, version: row.version, content: content as Prisma.InputJsonValue, fingerprint, name, note, savedBy: actorId, savedAt: this.clock.now(),
      } });
      return row as ConfigRow;
    });
    return (await this.views([saved]))[0];
  }

  /** Lock the row before checking queued/running runs; retain it and every immutable revision on deletion. */
  async deleteDraft(op: AiOperation, draftId?: string): Promise<void> {
    const draft = draftId === undefined ? await this.legacyDraft(op) : await this.getDraft(op, draftId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockDraft(tx, op, draft.id);
      if (await tx.aiEvalRun.count({ where: { configId: draft.id, status: { in: ['queued', 'running'] } } }) > 0) throw problem(409, 'draft-busy', 'A run of the draft is still going');
      if (await tx.aiBatch.count({ where: { configId: draft.id, kind: 'test', status: { in: ['queued', 'running'] } } }) > 0) throw problem(409, 'draft-busy', 'A test of the draft is still going');
      await tx.aiConfig.updateMany({ where: { id: draft.id, operation: op, status: 'draft', deletedAt: null }, data: { deletedAt: this.clock.now() } });
    });
  }

  /** Synchronous tests count one slot; only call_contents retains expiring outputs. A batch stores config metadata only. */
  async testDraft(actorId: string, op: AiOperation, body: TestDraftBody, draftId?: string): Promise<{ items: TestItem[]; batch_id: string | null; fingerprint: string }> {
    const input = parse(testDraftSchema, body);
    const draft = draftId === undefined ? await this.legacyDraft(op) : await this.getDraft(op, draftId);
    const prepared = await this.prepare(op, input.snapshot ?? contentOfConfig(draft));
    const { selection, content, fingerprint } = prepared;
    if (!selection) throw problem(409, 'model-not-set', 'No model chosen');
    const inputs = await testInputs(this.prisma, op, { example_ids: input.example_ids, examples: content.examples });
    await this.spend.assertCanStart(selection.price, this.clock.now());
    await this.limiter.hit('ai.test', actorId);
    let batchId: string | null = null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.lockDraft(tx, op, draft.id);
        // The durable batch is inserted before releasing the deletion lock, before any provider work.
        batchId = this.batches ? await this.batches.create({
          kind: 'test', operation: op, configId: draft.id, configVersion: draft.version, fingerprint, snapshot: content,
          model: selection.modelId, provider: selection.provider, total: inputs.length, actorId,
        }, tx) : null;
      });
      if (batchId) await this.batches!.start(batchId);
      // Wait for every in-flight call before finishing even if another input throws.
      const results = await Promise.allSettled(inputs.map(async (data): Promise<TestItem> => toTestItem(data, await this.runner.execute({
        purpose: 'test', operation: op, data, actorId, callOperationId: `test-${randomUUID()}`, selection,
        prompt: { ...prepared.prompt, revision: draft.number }, ...(batchId ? { batchId } : {}),
      }))));
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;
      const items = results.map((result) => (result as PromiseFulfilledResult<TestItem>).value);
      if (batchId) await this.batches!.finish(batchId, 'finished');
      return { items, batch_id: batchId, fingerprint };
    } catch (error) {
      if (batchId) await this.batches!.finish(batchId, 'failed');
      throw error;
    }
  }

  /** Restrict the lookup to this page and join eval state; hidden/deleted evals are not linked as a latest run. */
  private async lastRuns(op: AiOperation, ids: string[]): Promise<Map<string, ConfigLastRun>> {
    if (ids.length === 0) return new Map();
    type LastRunRow = Omit<ConfigLastRun, 'created_at' | 'started_at' | 'finished_at'> & { created_at: Date; started_at: Date | null; finished_at: Date | null };
    const rows = await this.prisma.$queryRaw<LastRunRow[]>(Prisma.sql`
      SELECT DISTINCT ON (b.config_id) b.id, b.config_id, b.kind, CASE WHEN r.status = 'failed' AND r.error = 'cancelled' THEN 'cancelled' ELSE COALESCE(r.status, b.status) END AS status,
        b.config_version, b.fingerprint, b.source_id, b.model, b.provider, COALESCE(r.total, b.total) AS total,
        b.created_at, COALESCE(r.started_at, b.started_at) AS started_at, COALESCE(r.finished_at, b.finished_at) AS finished_at
      FROM ai_batches b LEFT JOIN ai_eval_runs r ON b.kind = 'eval' AND r.id = b.source_id AND r.operation = b.operation
      WHERE b.operation = ${op} AND b.config_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
        AND b.kind IN ('test', 'eval') AND (b.kind = 'test' OR (r.id IS NOT NULL AND r.hidden_at IS NULL))
      ORDER BY b.config_id, b.created_at DESC, b.id DESC`);
    return new Map(rows.map((row) => [row.config_id, {
      ...row, created_at: row.created_at.toISOString(), started_at: row.started_at?.toISOString() ?? null, finished_at: row.finished_at?.toISOString() ?? null,
    }]));
  }

  private async lockDraft(tx: Prisma.TransactionClient, op: AiOperation, id: string): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM ai_configs WHERE id = ${id}::uuid AND operation = ${op} AND status = 'draft' AND deleted_at IS NULL FOR UPDATE`;
    if (rows.length === 0) throw notFound();
  }

  private binding(route: string, operation: AiOperation, configId?: string): string {
    return createHash('sha256').update(JSON.stringify({ route, operation, configId })).digest('hex');
  }

  /** T2 (design §6.2): the few-shot examples must pass the rules a learner's question goes through, where the catalog can say. */
  private async checkFewShot(op: AiOperation, examples: PromptExample[]): Promise<void> {
    const rules = this.rules.get();
    const failing: Array<{ index: number; problems: string[] }> = [];
    for (const [index, example] of examples.entries()) {
      const result = await ruleResultFor(rules, op, example.input, example.output);
      if (result.status === 'fail') failing.push({ index, problems: result.problems });
    }
    if (failing.length > 0) throw problem(422, 'few-shot-invalid', 'A few-shot example breaks the rules', { examples: failing });
  }

  /** Views of several configs with one lookup of the people and of today's rate. */
  async views(rows: ConfigRow[]): Promise<ConfigView[]> {
    const [emails, settings] = await Promise.all([
      this.identity.emailsOf(rows.flatMap((row) => [row.createdBy, ...(row.publishedBy ? [row.publishedBy] : [])])),
      this.settings.get(),
    ]);
    return rows.map((row) => ({
      id: row.id, name: row.name, updated_at: row.updatedAt.toISOString(), fingerprint: row.fingerprint ?? configFingerprint(row.operation as AiOperation, contentOfConfig(row)), operation: row.operation as AiOperation, number: row.number, version: row.version, status: row.status as ConfigStatus,
      instructions: row.instructions, examples: row.examples as PromptExample[],
      model: row.model ? { id: row.model.id, provider: row.model.provider as AiProviderName, model_id: row.model.modelId } : null,
      effort: row.effort, thinking: row.thinking === 'off' ? 'off' : null, max_output_tokens: row.maxOutputTokens, note: row.note,
      created_from: row.createdFrom, created_by_user: userRef(row.createdBy, emails, SYSTEM_IDS), created_at: row.createdAt.toISOString(),
      published_by_user: row.publishedBy ? userRef(row.publishedBy, emails, SYSTEM_IDS) : null, published_at: row.publishedAt?.toISOString() ?? null,
      estimate: operationEstimate(row.model, row.maxOutputTokens, settings.ai.usdVndRate),
    }));
  }
}
