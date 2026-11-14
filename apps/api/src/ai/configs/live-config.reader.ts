import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from '../prompts/prompt-rules.js';
import { toSelection, type ModelRow, type Selection } from '../runner/to-selection.js';

/** What the gateway runs for an operation right now: the prompt, and the model with its settings (null when no model is set). */
export type LiveConfig = {
  configId: string;
  number: number;
  /** The `revision` is the config number: it is what `ai_calls.prompt_revision` and a result's `meta.prompt_revision` carry (design §6.5). */
  prompt: { instructions: string; examples: PromptExample[]; revision: number };
  selection: Selection | null;
};

/**
 * Reads the config the operation's pointer names, on every call and without a cache (as the prompt and the choice were read before, F3):
 * a publish applies from the next call on. One query: the pointer, its config and the config's model.
 */
@Injectable()
export class LiveConfigReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** `null` for an operation with no live pointer (a deployment before the switch-over). */
  async find(op: AiOperation): Promise<LiveConfig | null> {
    const row = await this.prisma.aiLiveConfig.findUnique({ where: { operation: op }, include: { config: { include: { model: true } } } });
    if (!row) return null;
    const { config } = row;
    return {
      configId: config.id,
      number: config.number,
      prompt: { instructions: config.instructions, examples: config.examples as PromptExample[], revision: config.number },
      selection: config.model ? toSelection(op, config, config.model as ModelRow) : null,
    };
  }

  /** The gateway's read: every operation has a live config once the switch-over migration ran, so a missing one is an error. */
  async load(op: AiOperation): Promise<LiveConfig> {
    const live = await this.find(op);
    if (!live) throw new Error(`no live config for ${op}`);
    return live;
  }
}
