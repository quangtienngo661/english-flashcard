import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { EntitlementsService } from './entitlements.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule],
  providers: [EntitlementsService, SourcesRepository, UsageQueries],
  exports: [EntitlementsService],
})
export class EntitlementsModule {}
