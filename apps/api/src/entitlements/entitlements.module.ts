import { Module } from '@nestjs/common';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { BILLING_APPLY_PORT, BillingInbox, NOOP_APPLY_PORT } from './billing/billing-inbox.service.js';
import { FakeBillingAdapter } from './billing/fake/fake-billing.adapter.js';
import { WebhookController } from './billing/webhook.controller.js';
import { EntitlementsService } from './entitlements.service.js';

@Module({
  controllers: [WebhookController],
  providers: [
    EntitlementsService,
    BillingAdapterRegistry,
    FakeBillingAdapter,
    BillingInbox,
    { provide: BILLING_APPLY_PORT, useValue: NOOP_APPLY_PORT },
  ],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
