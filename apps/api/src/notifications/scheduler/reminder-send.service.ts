import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { dateValue, localDate as localDateIn } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { LearningService } from '../../learning/index.js';
import { ChannelChooser } from '../provider/channel-chooser.js';
import { classifyMailError } from '../../common/mail/mail-error.js';
import {
  ReminderQueueService, type ReminderSendAttempt, type ReminderSendData,
} from './reminder-queue.service.js';

const isUniqueViolation = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/**
 * One reminder for one learner and local day (design 8.3, D37). The `reminder_deliveries` row, not Redis, keeps a
 * learner at one email a day: a job that finds `sending`, `sent` or `failed` sends nothing. A send error is handled by
 * what it says about delivery (`classifyMailError`): retry only when the message certainly did not go out.
 */
@Injectable()
export class ReminderSendService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ChannelChooser) private readonly chooser: ChannelChooser,
    @Inject(LearningService) private readonly learning: LearningService,
    @Inject(IdentityService) private readonly identity: IdentityService,
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
    // A job delayed past its local day (worker down overnight) must not send yesterday's email today (L13).
    const profile = await this.identity.getProfile(userId);
    if (!profile || localDateIn(profile.timezone, this.clock.now()) !== localDate) return skipped('stale-day');
    // The learner or an admin may have turned reminders off since the tick (B3E24).
    const [provider] = await this.chooser.choose(userId);
    if (!provider) return skipped('reminders-off');
    // The learner may have finished today's cards since the tick (D27).
    if (!(await this.learning.cardsLeftToday([{ userId, today: localDate }])).has(userId)) return skipped('no-cards-left');

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
      const errorKind = classifyMailError(error);
      if (errorKind === 'unknown') {
        // The server may already have the message: keep `sending` so nothing retries it (D37, M9).
        this.logger.warn('reminder_outcome_unknown', { user_id: userId, local_date: localDate, kind, error });
        return;
      }
      if (errorKind === 'permanent' || attempt.lastAttempt) {
        // Close the day so later ticks and retries stop (M7); a permanent error costs one attempt only.
        await this.prisma.reminderDelivery.update({ where: key, data: { state: 'failed' } });
        this.logger.warn('reminder_failed', { user_id: userId, local_date: localDate, kind, reason: errorKind, error });
        if (errorKind === 'permanent') throw new UnrecoverableError('Permanent SMTP error');
        throw error;
      }
      // Certainly not delivered: free the day for BullMQ's retry.
      await this.prisma.reminderDelivery.delete({ where: key });
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
