import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Response } from 'express';
import { DRIZZLE_DB } from '../db/drizzle.module.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../request-user/fake-request-user.middleware.js';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase,
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

    // Single atomic statement (B0E2): two concurrent requests cannot both read "under limit"
    // before either writes, because the increment and the read of the new count happen in one
    // round trip to Postgres.
    const result = await this.db.execute<{ count: number }>(sql`
      INSERT INTO rate_limit_counters (user_id, window_start, count)
      VALUES (${userId}, ${windowStart}, 1)
      ON CONFLICT (user_id, window_start)
      DO UPDATE SET count = rate_limit_counters.count + 1
      RETURNING count
    `);

    const count = result.rows[0].count;
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
