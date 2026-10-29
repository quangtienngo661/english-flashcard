import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { deleteIdempotencyKeysOf } from '../../common/idempotency/erase-idempotency-keys.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AccountDeletionService, type DeletionBy } from './account-deletion.service.js';
import { AccountDeletionRegistry } from './account-eraser.js';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const RETRY_AFTER = 10 * MINUTE;
const STUCK_AFTER = 24 * HOUR;
const SWEEP_WINDOW = 24 * HOUR;
const CLEANUP_BATCH = 200;

/**
 * The hourly jobs of account deletion (Bước 8, design §7.2, §7.6). The scheduler runs in the API and in the worker (`worker.ts`
 * builds the whole app), so every job is safe to run twice at once: Tx B takes the user lock and a missing `users` row means done.
 */
@Injectable()
export class DeletionJobs implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(AccountDeletionService) private readonly deletion: AccountDeletionService,
    @Inject(AccountDeletionRegistry) private readonly registry: AccountDeletionRegistry,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('identity.deletion-retry', (now) => this.retryStuck(now));
    this.scheduler.register('identity.deletion-sweep', (now) => this.sweepLateRows(now));
    this.scheduler.register('identity.unverified-cleanup', (now) => this.cleanUnverified(now));
  }

  /** Accounts left `deleting` by a failed Tx B: run Tx B again, nothing else (plan review P1). Not for Tx B still running in a request. */
  async retryStuck(now: Date): Promise<number> {
    const stuck = await this.prisma.user.findMany({
      where: { status: 'deleting', deletingSince: { lt: new Date(now.getTime() - RETRY_AFTER) } },
      select: { id: true, deletingBy: true, deletingSince: true }, orderBy: { deletingSince: 'asc' }, take: 100,
    });
    for (const user of stuck) {
      if (user.deletingSince && user.deletingSince.getTime() < now.getTime() - STUCK_AFTER) {
        this.logger.warn('account_deletion_stuck', { user_id: user.id });
      }
      await this.deletion.delete({ userId: user.id, by: (user.deletingBy ?? 'self') as DeletionBy, mode: 'resume' });
    }
    return stuck.length;
  }

  /**
   * Rows a request wrote after Tx B (it passed the guard before Tx A, B8E25/R1): run the erasers again for every account deleted in the
   * last 24 hours, in one transaction each, with a fresh anonymous id.
   */
  async sweepLateRows(now: Date): Promise<number> {
    const recent = await this.prisma.deletedAccount.findMany({
      where: { deletedAt: { gt: new Date(now.getTime() - SWEEP_WINDOW) } }, select: { userId: true },
    });
    for (const { userId } of recent) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL statement_timeout = '120s'`;
          const anonId = randomUUID();
          for (const eraser of this.registry.erasers()) await eraser.erase(tx, userId, anonId, { checks: 'normal' });
          await deleteIdempotencyKeysOf(tx, userId);
        }, { timeout: 120_000, maxWait: 5_000 });
      } catch (error) {
        this.logger.error('account_sweep_failed', error, { user_id: userId });
      }
    }
    return recent.length;
  }

  /** Accounts that never verified their email within N days (D19); each is deleted like any other, without a mail. */
  async cleanUnverified(now: Date): Promise<number> {
    const days = await this.registry.settings().unverifiedCleanupDays();
    const cutoff = new Date(now.getTime() - days * DAY);
    const due = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM users
      WHERE email_verified_at IS NULL AND staff_role IS NULL AND status IN ('active', 'locked')
        AND COALESCE(terms_accepted_at, created_at) < ${cutoff}
      ORDER BY COALESCE(terms_accepted_at, created_at) ASC LIMIT ${CLEANUP_BATCH}`);
    let deleted = 0;
    for (const { id } of due) {
      // Tx A reads the conditions again under the lock: a user who verified meanwhile comes back 'skipped'.
      if (await this.deletion.delete({ userId: id, by: 'cleanup', mode: 'normal', cleanupCutoff: cutoff }) === 'done') deleted += 1;
    }
    return deleted;
  }
}
