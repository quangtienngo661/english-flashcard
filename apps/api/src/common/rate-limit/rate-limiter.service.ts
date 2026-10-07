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
    const { by, max, windowSeconds } = this.config.limits[rule];
    const value = by === 'user' || by === 'chain' ? subject
      : createHmac('sha256', this.config.rateLimitHmacKey).update(subject).digest('hex').slice(0, 32);
    const key = `${rule}:${by}:${value}`;
    const now = this.clock.now().getTime();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

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
}
