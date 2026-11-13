import { DynamicModule, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AiModule } from './ai/index.js';
import { CommonModule } from './common/common.module.js';
import type { AppConfig } from './common/config/app-config.js';
import { PrismaModule } from './common/db/prisma.module.js';
import { ContentModule } from './content/content.module.js';
import { ContentPipelineModule } from './content-pipeline/content-pipeline.module.js';
import { BatchScopeModule } from './content-pipeline/import/batch-scope.provider.js';
import { EntitlementsModule } from './entitlements/entitlements.module.js';
import { FaqModule } from './faq/faq.module.js';
import { HealthController } from './health/health.controller.js';
import { READINESS_REDIS, ReadinessService } from './health/readiness.service.js';
import { IdentityModule } from './identity/identity.module.js';
import { LearningModule } from './learning/learning.module.js';
import { LegalModule } from './legal/legal.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PracticePortsModule } from './practice/maintenance/private-senses-cleanup.provider.js';
import { PracticeModule } from './practice/practice.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    IdentityModule, BatchScopeModule, ContentModule, ContentPipelineModule, SettingsModule, NotificationsModule,
    LearningModule, LegalModule, FaqModule, EntitlementsModule, PracticeModule, PracticePortsModule, AiModule,
  ],
  controllers: [HealthController],
  providers: [ReadinessService],
})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [CommonModule.forRoot(config), PrismaModule.forRoot({ connectionString: config.databaseUrl, ...config.database })],
      providers: [{ provide: READINESS_REDIS, useFactory: () => readinessRedis(config.redisUrl) }],
    };
  }
}

/** Connects on the first check; a dead Redis fails fast (2 s) instead of queueing the PING. Errors are reported by the check itself. */
function readinessRedis(url: string): Redis {
  const redis = new Redis(url, { lazyConnect: true, connectTimeout: 2_000, commandTimeout: 2_000, maxRetriesPerRequest: 1 });
  redis.on('error', () => undefined);
  return redis;
}
