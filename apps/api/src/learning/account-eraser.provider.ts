import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../identity/deletion/account-eraser.js';
import { withLearnerLock } from './learning-lock.js';

/** Account deletion (Bước 8, design §7.3): a learner's schedule, log and groups are deleted with the account (SR11). */
@Injectable()
export class LearningAccountEraser implements AccountDataEraser, OnModuleInit {
  readonly module = 'learning' as const;

  constructor(@Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
  }

  async erase(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await withLearnerLock(tx, userId);
    // group_items cascade from the groups and the items.
    await tx.learningLogEntry.deleteMany({ where: { userId } });
    await tx.learningItem.deleteMany({ where: { userId } });
    await tx.learningGroup.deleteMany({ where: { userId } });
  }
}
