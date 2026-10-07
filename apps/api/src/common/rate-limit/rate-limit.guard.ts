import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../request-user/fake-request-user.middleware.js';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.userId;
    if (!userId) {
      return true;
    }

    const windowMs = options.windowSeconds * 1000;
    const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

    // B0E2 requires one atomic round trip. Verified via Prisma's query log (06/10/2026, gpt-6-astra
    // review + Claude follow-up): both the create path and the conflict/update path emit exactly one
    // "INSERT ... ON CONFLICT (user_id, window_start) DO UPDATE SET count = count + $n ... RETURNING"
    // statement each — confirmed with Prisma's event-based query logging against a real Postgres, not
    // inferred from the concurrency test alone. If this ever changes (Prisma version bump), re-verify
    // the same way before trusting it again; the documented fallback is $queryRawTyped with an explicit
    // ON CONFLICT (user_id, window_start) DO UPDATE SET count = count + 1 RETURNING count.
    const updated = await this.prisma.rateLimitCounter.upsert({
      where: { userId_windowStart: { userId, windowStart } },
      create: { userId, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    const count = updated.count;
    if (count > options.max) {
      const retryAfterSeconds = Math.ceil(
        (windowStart.getTime() + windowMs - Date.now()) / 1000,
      );
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('Retry-After', String(retryAfterSeconds));
      throw new ProblemDetailsException({
        status: 429,
        title: 'Rate limit exceeded',
        detail: `Retry after ${retryAfterSeconds} seconds`,
      });
    }

    return true;
  }
}
