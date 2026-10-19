import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox } from './billing/billing-inbox.service.js';
import { BillingJobs } from './billing/billing-jobs.service.js';
import { BillingEventApplier } from './billing/event-applier.service.js';
import { FakeBillingAdapter } from './billing/fake/fake-billing.adapter.js';
import { WebhookController } from './billing/webhook.controller.js';
import { EntitlementsService } from './entitlements.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageExpireJob } from './usage/usage-expire.job.js';
import { UsageLedgerService } from './usage/usage-ledger.service.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule],
  controllers: [WebhookController],
  providers: [
    EntitlementsService,
    SourcesRepository,
    UsageQueries,
    UsageLedgerService,
    UsageExpireJob,
    BillingAdapterRegistry,
    FakeBillingAdapter,
    BillingInbox,
    BillingEventApplier,
    BillingJobs,
    { provide: BILLING_APPLY_PORT, useExisting: BillingEventApplier },
  ],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
