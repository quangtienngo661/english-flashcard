import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard.js';
import { SampleController } from './sample.controller.js';

@Module({
  controllers: [SampleController],
  providers: [IdempotencyInterceptor, RateLimitGuard],
})
export class SampleModule {}
