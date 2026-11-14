import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { Clock } from '../clock/clock.js';
import { APP_CONFIG, type AppConfig, type RateLimitRuleName } from '../config/app-config.js';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';

@Injectable()
export class RateLimiter {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async hit(rule: RateLimitRuleName, subject: string): Promise<void> {
    const { max } = this.config.limits[rule];
    const { key, windowStart, windowMs, now } = this.slot(rule, subject);

    // Preserve Bước 0's verified native-upsert pattern: one INSERT ... ON CONFLICT
    // DO UPDATE SET count = count + 1 RETURNING, with matching where/create keys.
    const updated = await this.prisma.rateLimitCounter.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (updated.count > max) {
      throw new ProblemDetailsException({
        status: 429,
        title: 'Too many requests',
        type: 'rate-limited',
        retryAfterSeconds: Math.ceil((windowStart.getTime() + windowMs - now) / 1000),
      });
    }
  }

  /** Reads the counter of the current window without counting a hit; a missing row is `used: 0`. */
  async peek(rule: RateLimitRuleName, subject: string): Promise<{ limit: number; used: number; resetsAt: Date }> {
    const { key, windowStart, windowMs } = this.slot(rule, subject);
    const row = await this.prisma.rateLimitCounter.findUnique({ where: { key_windowStart: { key, windowStart } } });
    return { limit: this.config.limits[rule].max, used: row?.count ?? 0, resetsAt: new Date(windowStart.getTime() + windowMs) };
  }

  private slot(rule: RateLimitRuleName, subject: string) {
    const { by, windowSeconds } = this.config.limits[rule];
    const value = by === 'user' || by === 'chain' ? subject
      : createHmac('sha256', this.config.rateLimitHmacKey).update(subject).digest('hex').slice(0, 32);
    const key = `${rule}:${by}:${value}`;
    const now = this.clock.now().getTime();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    return { key, windowStart, windowMs, now };
  }
}
