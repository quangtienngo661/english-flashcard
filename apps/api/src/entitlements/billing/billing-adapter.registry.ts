import { Injectable } from '@nestjs/common';
import type { BillingAdapter } from './billing-adapter.js';

/** Adapters register onModuleInit; the webhook and the applier look them up by the `{provider}` of the route or row. */
@Injectable()
export class BillingAdapterRegistry {
  private readonly adapters = new Map<string, BillingAdapter>();

  register(adapter: BillingAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): BillingAdapter | undefined {
    return this.adapters.get(provider);
  }
}
