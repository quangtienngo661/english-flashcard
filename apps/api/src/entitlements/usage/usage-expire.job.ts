import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Writes `released` on reservations nobody confirmed within 2 minutes (design §7.1, B5E5). Reads already ignore them, so
 * this only tidies the ledger; one idempotent statement, safe to run on several instances at once.
 */
@Injectable()
export class UsageExpireJob implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('entitlements-usage-expire', (now) => this.prisma.$executeRaw`
      UPDATE usage_records SET status = 'released', release_reason = 'expired', released_at = ${now}
      WHERE kind = 'use' AND status = 'reserved' AND expires_at <= ${now}`);
  }
}
