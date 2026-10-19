import { Module } from '@nestjs/common';
import { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { EntitlementsService } from './entitlements.service.js';

@Module({
  providers: [EntitlementsService, BillingAdapterRegistry],
  exports: [EntitlementsService, BillingAdapterRegistry],
})
export class EntitlementsModule {}
