import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdminEntitlementsController } from './api/admin-entitlements.controller.js';
import { MeEntitlementsController } from './api/me-entitlements.controller.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox, NOOP_APPLY_PORT } from './billing/billing-inbox.service.js';
import { FakeBillingAdapter } from './billing/fake/fake-billing.adapter.js';
import { WebhookController } from './billing/webhook.controller.js';
import { EntitlementsService } from './entitlements.service.js';
import { AdminGrantsController } from './grants/admin-grants.controller.js';
import { GrantsService } from './grants/grants.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageExpireJob } from './usage/usage-expire.job.js';
import { UsageLedgerService } from './usage/usage-ledger.service.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule],
  controllers: [WebhookController, AdminGrantsController, AdminEntitlementsController, MeEntitlementsController],
  providers: [
    EntitlementsService,
    SourcesRepository,
    UsageQueries,
    UsageLedgerService,
    UsageExpireJob,
    BillingAdapterRegistry,
    FakeBillingAdapter,
    BillingInbox,
    { provide: BILLING_APPLY_PORT, useValue: NOOP_APPLY_PORT },
    GrantsService,
    IdempotencyInterceptor,
  ],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
