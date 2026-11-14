import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import { LiveConfigReader } from '../configs/live-config.reader.js';
import type { PromptExample } from './prompt-rules.js';

export type StoredPrompt = { instructions: string; examples: PromptExample[]; revision: number };

/** Reads the prompt in use (the live config's text, `revision` = its number) and the revisions saved before nhóm B M2 (design §7.3). */
@Injectable()
export class PromptsRepository {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(LiveConfigReader) private readonly live: LiveConfigReader,
  ) {}

  async current(op: AiOperation): Promise<StoredPrompt> {
    return (await this.live.load(op)).prompt;
  }

  async atRevision(op: AiOperation, revision: number): Promise<StoredPrompt | null> {
    const row = await this.prisma.aiPromptRevision.findUnique({ where: { operation_revision: { operation: op, revision } } });
    return row && { instructions: row.instructions, examples: row.examples as PromptExample[], revision: row.revision };
  }
}
