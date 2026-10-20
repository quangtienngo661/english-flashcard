import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import type { ModelDescription, ModelInfo } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import {
  AI_DESCRIBE_TIMEOUT_MS, ANTHROPIC_MAX_TOKENS_FALLBACK, MODEL_ID_PATTERN, MODEL_NOTE_MAX, PRICE_MAX,
} from '../ai.constants.js';
import { AI_OPERATIONS, AI_PROVIDERS, type AiOperation, type AiProviderName } from '../ai.types.js';
import { estimateCost, type CostEstimate, type Price } from '../runner/cost.js';
import { effortChoices } from './model-rules.js';

const price = z.number().min(0).max(PRICE_MAX)
  .refine((value) => Math.abs(value * 1e4 - Math.round(value * 1e4)) < 1e-6, 'Expected at most 4 decimals').nullable().optional();
const note = z.string().trim().max(MODEL_NOTE_MAX).nullable().optional();

/** Body of `POST /v1/admin/ai/models` (design §6.1); `model_id` is checked before any provider call (B6E96). */
export const addModelSchema = z.strictObject({
  provider: z.enum(AI_PROVIDERS),
  model_id: z.string().regex(MODEL_ID_PATTERN, 'Expected 1 to 100 of A-Z a-z 0-9 . _ : -'),
  price_input: price, price_cached_input: price, price_output: price, note,
});
export type AddModelBody = z.input<typeof addModelSchema>;

/** Body of `PATCH /v1/admin/ai/models/{id}`: prices and note only, each nullable. */
export const patchModelSchema = z.strictObject({ price_input: price, price_cached_input: price, price_output: price, note });
export type PatchModelBody = z.input<typeof patchModelSchema>;

export type ModelView = {
  id: string;
  provider: AiProviderName;
  model_id: string;
  shutdown_at: string | null;
  lifecycle: string | null;
  effort_choices: string[];
  thinking_off_available: boolean;
  structured_outputs: boolean | null;
  max_output_tokens: number | null;
  price: { input: string; cached_input: string | null; output: string } | null;
  note: string | null;
  info_checked_at: string;
  used_by: AiOperation[];
  estimate: CostEstimate | null;
};

type Decimalish = { toFixed(digits: number): string } | null;
type ModelRow = {
  id: string; provider: string; modelId: string; shutdownAt: Date | null; lifecycle: string | null; effortLevels: string[];
  thinkingOff: string | null; structuredOutputs: boolean | null; maxOutputTokens: number | null; priceInput: Decimalish;
  priceCachedInput: Decimalish; priceOutput: Decimalish; note: string | null; infoCheckedAt: Date;
};

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const notFound = () => problem(404, 'not-found', 'Not found');
const modelExists = () => problem(409, 'model-exists', 'Model already added');
const modelInUse = () => problem(409, 'model-in-use', 'Model in use');
const notConfigured = () => problem(409, 'provider-not-configured', 'Provider not configured');
const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});

const prismaCode = (error: unknown): unknown => (error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined);

function parse<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw invalid(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  return result.data;
}

/** `ai_models` columns from a provider's description (plan choice 9). */
const infoColumns = (info: ModelInfo) => ({
  shutdownAt: info.shutdownAt, lifecycle: info.lifecycle, effortLevels: info.effortLevels, thinkingOff: info.thinkingOff,
  structuredOutputs: info.structuredOutputs, maxOutputTokens: info.maxOutputTokens,
});

/** The model list (design §6.1, §6.6, §12.1 #2–#6). A provider is called outside any transaction (design §4.4). */
@Injectable()
export class ModelsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async list(provider?: AiProviderName): Promise<{ items: ModelView[] }> {
    const rows = await this.prisma.aiModel.findMany({
      where: provider ? { provider } : {}, orderBy: [{ provider: 'asc' }, { modelId: 'asc' }],
    });
    return { items: await this.views(rows) };
  }

  async add(actorId: string, body: AddModelBody): Promise<ModelView> {
    const input = parse(addModelSchema, body);
    if (!this.registry.get(input.provider)) throw notConfigured();
    const key = { provider: input.provider, modelId: input.model_id };
    if (await this.prisma.aiModel.findUnique({ where: { provider_modelId: key } })) throw modelExists();
    const info = await this.describe(input.provider, input.model_id);
    // The fake costs nothing: its prices are forced to 0 (design §6.1).
    const prices = input.provider === 'fake'
      ? { priceInput: 0, priceCachedInput: 0, priceOutput: 0 }
      : { priceInput: input.price_input ?? null, priceCachedInput: input.price_cached_input ?? null, priceOutput: input.price_output ?? null };
    try {
      const row = await this.prisma.aiModel.create({ data: {
        ...key, ...infoColumns(info), ...prices, note: input.note ?? null, infoCheckedAt: this.clock.now(), createdBy: actorId,
      } });
      return (await this.views([row]))[0];
    } catch (error) {
      if (prismaCode(error) === 'P2002') throw modelExists();
      throw error;
    }
  }

  async update(id: string, patch: PatchModelBody): Promise<ModelView> {
    const input = parse(patchModelSchema, patch);
    if (!await this.prisma.aiModel.findUnique({ where: { id } })) throw notFound();
    const data = {
      ...(input.price_input !== undefined ? { priceInput: input.price_input } : {}),
      ...(input.price_cached_input !== undefined ? { priceCachedInput: input.price_cached_input } : {}),
      ...(input.price_output !== undefined ? { priceOutput: input.price_output } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };
    try {
      return (await this.views([await this.prisma.aiModel.update({ where: { id }, data })]))[0];
    } catch (error) {
      if (prismaCode(error) === 'P2025') throw notFound();
      throw error;
    }
  }

  /** Reads the model's information again; the provider's answer maps like `add` (plan choice 21). */
  async refresh(id: string): Promise<ModelView> {
    const row = await this.prisma.aiModel.findUnique({ where: { id } });
    if (!row) throw notFound();
    const provider = row.provider as AiProviderName;
    if (!this.registry.get(provider)) throw notConfigured();
    const info = await this.describe(provider, row.modelId);
    try {
      const updated = await this.prisma.aiModel.update({
        where: { id }, data: { ...infoColumns(info), infoCheckedAt: this.clock.now() },
      });
      return (await this.views([updated]))[0];
    } catch (error) {
      if (prismaCode(error) === 'P2025') throw notFound();
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if (!await this.prisma.aiModel.findUnique({ where: { id } })) throw notFound();
    if ((await this.prisma.aiOperationSetting.findMany({ where: { modelRef: id } })).length > 0) throw modelInUse();
    try {
      await this.prisma.aiModel.delete({ where: { id } });
    } catch (error) {
      // A choice saved between the check and the delete: the foreign key refuses (ON DELETE RESTRICT).
      if (prismaCode(error) === 'P2003') throw modelInUse();
      if (prismaCode(error) === 'P2025') throw notFound();
      throw error;
    }
  }

  private async describe(provider: AiProviderName, modelId: string): Promise<ModelInfo> {
    const adapter = this.registry.get(provider);
    if (!adapter) throw notConfigured();
    const description: ModelDescription = await adapter.describeModel(modelId, AbortSignal.timeout(AI_DESCRIBE_TIMEOUT_MS));
    switch (description.kind) {
      case 'not-found': throw problem(422, 'model-not-found', 'Model not found');
      case 'not-configured': throw notConfigured();
      case 'unavailable': throw problem(503, 'provider-unavailable', 'Provider unavailable');
      case 'found':
        // The gateway always sends a JSON schema (design §6.1, R4).
        if (provider === 'anthropic' && description.info.structuredOutputs === false) {
          throw problem(422, 'model-not-supported', 'Model not supported');
        }
        return description.info;
    }
  }

  private async views(rows: ModelRow[]): Promise<ModelView[]> {
    if (rows.length === 0) return [];
    const [settings, choices] = await Promise.all([
      this.settings.get(),
      this.prisma.aiOperationSetting.findMany({ where: { modelRef: { in: rows.map((row) => row.id) } } }),
    ]);
    return rows.map((row) => {
      const provider = row.provider as AiProviderName;
      const price: Price | null = row.priceInput !== null && row.priceOutput !== null
        ? { input: Number(row.priceInput), cachedInput: row.priceCachedInput !== null ? Number(row.priceCachedInput) : null, output: Number(row.priceOutput) }
        : null;
      // The dearest call: the model's maximum, or for Anthropic what a call without a limit sends (D28).
      const maxCall = row.maxOutputTokens ?? (provider === 'anthropic' ? ANTHROPIC_MAX_TOKENS_FALLBACK : null);
      return {
        id: row.id,
        provider,
        model_id: row.modelId,
        shutdown_at: row.shutdownAt?.toISOString() ?? null,
        lifecycle: row.lifecycle,
        effort_choices: effortChoices(provider, row),
        thinking_off_available: provider === 'anthropic' && row.thinkingOff !== null,
        structured_outputs: row.structuredOutputs,
        max_output_tokens: row.maxOutputTokens,
        price: row.priceInput !== null && row.priceOutput !== null
          ? { input: row.priceInput.toFixed(4), cached_input: row.priceCachedInput?.toFixed(4) ?? null, output: row.priceOutput.toFixed(4) }
          : null,
        note: row.note,
        info_checked_at: row.infoCheckedAt.toISOString(),
        used_by: AI_OPERATIONS.filter((op) => choices.some((choice) => choice.operation === op && choice.modelRef === row.id)),
        estimate: estimateCost(price, maxCall, settings.ai.usdVndRate),
      };
    });
  }
}
