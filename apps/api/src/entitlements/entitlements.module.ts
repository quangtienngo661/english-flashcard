import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdminEntitlementsController } from './api/admin-entitlements.controller.js';
import { MeEntitlementsController } from './api/me-entitlements.controller.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { EntitlementsService } from './entitlements.service.js';
import { AdminGrantsController } from './grants/admin-grants.controller.js';
import { GrantsService } from './grants/grants.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageExpireJob } from './usage/usage-expire.job.js';
import { UsageLedgerService } from './usage/usage-ledger.service.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule],
  controllers: [AdminGrantsController, AdminEntitlementsController, MeEntitlementsController],
  providers: [
    EntitlementsService, SourcesRepository, UsageQueries, UsageLedgerService, UsageExpireJob, BillingAdapterRegistry, GrantsService,
    IdempotencyInterceptor,
  ],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
