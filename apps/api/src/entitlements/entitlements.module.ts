import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { EntitlementsService } from './entitlements.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageExpireJob } from './usage/usage-expire.job.js';
import { UsageLedgerService } from './usage/usage-ledger.service.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule],
  providers: [EntitlementsService, SourcesRepository, UsageQueries, UsageLedgerService, UsageExpireJob, BillingAdapterRegistry],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
