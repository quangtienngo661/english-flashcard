import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaModule } from './common/db/prisma.module.js';
import { operationIdMiddleware } from './common/logging/operation-id.middleware.js';
import { HealthController } from './health/health.controller.js';
import { SampleModule } from './sample/sample.module.js';

@Module({
  imports: [PrismaModule.forRoot({ connectionString: process.env.DATABASE_URL ?? '' }), SampleModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(operationIdMiddleware).forRoutes('*');
  }
}
