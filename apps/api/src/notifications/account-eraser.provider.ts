import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../identity/deletion/account-eraser.js';

/** Account deletion (Bước 8, design §7.3): reminder preferences and the log of reminder mails go with the account (SR11). */
@Injectable()
export class NotificationsAccountEraser implements AccountDataEraser, OnModuleInit {
  readonly module = 'notifications' as const;

  constructor(@Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry) {}

  onModuleInit(): void {
    this.registry.registerEraser(this);
  }

  async erase(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await tx.reminderDelivery.deleteMany({ where: { userId } });
    await tx.reminderPref.deleteMany({ where: { userId } });
  }
}
