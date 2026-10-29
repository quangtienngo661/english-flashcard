import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef } from '../../common/user-ref.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_SYSTEM_ACTOR_ID, CONFIG_NOTE_MAX, TEST_EXAMPLES_MAX } from '../ai.constants.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import { EvalRulesRegistry, ruleResultFor } from '../eval/eval-rules.port.js';
import { selectionViolations } from '../models/model-rules.js';
import { operationEstimate } from '../models/operation-estimate.js';
import { OPERATIONS } from '../operations/operations.js';
import { PROMPT_GUARD, promptViolations, type PromptExample } from '../prompts/prompt-rules.js';
import { testInputs, toTestItem, type TestItem } from '../prompts/test-inputs.js';
import { RunnerService } from '../runner/runner.service.js';
import { toSelection } from '../runner/selection.js';
import type { ConfigStatus, ConfigsView, ConfigView } from './configs.types.js';

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
});
export type SaveDraftBody = z.input<typeof saveDraftSchema>;

/** Body of `POST /v1/admin/ai/configs/{op}/draft`: the config to copy (default: the live one). */
export const createDraftSchema = z.strictObject({ from_config_id: z.uuid().transform((value) => value.toLowerCase()).optional() });
export type CreateDraftBody = z.input<typeof createDraftSchema>;

/** Body of `POST /v1/admin/ai/configs/{op}/draft/test` (design §6.2): the same example choice as a prompt test. */
export const testDraftSchema = z.strictObject({
  example_ids: z.array(z.uuid().transform((value) => value.toLowerCase())).max(TEST_EXAMPLES_MAX).optional(),
});
export type TestDraftBody = z.input<typeof testDraftSchema>;

type Decimalish = { toString(): string } | null;
type ModelRow = {
  id: string; provider: string; modelId: string; effortLevels: string[]; thinkingOff: string | null; maxOutputTokens: number | null;
  priceInput: Decimalish; priceCachedInput: Decimalish; priceOutput: Decimalish;
};
type ConfigRow = {
  id: string; operation: string; number: number; version: number; instructions: string; examples: unknown; modelRef: string | null; effort: string | null;
  thinking: string | null; maxOutputTokens: number | null; status: string; createdFrom: string | null; note: string | null; createdBy: string; createdAt: Date;
  publishedBy: string | null; publishedAt: Date | null; model: ModelRow | null;
};

const problem = (status: number, type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status, type, title, ...(extensions ? { extensions } : {}) });
const invalid = (violations: string[]) => problem(400, 'validation-failed', 'Validation failed', { violations });
const notFound = () => problem(404, 'not-found', 'Not found');
const versionConflict = () => problem(409, 'draft-version-conflict', 'The draft changed');
const isUniqueViolation = (error: unknown): boolean => error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

const SYSTEM_IDS: ReadonlySet<string> = new Set([AI_SYSTEM_ACTOR_ID]);

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

/** The configs of an operation (design §6): a live one, at most one draft, the one before the live one. Publishing is `PublishService`. */
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
  ) {}

  /** The live config, the draft and the previous config; 404 for an operation with no live pointer (only before the switch-over). */
  async get(op: AiOperation): Promise<ConfigsView> {
    const live = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op } });
    if (!live) throw notFound();
    const ids = [live.configId, ...(live.previousConfigId ? [live.previousConfigId] : [])];
    const rows = await this.prisma.aiConfig.findMany({ where: { id: { in: ids } }, include: { model: true } });
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } });
    const byId = new Map(rows.map((row) => [row.id, row as ConfigRow]));
    const liveRow = byId.get(live.configId);
    if (!liveRow) throw notFound();
    const all = [liveRow, ...(live.previousConfigId && byId.get(live.previousConfigId) ? [byId.get(live.previousConfigId)!] : []), ...(draft ? [draft as ConfigRow] : [])];
    const views = await this.views(all);
    const viewOf = (id: string) => views.find((view) => view.id === id) ?? null;
    return {
      operation: op, input_fields: [...OPERATIONS[op].inputFields], guard: PROMPT_GUARD, live_version: live.version,
      live: viewOf(liveRow.id)!, draft: draft ? viewOf(draft.id) : null, previous: live.previousConfigId ? viewOf(live.previousConfigId) : null,
    };
  }

  /** B23: one draft per operation. A copy of the live config (or of another published / retired one) with the next number (never repeated). */
  async createDraft(actorId: string, op: AiOperation, body: CreateDraftBody): Promise<ConfigView> {
    const input = parse(createDraftSchema, body);
    let created: ConfigRow;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const live = await tx.aiLiveConfig.findUnique({ where: { operation: op } });
        if (!live) throw notFound();
        const existing = await tx.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } });
        if (existing) throw problem(409, 'draft-exists', 'There already is a draft', { draft: (await this.views([existing as ConfigRow]))[0] });
        const sourceId = input.from_config_id ?? live.configId;
        const source = await tx.aiConfig.findUnique({ where: { id: sourceId } });
        if (!source || source.operation !== op || (source.status !== 'published' && source.status !== 'retired')) {
          throw invalid([`from_config_id: not a published or retired config of ${op}`]);
        }
        const counter = await tx.aiLiveConfig.update({ where: { operation: op }, data: { lastNumber: { increment: 1 } } });
        return await tx.aiConfig.create({
          data: {
            operation: op, number: counter.lastNumber, version: 0, instructions: source.instructions, examples: source.examples as Prisma.InputJsonArray,
            modelRef: source.modelRef, effort: source.effort, thinking: source.thinking, maxOutputTokens: source.maxOutputTokens, status: 'draft',
            createdFrom: source.id, note: null, createdBy: actorId,
          },
          include: { model: true },
        }) as ConfigRow;
      });
    } catch (error) {
      // Two creates at once: the partial unique index lets one in; the other meets it and gets the draft that won.
      if (isUniqueViolation(error)) {
        const winner = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } });
        throw problem(409, 'draft-exists', 'There already is a draft', { draft: winner ? (await this.views([winner as ConfigRow]))[0] : null });
      }
      throw error;
    }
    return (await this.views([created]))[0];
  }

  /**
   * Saves the draft if it is still at `expected_version`. Order (design §6.2): the draft exists, the version, the prompt rules, the model and
   * its provider, the model's own choice rules, then T2: each few-shot example through Practice's rules (a failing one → 422, nothing written).
   */
  async saveDraft(_actorId: string, op: AiOperation, body: SaveDraftBody): Promise<ConfigView> {
    const input = parse(saveDraftSchema, body);
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' } });
    if (!draft) throw notFound();
    if (draft.version !== input.expected_version) throw versionConflict();
    const promptRules = promptViolations(op, input);
    if (promptRules.length > 0) throw invalid(promptRules);
    if (input.model_ref !== null) {
      const model = await this.prisma.aiModel.findUnique({ where: { id: input.model_ref } });
      if (!model) throw invalid(['model_ref: not found']);
      const provider = model.provider as AiProviderName;
      if (!this.registry.get(provider)) throw problem(409, 'provider-not-configured', 'Provider not configured');
      const choice = selectionViolations({ provider, model, effort: input.effort, thinking: input.thinking, maxOutputTokens: input.max_output_tokens });
      if (choice.length > 0) throw invalid(choice);
    }
    await this.checkFewShot(op, input.examples as PromptExample[]);
    const { count } = await this.prisma.aiConfig.updateMany({
      where: { id: draft.id, status: 'draft', version: input.expected_version },
      data: {
        instructions: input.instructions, examples: input.examples as Prisma.InputJsonArray, modelRef: input.model_ref, effort: input.effort,
        thinking: input.thinking, maxOutputTokens: input.max_output_tokens, note: input.note === '' ? null : input.note, version: { increment: 1 },
      },
    });
    if (count === 0) throw versionConflict();
    const saved = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } });
    if (!saved) throw notFound();
    return (await this.views([saved as ConfigRow]))[0];
  }

  /** The draft goes unless a run of it is queued or running (B26): its job reads the draft row. */
  async deleteDraft(op: AiOperation): Promise<void> {
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, select: { id: true } });
    if (!draft) throw notFound();
    if (await this.prisma.aiEvalRun.count({ where: { configId: draft.id, status: { in: ['queued', 'running'] } } }) > 0) {
      throw problem(409, 'draft-busy', 'A run of the draft is still going');
    }
    try {
      await this.prisma.aiConfig.delete({ where: { id: draft.id } });
    } catch (error) {
      if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2025') throw notFound();
      throw error;
    }
  }

  /** Runs the saved draft at once on up to five dev inputs with the draft's own model; nothing is published. */
  async testDraft(actorId: string, op: AiOperation, body: TestDraftBody): Promise<{ items: TestItem[] }> {
    const input = parse(testDraftSchema, body);
    const draft = await this.prisma.aiConfig.findFirst({ where: { operation: op, status: 'draft' }, include: { model: true } }) as ConfigRow | null;
    if (!draft) throw notFound();
    if (!draft.model) throw problem(409, 'model-not-set', 'No model chosen');
    if (!this.registry.get(draft.model.provider as AiProviderName)) throw problem(409, 'provider-not-configured', 'Provider not configured');
    const inputs = await testInputs(this.prisma, op, { example_ids: input.example_ids, examples: draft.examples as unknown[] });
    const selection = toSelection(op, draft, draft.model);
    const prompt = { instructions: draft.instructions, examples: draft.examples as PromptExample[], revision: draft.number };
    // Counted only now: a test refused above (no draft, no model, bad example id, no example) costs nothing; the provider is called after.
    await this.limiter.hit('ai.test', actorId);
    const items = await Promise.all(inputs.map(async (data): Promise<TestItem> => toTestItem(data, await this.runner.execute({
      purpose: 'test', operation: op, data, actorId, callOperationId: `test-${randomUUID()}`, selection, prompt,
    }))));
    return { items };
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
      id: row.id, operation: row.operation as AiOperation, number: row.number, version: row.version, status: row.status as ConfigStatus,
      instructions: row.instructions, examples: row.examples as PromptExample[],
      model: row.model ? { id: row.model.id, provider: row.model.provider as AiProviderName, model_id: row.model.modelId } : null,
      effort: row.effort, thinking: row.thinking === 'off' ? 'off' : null, max_output_tokens: row.maxOutputTokens, note: row.note,
      created_from: row.createdFrom, created_by_user: userRef(row.createdBy, emails, SYSTEM_IDS), created_at: row.createdAt.toISOString(),
      published_by_user: row.publishedBy ? userRef(row.publishedBy, emails, SYSTEM_IDS) : null, published_at: row.publishedAt?.toISOString() ?? null,
      estimate: operationEstimate(row.model, row.maxOutputTokens, settings.ai.usdVndRate),
    }));
  }
}
