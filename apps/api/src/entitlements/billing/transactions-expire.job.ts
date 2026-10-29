import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';

const HO_CHI_MINH_OFFSET_MS = 7 * 3_600_000;

/**
 * Money records are kept for N years (D15, `entitlements.transactionRetentionYears`, default 10). A record stays through the end of the
 * year it falls in, so the cut is 1 January of (this year − N) in `Asia/Ho_Chi_Minh` (no daylight saving, UTC+7 all year).
 * One idempotent statement, safe to run in the API and the worker at once.
 */
@Injectable()
export class TransactionsExpireJob implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('billing.transactions-expire', (now) => this.run(now));
  }

  async run(now: Date): Promise<number> {
    const { transactionRetentionYears } = (await this.settings.get()).entitlements;
    const year = new Date(now.getTime() + HO_CHI_MINH_OFFSET_MS).getUTCFullYear();
    const cut = new Date(Date.UTC(year - transactionRetentionYears, 0, 1) - HO_CHI_MINH_OFFSET_MS);
    const { count } = await this.prisma.billingTransaction.deleteMany({ where: { occurredAt: { lt: cut } } });
    return count;
  }
}
