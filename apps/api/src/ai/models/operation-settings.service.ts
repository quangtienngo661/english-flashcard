import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';
import type { CostEstimate } from '../runner/cost.js';
import { selectionViolations } from './model-rules.js';
import { operationEstimate } from './operation-estimate.js';

/** Body of `PUT /v1/admin/ai/operations/{op}` (design §6.3); every key is required, `null` = default / off / no limit. */
export const putOperationSchema = z.strictObject({
  expected_version: z.number().int().min(0),
  model_ref: z.uuid().transform((value) => value.toLowerCase()).nullable(),
  effort: z.string().min(1).max(20).nullable(),
  thinking: z.literal('off').nullable(),
  max_output_tokens: z.number().int().nullable(),
});
export type PutOperationBody = z.input<typeof putOperationSchema>;

export type OperationItem = {
  operation: AiOperation;
  model: { id: string; provider: AiProviderName; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  version: number;
  input_fields: string[];
  estimate: CostEstimate | null;
};

type Decimalish = { toString(): string } | null;
type SettingRow = {
  operation: string; modelRef: string | null; effort: string | null; thinking: string | null; maxOutputTokens: number | null;
  version: number;
  model: {
    id: string; provider: string; modelId: string; maxOutputTokens: number | null; priceInput: Decimalish; priceCachedInput: Decimalish;
    priceOutput: Decimalish;
  } | null;
};

const invalid = (violations: string[]) => new ProblemDetailsException({
  status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
});
const modelNotFound = () => invalid(['model_ref: not found']);
const prismaCode = (error: unknown): unknown => (error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined);
/** Kept in `ai_operation_setting_changes` before and after a change (design §6.3). */
const choice = (row: { modelRef: string | null; effort: string | null; thinking: string | null; maxOutputTokens: number | null }) => ({
  model_ref: row.modelRef, effort: row.effort, thinking: row.thinking, max_output_tokens: row.maxOutputTokens,
});

/** The per-operation choice of model, effort, thinking and token limit (design §6.3, §12.1 #7–#8). */
@Injectable()
export class OperationSettingsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AiAdapterRegistry) private readonly registry: AiAdapterRegistry,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async list(): Promise<{ items: OperationItem[] }> {
    const [rows, settings] = await Promise.all([
      this.prisma.aiOperationSetting.findMany({ include: { model: true }, orderBy: { operation: 'asc' } }),
      this.settings.get(),
    ]);
    return { items: rows.map((row) => this.item(row, settings.ai.usdVndRate)) };
  }

  async put(actorId: string, op: AiOperation, body: PutOperationBody): Promise<OperationItem> {
    const parsed = putOperationSchema.safeParse(body);
    if (!parsed.success) throw invalid(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    const input = parsed.data;
    const model = input.model_ref === null ? null : await this.prisma.aiModel.findUnique({ where: { id: input.model_ref } });
    if (input.model_ref !== null && !model) throw modelNotFound();
    if (model && !this.registry.get(model.provider as AiProviderName)) {
      throw new ProblemDetailsException({ status: 409, type: 'provider-not-configured', title: 'Provider not configured' });
    }
    // Without a model the operation is off: only the defaults and a token limit within the general bound make sense.
    const violations = selectionViolations({
      provider: (model?.provider ?? 'fake') as AiProviderName,
      model: model ?? { effortLevels: [], thinkingOff: null, maxOutputTokens: null },
      effort: input.effort, thinking: input.thinking, maxOutputTokens: input.max_output_tokens,
    });
    if (violations.length > 0) throw invalid(violations);
    const next = { modelRef: input.model_ref, effort: input.effort, thinking: input.thinking, maxOutputTokens: input.max_output_tokens };
    const now = this.clock.now();
    try {
      await this.prisma.$transaction(async (tx) => {
        const before = await tx.aiOperationSetting.findUnique({ where: { operation: op } });
        const { count } = await tx.aiOperationSetting.updateMany({
          where: { operation: op, version: input.expected_version },
          data: { ...next, version: { increment: 1 }, updatedBy: actorId, updatedAt: now },
        });
        if (count === 0 || !before) {
          throw new ProblemDetailsException({ status: 409, type: 'operation-settings-conflict', title: 'Operation settings changed' });
        }
        await tx.aiOperationSettingChange.create({ data: {
          operation: op, oldValue: choice(before), newValue: choice(next), changedBy: actorId, changedAt: now,
        } });
      });
    } catch (error) {
      // The model was deleted between the check and the write: the foreign key refuses.
      if (prismaCode(error) === 'P2003') throw modelNotFound();
      throw error;
    }
    const [row, settings] = await Promise.all([
      this.prisma.aiOperationSetting.findUnique({ where: { operation: op }, include: { model: true } }),
      this.settings.get(),
    ]);
    return this.item(row!, settings.ai.usdVndRate);
  }

  private item(row: SettingRow, usdVndRate: number): OperationItem {
    const operation = row.operation as AiOperation;
    const model = row.model;
    const provider = model?.provider as AiProviderName | undefined;
    return {
      operation,
      model: model && provider ? { id: model.id, provider, model_id: model.modelId } : null,
      effort: row.effort,
      thinking: row.thinking === 'off' ? 'off' : null,
      max_output_tokens: row.maxOutputTokens,
      version: row.version,
      input_fields: [...OPERATIONS[operation].inputFields],
      estimate: operationEstimate(model, row.maxOutputTokens, usdVndRate),
    };
  }
}
