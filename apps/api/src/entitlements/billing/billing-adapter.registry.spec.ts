import { describe, expect, it } from 'vitest';
import { BillingAdapter } from './billing-adapter.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';

class StubAdapter extends BillingAdapter {
  constructor(readonly provider: string) {
    super();
  }
  async verify() {
    return { ok: false as const };
  }
  ack(result: { received: number }) {
    return { status: 200, body: result };
  }
}

describe('BillingAdapterRegistry', () => {
  it('finds a registered adapter by provider and nothing for an unknown one', () => {
    const registry = new BillingAdapterRegistry();
    const fake = new StubAdapter('fake');
    registry.register(fake);
    registry.register(new StubAdapter('paddle'));
    expect(registry.get('fake')).toBe(fake);
    expect(registry.get('stripe')).toBeUndefined();
  });

  it('an adapter without the optional methods does not have them', () => {
    const adapter = new StubAdapter('fake');
    expect(adapter.fetchState).toBeUndefined();
    expect(adapter.endTrialNow).toBeUndefined();
    expect(adapter.cancelAtPeriodEnd).toBeUndefined();
  });
});
