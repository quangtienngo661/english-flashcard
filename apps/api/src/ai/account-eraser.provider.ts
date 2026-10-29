import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../identity/deletion/account-eraser.js';
import { AiService } from './ai.service.js';

/** Account deletion (Bước 8, design §7.3, B6E68): call contents and replay rows go, `ai_calls` keep their totals with the user id cleared. */
@Injectable()
export class AiAccountEraser implements AccountDataEraser, OnModuleInit {
  readonly module = 'ai' as const;

  constructor(
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(AiService) private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
  }

  erase(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    return this.ai.deleteUserData(userId, tx);
  }
}
