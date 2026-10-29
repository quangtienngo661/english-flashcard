import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../../identity/deletion/account-eraser.js';

/**
 * Account deletion (Bước 8, design §7.3): a learner's private words and saved sentences go with the account. Staff audit columns
 * (`created_by`, `published_by`, `state_changed_by`, `added_by`) stay as opaque ids (D18).
 */
@Injectable()
export class ContentAccountEraser implements AccountDataEraser, OnModuleInit {
  readonly module = 'content' as const;

  constructor(@Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
  }

  async erase(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    // Same lock as every private-word write (private-words.service.ts), so a create racing the deletion waits.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'content.private:' + userId}, 0))`;
    // One bulk delete, not deletePrivateEntryContent per word; senses, revisions, texts, levels, inflections and sentences of these
    // entries cascade, and the trigger entries_clear_form_kind still runs for each row (design §7.3).
    await tx.entry.deleteMany({ where: { scope: 'private', ownerUserId: userId } });
    await tx.contextSentence.deleteMany({ where: { userId } });
  }
}
