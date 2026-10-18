import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';

const hour = 3_600_000;

/** `months` calendar months before `at` in UTC; a day the target month lacks becomes its last day. */
export function monthsBefore(at: Date, months: number): Date {
  const target = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(at.getUTCDate(), lastDay));
  target.setUTCHours(at.getUTCHours(), at.getUTCMinutes(), at.getUTCSeconds(), at.getUTCMilliseconds());
  return target;
}

/** Hourly cleanup of Practice tables (design §11); registered with the common scheduler. */
@Injectable()
export class PracticeCleanupService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('practice-cleanup', (now) => this.runOnce(now));
  }

  async runOnce(now: Date) {
    const { historyMonths, idleSessionCloseHours } = (await this.settings.get()).practice;
    const cutoff = monthsBefore(now, historyMonths);
    // Items first: their reports keep the snapshot with item_id set to null (FK), and their questions become free.
    const items = await this.prisma.practiceSessionItem.deleteMany({ where: { askedAt: { lt: cutoff } } });
    const questions = await this.prisma.practiceQuestion.deleteMany({ where: { items: { none: {} } } });
    const sessions = await this.prisma.practiceSession.deleteMany({
      where: { status: { in: ['finished', 'abandoned'] }, endedAt: { lt: cutoff } },
    });
    // Open reports stay until staff resolve them.
    const reports = await this.prisma.practiceReport.deleteMany({
      where: { status: { not: 'open' }, resolvedAt: { lt: cutoff } },
    });
    const abandoned = await this.prisma.practiceSession.updateMany({
      where: {
        status: { in: ['active', 'waiting_continue'] },
        lastActivityAt: { lt: new Date(now.getTime() - idleSessionCloseHours * hour) },
      },
      data: { status: 'abandoned', endedAt: now },
    });
    return {
      items: items.count, questions: questions.count, sessions: sessions.count, reports: reports.count,
      abandoned: abandoned.count,
    };
  }
}
