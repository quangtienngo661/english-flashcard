import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { OrdersReconcileService } from './orders-reconcile.service.js';
import { OrdersRepository } from './orders.repository.js';

/** At most this many orders per run (design §3.6). */
const BATCH = 100;

/**
 * Hourly: asks payOS about the orders that have not been resolved (launch prep B design §3.6). It runs in the API and in the worker, so
 * the claim writes `checked_at` with `SKIP LOCKED`: each order goes to one process. One order failing does not stop the others.
 */
@Injectable()
export class OrdersReconcileJob implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(OrdersRepository) private readonly orders: OrdersRepository,
    @Inject(OrdersReconcileService) private readonly reconcile: OrdersReconcileService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('billing.orders-reconcile', (now) => this.run(now));
  }

  async run(now: Date): Promise<number> {
    const claimed = await this.orders.claimForReconcile(this.prisma, now, BATCH);
    for (const order of claimed) {
      try {
        await this.reconcile.reconcileOne(order, now);
      } catch (error) {
        this.logger.error('order_reconcile_failed', error, { order_ref: order.id });
      }
    }
    return claimed.length;
  }
}
