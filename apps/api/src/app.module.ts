import { DynamicModule, Module } from '@nestjs/common';
import { CommonModule } from './common/common.module.js';
import type { AppConfig } from './common/config/app-config.js';
import { PrismaModule } from './common/db/prisma.module.js';
import { ContentModule } from './content/content.module.js';
import { ContentPipelineModule } from './content-pipeline/content-pipeline.module.js';
import { HealthController } from './health/health.controller.js';
import { IdentityModule } from './identity/identity.module.js';
import { SampleModule } from './sample/sample.module.js';

@Module({
  imports: [SampleModule, IdentityModule, ContentModule, ContentPipelineModule],
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
