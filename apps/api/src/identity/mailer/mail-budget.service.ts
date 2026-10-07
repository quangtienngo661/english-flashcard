import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class MailBudget {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  async assertAvailable(): Promise<void> {
    const row = await this.prisma.mailBudgetBucket.findUnique({ where: { bucket: this.bucket() } });
    if ((row?.sent ?? 0) >= this.config.mailDailyBudget) {
      throw new ProblemDetailsException({
        status: 503, title: 'Mail unavailable', type: 'mail-unavailable',
      });
    }
  }

  async tryConsume(): Promise<boolean> {
    const bucket = this.bucket();
    // Same native-upsert pattern as RateLimiter: a single INSERT ... ON CONFLICT
    // DO UPDATE SET sent = sent + 1 RETURNING, without a read/update race.
    const updated = await this.prisma.mailBudgetBucket.upsert({
      where: { bucket },
      create: { bucket, sent: 1 },
      update: { sent: { increment: 1 } },
    });
    if (updated.sent === Math.ceil(0.8 * this.config.mailDailyBudget)) {
      this.logger.warn('mail_budget_80', { bucket, sent: updated.sent, budget: this.config.mailDailyBudget });
    }
    return updated.sent <= this.config.mailDailyBudget;
  }

  private bucket(): string {
    return `${this.config.mailBudgetKey}:${this.clock.now().toISOString().slice(0, 10)}`;
  }
}
