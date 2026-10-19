import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../clock/clock.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { AppLogger } from '../logging/app-logger.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/** Share of the daily budget reminder emails may use; the rest stays for OTP (design 8.2, D24). */
export const REMINDER_MAIL_SHARE = 0.8;

/** Share entitlement emails (trial, renewal) may use: above the reminders, still leaving 5% for OTP (Bước 5 R18). */
export const PAYMENT_MAIL_SHARE = 0.95;

/** The one place a share of the budget becomes a mail count: the reminder tick and provider stop at the same number. */
export function mailLimit(budget: number, share: number): number {
  return Math.floor(share * budget);
}

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

  async tryConsume(opts?: { ceiling?: number }): Promise<boolean> {
    const bucket = this.bucket();
    if (opts?.ceiling !== undefined) return this.tryConsumeBelow(bucket, mailLimit(this.config.mailDailyBudget, opts.ceiling));
    // Same native-upsert pattern as RateLimiter: a single INSERT ... ON CONFLICT
    // DO UPDATE SET sent = sent + 1 RETURNING, without a read/update race.
    const updated = await this.prisma.mailBudgetBucket.upsert({
      where: { bucket },
      create: { bucket, sent: 1 },
      update: { sent: { increment: 1 } },
    });
    this.warnAt80(bucket, updated.sent);
    return updated.sent <= this.config.mailDailyBudget;
  }

  async sentToday(): Promise<number> {
    const row = await this.prisma.mailBudgetBucket.findUnique({ where: { bucket: this.bucket() } });
    return row?.sent ?? 0;
  }

  /** One statement increments only while `sent < limit`, so concurrent callers never pass the limit or spend past it. */
  private async tryConsumeBelow(bucket: string, limit: number): Promise<boolean> {
    if (limit <= 0) return false;
    const rows = await this.prisma.$queryRaw<Array<{ sent: number }>>`
      INSERT INTO mail_budget_buckets (bucket, sent) VALUES (${bucket}, 1)
      ON CONFLICT (bucket) DO UPDATE SET sent = mail_budget_buckets.sent + 1
      WHERE mail_budget_buckets.sent < ${limit}
      RETURNING sent`;
    if (rows.length === 0) return false;
    this.warnAt80(bucket, rows[0].sent);
    return true;
  }

  /** Every consumer adds one, so exactly one call per day lands on the 80% count, whichever path it took. */
  private warnAt80(bucket: string, sent: number): void {
    if (sent === Math.ceil(0.8 * this.config.mailDailyBudget)) {
      this.logger.warn('mail_budget_80', { bucket, sent, budget: this.config.mailDailyBudget });
    }
  }

  private bucket(): string {
    return `${this.config.mailBudgetKey}:${this.clock.now().toISOString().slice(0, 10)}`;
  }
}
