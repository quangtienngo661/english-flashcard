import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ContentService } from '../../content/index.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../../identity/deletion/account-eraser.js';
import { withPracticeLock } from '../practice-lock.js';

/**
 * Account deletion (Bước 8, design §7.3, D14, D27). Runs first (lock order and because it needs the learner's private senses
 * before Content deletes them). Reports of private words are deleted like `deleteForSenses` does; the other reports stay with the
 * anonymous id, no note and no learner answer in the snapshot. Items go before questions (`practice_session_items.question_id` is RESTRICT).
 */
@Injectable()
export class PracticeAccountEraser implements AccountDataEraser, OnModuleInit {
  readonly module = 'practice' as const;

  constructor(
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
  }

  async erase(tx: Prisma.TransactionClient, userId: string, anonId: string): Promise<void> {
    await withPracticeLock(tx, userId);
    const privateSenseIds = await this.content.privateSenseIdsOf(tx, userId);
    if (privateSenseIds.length > 0) await tx.practiceReport.deleteMany({ where: { userId, senseId: { in: privateSenseIds } } });
    // jsonb_set with create_missing = false leaves a snapshot without these keys unchanged (D27b: the answer the learner typed goes).
    await tx.$executeRaw`
      UPDATE practice_reports SET
        user_id = ${anonId}::uuid, note = NULL,
        question_snapshot = jsonb_set(jsonb_set(jsonb_set(question_snapshot,
          '{learner,answer}', 'null'::jsonb, false),
          '{learner,option_index}', 'null'::jsonb, false),
          '{learner,answers_tried}', '[]'::jsonb, false)
      WHERE user_id = ${userId}::uuid`;
    await tx.practiceSessionItem.deleteMany({ where: { userId } });
    await tx.practiceQuestion.deleteMany({ where: { userId } });
    await tx.practiceSession.deleteMany({ where: { userId } });
    await tx.practiceAiRequest.deleteMany({ where: { userId } });
    await tx.practiceWordCheck.deleteMany({ where: { userId } });
  }
}
