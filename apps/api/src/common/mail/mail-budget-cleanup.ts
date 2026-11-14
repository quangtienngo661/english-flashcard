import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { MaintenanceScheduler } from '../maintenance/maintenance.scheduler.js';

/** A day's mail budget row is only read on that UTC day; a week of history is more than anything needs. */
export const MAIL_BUDGET_RETENTION_DAYS = 7;

/**
 * Deletes the budget rows of UTC days older than the retention (B1-5). A bucket key is `<MAIL_BUDGET_KEY>:<YYYY-MM-DD>`
 * (`MailBudget.bucket`); the date is its last ten characters, and a key that does not end in a date is left alone.
 */
export async function deleteOldMailBudgetBuckets(prisma: PrismaClient, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - MAIL_BUDGET_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return prisma.$executeRaw`
    DELETE FROM mail_budget_buckets
    WHERE bucket ~ '[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND right(bucket, 10) < ${cutoff}`;
}

@Injectable()
export class MailBudgetCleanupRegistrar implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('mail-budget-buckets', (now) => deleteOldMailBudgetBuckets(this.prisma, now));
  }
}
