import { Controller, Get, Inject, Post, Query, UseInterceptors } from '@nestjs/common';
import { Idempotent } from '../common/idempotency/idempotent.decorator.js';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { AppLogger } from '../common/logging/app-logger.js';
import { decodePageToken } from '../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../common/request-user/request-user.js';
import { Public } from '../identity/sessions/public.decorator.js';

@Controller('sample')
export class SampleController {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  @Post()
  @Idempotent()
  @RateLimit('sample.create')
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: RequestUser | undefined) {
    this.logger.info('sample.create', { user_id: user?.userId });
    return { receivedAt: new Date().toISOString() };
  }

  @Get()
  @Public()
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
