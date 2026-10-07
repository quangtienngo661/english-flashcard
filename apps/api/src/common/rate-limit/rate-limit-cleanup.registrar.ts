import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { MaintenanceScheduler } from '../maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { deleteExpiredRateLimitCounters } from './rate-limit-cleanup.js';

@Injectable()
export class RateLimitCleanupRegistrar implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('rate-limit-counters', (now) => deleteExpiredRateLimitCounters(this.prisma, now));
  }
}
