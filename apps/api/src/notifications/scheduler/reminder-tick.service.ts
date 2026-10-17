import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { MailBudget, mailLimit, REMINDER_MAIL_SHARE } from '../../common/mail/mail-budget.service.js';
import { addDays, dateString, dateValue, localDate } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { reminderLanguage } from '../provider/reminder-message.js';
import { eligibility } from './eligibility.js';
import { ReminderQueueService, type ReminderSendData } from './reminder-queue.service.js';

const PAGE_SIZE = 500;
/** sentDates covers the last 7 local days: enough for minGapDays ≤ 7 and the weekly inactive cap. */
const HISTORY_DAYS = 7;

/**
 * Every `reminders.tickSeconds` (design 8.1): picks the learners due a reminder now and adds one send job each.
 * The send job re-checks everything, so a tick may be stale or run twice (two workers) without a second email.
 */
@Injectable()
export class ReminderTickService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(MailBudget) private readonly budget: MailBudget,
    @Inject(ReminderQueueService) private readonly queue: ReminderQueueService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.queue.setHandler('tick', () => this.tick());
  }

  async tick(): Promise<void> {
    const { reminders } = await this.settings.get();
    if (!reminders.enabled) return;
    // Same limit the email provider applies, so no job is added only to be refused (B3E23).
    const limit = mailLimit(this.config.mailDailyBudget, REMINDER_MAIL_SHARE);
    if (await this.budget.sentToday() >= limit) {
      this.logger.info('reminder_tick_skipped', { reason: 'budget-exhausted' });
      return;
    }
    let afterUserId: string | null = null;
    for (;;) {
      const page = await this.identity.listReminderCandidates({ afterUserId, limit: PAGE_SIZE });
      if (page.length === 0) return;
      afterUserId = page.at(-1)!.userId;
      const jobs = await this.eligibleIn(page, reminders);
      for (const job of jobs) await this.queue.enqueueSend(job);
      if (page.length < PAGE_SIZE) return;
    }
  }

  private async eligibleIn(
    page: Awaited<ReturnType<IdentityService['listReminderCandidates']>>,
    reminders: Awaited<ReturnType<SettingsService['get']>>['reminders'],
  ): Promise<ReminderSendData[]> {
    const now = this.clock.now();
    const ids = page.map((candidate) => candidate.userId);
    const today = new Map(page.map((candidate) => [candidate.userId, localDate(candidate.timezone, now)]));
    const earliest = [...today.values()].toSorted()[0];
    const [optedOut, deliveries] = await Promise.all([
      this.prisma.reminderPref.findMany({ where: { userId: { in: ids }, enabled: false }, select: { userId: true } }),
      this.prisma.reminderDelivery.findMany({
        where: { userId: { in: ids }, localDate: { gte: dateValue(addDays(earliest, -HISTORY_DAYS)) } },
        select: { userId: true, localDate: true, state: true },
      }),
    ]);
    const off = new Set(optedOut.map((row) => row.userId));
    const byUser = new Map<string, typeof deliveries>();
    for (const row of deliveries) byUser.set(row.userId, [...byUser.get(row.userId) ?? [], row]);
    const jobs: ReminderSendData[] = [];
    for (const candidate of page) {
      if (off.has(candidate.userId)) continue;
      const own = byUser.get(candidate.userId) ?? [];
      const todayDate = today.get(candidate.userId)!;
      if (own.some((row) => dateString(row.localDate) === todayDate)) continue;
      const result = eligibility({
        now, timezone: candidate.timezone, createdAt: candidate.createdAt, lastSeenAt: candidate.lastSeenAt,
        settings: reminders, sentDates: own.filter((row) => row.state === 'sent').map((row) => dateString(row.localDate)),
      });
      if ('skip' in result) continue;
      jobs.push({
        userId: candidate.userId, localDate: result.today, kind: result.kind, language: reminderLanguage(candidate.nativeLanguage),
      });
    }
    return jobs;
  }
}
