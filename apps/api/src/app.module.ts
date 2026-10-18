import { DynamicModule, Module } from '@nestjs/common';
import { CommonModule } from './common/common.module.js';
import type { AppConfig } from './common/config/app-config.js';
import { PrismaModule } from './common/db/prisma.module.js';
import { ContentModule } from './content/content.module.js';
import { ContentPipelineModule } from './content-pipeline/content-pipeline.module.js';
import { BatchScopeModule } from './content-pipeline/import/batch-scope.provider.js';
import { EntitlementsModule } from './entitlements/entitlements.module.js';
import { HealthController } from './health/health.controller.js';
import { IdentityModule } from './identity/identity.module.js';
import { LearningModule } from './learning/learning.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PracticeModule } from './practice/practice.module.js';
import { SampleModule } from './sample/sample.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    SampleModule, IdentityModule, BatchScopeModule, ContentModule, ContentPipelineModule, SettingsModule, NotificationsModule,
    LearningModule, EntitlementsModule, PracticeModule,
  ],
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
