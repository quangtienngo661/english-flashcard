import { Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Idempotent } from '../common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { RedactingLoggerService } from '../common/logging/redacting-logger.service.js';
import { decodePageToken } from '../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { CurrentUser } from '../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../common/request-user/request-user.js';

@Controller('sample')
export class SampleController {
  private readonly logger = new RedactingLoggerService();

  @Post()
  @Idempotent()
  @RateLimit({ max: 10, windowSeconds: 60 })
  @UseGuards(RateLimitGuard)
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: RequestUser | undefined) {
    this.logger.log({ event: 'sample.create', userId: user?.userId }, 'SampleController');
    return { receivedAt: new Date().toISOString() };
  }

  @Get()
  list(@Query('page_token') pageToken?: string) {
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      if (cursor === null) {
        throw new ProblemDetailsException({ status: 400, title: 'Malformed page_token' });
      }
    }
    return { items: [], next_page_token: null };
  }
}
