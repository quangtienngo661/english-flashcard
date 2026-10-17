import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { MaintenanceScheduler } from '../maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Deletes keys older than their 24 h lifetime (the same bound runIdempotent applies), so stored response
 * bodies, which may hold learner content such as context sentences, do not stay forever (review M1).
 */
@Injectable()
export class IdempotencyCleanupRegistrar implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('idempotency-keys', async (now) => (await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - 24 * 3600 * 1000) } },
    })).count);
  }
}
