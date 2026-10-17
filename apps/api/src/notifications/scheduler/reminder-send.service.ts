import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { dateValue } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ChannelChooser } from '../provider/channel-chooser.js';
import {
  ReminderQueueService, type ReminderSendAttempt, type ReminderSendData,
} from './reminder-queue.service.js';

const isUniqueViolation = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/**
 * One reminder for one learner and local day (design 8.3, D37). The `reminder_deliveries` row, not Redis, keeps a
 * learner at one email a day: a job that finds `sending`, `sent` or `failed` sends nothing.
 */
@Injectable()
export class ReminderSendService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ChannelChooser) private readonly chooser: ChannelChooser,
    @Inject(ReminderQueueService) private readonly queue: ReminderQueueService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    this.queue.setHandler('send', (data, attempt) => this.send(data, attempt));
  }

  async send(data: ReminderSendData, attempt: ReminderSendAttempt): Promise<void> {
    const { userId, localDate, kind, language } = data;
    const key = { userId_localDate: { userId, localDate: dateValue(localDate) } };
    const skipped = (reason: string) => { this.logger.info('reminder_skipped', { user_id: userId, local_date: localDate, kind, reason }); };

    const existing = await this.prisma.reminderDelivery.findUnique({ where: key, select: { state: true } });
    if (existing) return skipped(`delivery-${existing.state}`);
    // The learner or an admin may have turned reminders off since the tick (B3E24).
    const [provider] = await this.chooser.choose(userId);
    if (!provider) return skipped('reminders-off');

    try {
      await this.prisma.reminderDelivery.create({ data: { userId, localDate: dateValue(localDate), kind, state: 'sending' } });
    } catch (error) {
      if (isUniqueViolation(error)) return skipped('delivery-exists');
      throw error;
    }

    let outcome;
    try {
      outcome = await provider.send(userId, { kind, language });
    } catch (error) {
      // A transient error: free the day for the retry, or close it after the last attempt so ticks stop trying.
      if (attempt.lastAttempt) {
        await this.prisma.reminderDelivery.update({ where: key, data: { state: 'failed' } });
        this.logger.warn('reminder_failed', { user_id: userId, local_date: localDate, kind, error });
      } else {
        await this.prisma.reminderDelivery.delete({ where: key });
      }
      throw error;
    }
    if (outcome === 'sent') {
      await this.prisma.reminderDelivery.update({ where: key, data: { state: 'sent', sentAt: this.clock.now() } });
      this.logger.info('reminder_sent', { user_id: userId, local_date: localDate, kind, channel: provider.channel });
      return;
    }
    await this.prisma.reminderDelivery.delete({ where: key });
    skipped(outcome);
  }
}
