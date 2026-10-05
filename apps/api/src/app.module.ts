import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { operationIdMiddleware } from './common/logging/operation-id.middleware.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(operationIdMiddleware).forRoutes('*');
  }
}
