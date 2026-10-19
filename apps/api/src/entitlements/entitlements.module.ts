import { Module } from '@nestjs/common';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { FakeBillingAdapter } from './billing/fake/fake-billing.adapter.js';
import { EntitlementsService } from './entitlements.service.js';

@Module({
  providers: [EntitlementsService, BillingAdapterRegistry, FakeBillingAdapter],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
