import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { SampleController } from './sample.controller.js';

@Module({
  controllers: [SampleController],
  providers: [IdempotencyInterceptor],
})
export class SampleModule {}
