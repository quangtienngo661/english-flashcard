import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from './prompt-rules.js';

export type StoredPrompt = { instructions: string; examples: PromptExample[]; revision: number };

/** Reads the prompt in use and saved revisions (design §7.3). Every operation has a row from the seed migration. */
@Injectable()
export class PromptsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async current(op: AiOperation): Promise<StoredPrompt> {
    const row = await this.prisma.aiPrompt.findUniqueOrThrow({ where: { operation: op } });
    return { instructions: row.instructions, examples: row.examples as PromptExample[], revision: row.revision };
  }

  async atRevision(op: AiOperation, revision: number): Promise<StoredPrompt | null> {
    const row = await this.prisma.aiPromptRevision.findUnique({ where: { operation_revision: { operation: op, revision } } });
    return row && { instructions: row.instructions, examples: row.examples as PromptExample[], revision: row.revision };
  }
}
