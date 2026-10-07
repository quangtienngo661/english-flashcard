import { DynamicModule, Module } from '@nestjs/common';
import { CommonModule } from './common/common.module.js';
import type { AppConfig } from './common/config/app-config.js';
import { PrismaModule } from './common/db/prisma.module.js';
import { HealthController } from './health/health.controller.js';
import { SampleModule } from './sample/sample.module.js';

@Module({
  imports: [SampleModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [CommonModule.forRoot(config), PrismaModule.forRoot({ connectionString: config.databaseUrl })],
    };
  }
}
