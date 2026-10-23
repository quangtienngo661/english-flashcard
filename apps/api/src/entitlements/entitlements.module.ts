import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor.js';
import { MailModule } from '../common/mail/mail.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SettingsModule } from '../settings/index.js';
import { AdminEntitlementsController } from './api/admin-entitlements.controller.js';
import { MeEntitlementsController } from './api/me-entitlements.controller.js';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox } from './billing/billing-inbox.service.js';
import { BillingJobs } from './billing/billing-jobs.service.js';
import { BillingEventApplier } from './billing/event-applier.service.js';
import { TransactionsRepository } from './billing/transactions.repository.js';
import { FakeBillingAdapter } from './billing/fake/fake-billing.adapter.js';
import { WebhookController } from './billing/webhook.controller.js';
import { EntitlementsService } from './entitlements.service.js';
import { AdminGrantsController } from './grants/admin-grants.controller.js';
import { GrantsService } from './grants/grants.service.js';
import { NoticePlanner } from './notices/notice-planner.service.js';
import { NoticeSender } from './notices/notice-sender.service.js';
import { SourcesRepository } from './sources/sources.repository.js';
import { UsageExpireJob } from './usage/usage-expire.job.js';
import { UsageLedgerService } from './usage/usage-ledger.service.js';
import { AdminTransactionsController } from './transactions/admin-transactions.controller.js';
import { MeTransactionsController } from './transactions/me-transactions.controller.js';
import { TransactionsService } from './transactions/transactions.service.js';
import { UsageQueries } from './usage/usage.queries.js';

@Module({
  imports: [IdentityModule, SettingsModule, MailModule],
  controllers: [
    WebhookController, AdminGrantsController, AdminEntitlementsController, MeEntitlementsController, MeTransactionsController,
    AdminTransactionsController,
  ],
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
    TransactionsRepository,
    BillingJobs,
    NoticePlanner,
    NoticeSender,
    { provide: BILLING_APPLY_PORT, useExisting: BillingEventApplier },
    GrantsService,
    TransactionsService,
    IdempotencyInterceptor,
  ],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
