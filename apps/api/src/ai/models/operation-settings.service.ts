import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import { OPERATIONS } from '../operations/operations.js';
import type { CostEstimate } from '../runner/cost.js';
import { operationEstimate } from './operation-estimate.js';

export type OperationItem = {
  operation: AiOperation;
  model: { id: string; provider: AiProviderName; model_id: string } | null;
  effort: string | null;
  thinking: 'off' | null;
  max_output_tokens: number | null;
  /** The live pointer's version: +1 on each publish or rollback (it was the choice's version before nhóm B M2). */
  version: number;
  input_fields: string[];
  estimate: CostEstimate | null;
};

/**
 * What each operation runs with, read from its live config (design §12.1 #7; nhóm B M2). The choice is changed by publishing a config,
 * so the two writes this service had are gone (design §6.6).
 */
@Injectable()
export class OperationSettingsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async list(): Promise<{ items: OperationItem[] }> {
    const [rows, settings] = await Promise.all([
      this.prisma.aiLiveConfig.findMany({ include: { config: { include: { model: true } } }, orderBy: { operation: 'asc' } }),
      this.settings.get(),
    ]);
    return {
      items: rows.map((row): OperationItem => {
        const operation = row.operation as AiOperation;
        const { config } = row;
        const model = config.model;
        return {
          operation,
          model: model ? { id: model.id, provider: model.provider as AiProviderName, model_id: model.modelId } : null,
          effort: config.effort,
          thinking: config.thinking === 'off' ? 'off' : null,
          max_output_tokens: config.maxOutputTokens,
          version: row.version,
          input_fields: [...OPERATIONS[operation].inputFields],
          estimate: operationEstimate(model, config.maxOutputTokens, settings.ai.usdVndRate),
        };
      }),
    };
  }
}
