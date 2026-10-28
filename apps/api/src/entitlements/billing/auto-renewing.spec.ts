import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '../entitlements.types.js';
import { isAutoRenewing } from './auto-renewing.js';

describe('isAutoRenewing (D11, D28)', () => {
  const statuses: SubscriptionStatus[] = ['trialing', 'active', 'grace', 'on_hold', 'expired', 'revoked'];
  it.each(statuses.flatMap((status) => [true, false].map((cancelAtPeriodEnd) => [status, cancelAtPeriodEnd] as const)))(
    '%s with cancelAtPeriodEnd=%s', (status, cancelAtPeriodEnd) => {
      const live = ['trialing', 'active', 'grace', 'on_hold'].includes(status);
      expect(isAutoRenewing({ status, cancelAtPeriodEnd })).toBe(live && !cancelAtPeriodEnd);
    });
});
