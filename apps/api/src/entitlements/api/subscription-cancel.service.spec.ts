import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { BillingAdapterRegistry } from '../billing/billing-adapter.registry.js';
import { BILLING_ADAPTER_TIMEOUT_MS } from '../entitlements.constants.js';
import type { SubscriptionSource } from '../rules/plan-rules.js';
import type { SourcesRepository } from '../sources/sources.repository.js';
import { SubscriptionCancelService } from './subscription-cancel.service.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const DAY = 86_400_000;
const USER = 'user-1';

const sub = (over: Partial<SubscriptionSource> = {}): SubscriptionSource => ({
  id: 'sub-1', provider: 'fake', externalSubscriptionId: 'ext-1', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
  trialEndsAt: null, currentPeriodStart: new Date(NOW.getTime() - 10 * DAY), currentPeriodEnd: new Date(NOW.getTime() + 20 * DAY),
  graceEndsAt: null, quotaAnchorAt: null, interval: 'month', pendingInterval: null, ...over,
});

function setup(subs: SubscriptionSource[], adapter: { cancelAtPeriodEnd?: (id: string) => Promise<void> } | null = { cancelAtPeriodEnd: vi.fn(async () => {}) }) {
  const logs: LogEntry[] = [];
  const sources = { load: vi.fn(async () => ({ subscriptions: subs, grants: [] })) };
  const service = new SubscriptionCancelService(
    {} as PrismaClient, new FakeClock(NOW), sources as unknown as SourcesRepository, { get: async () => SETTINGS_DEFAULTS } as unknown as SettingsService,
    { get: () => adapter ?? undefined } as unknown as BillingAdapterRegistry, new AppLogger({ write: (e) => logs.push(e) }),
  );
  return { service, adapter, logs, sources };
}

describe('SubscriptionCancelService (D11, D28)', () => {
  it('cancels an active auto-renewing subscription: the adapter is called with the provider id, the answer is requested', async () => {
    const s = setup([sub()]);
    expect(await s.service.cancel(USER, 'sub-1')).toEqual({ status: 'requested' });
    expect(s.adapter!.cancelAtPeriodEnd).toHaveBeenCalledExactlyOnceWith('ext-1');
    expect(s.logs.find((l) => l.event === 'subscription_cancel_requested')).toMatchObject({ subscription_id: 'sub-1' });
  });

  it('D28: a grace subscription (the provider still retries the charge) can be cancelled', async () => {
    const s = setup([sub({ status: 'grace', graceEndsAt: new Date(NOW.getTime() + DAY) })]);
    expect(await s.service.cancel(USER, 'sub-1')).toEqual({ status: 'requested' });
  });

  it('B8E36: a subscription already cancelled, another user\'s, an unknown id, an ended one → 409 subscription-not-cancellable, no adapter call', async () => {
    for (const subs of [[sub({ cancelAtPeriodEnd: true })], [], [sub({ id: 'other' })], [sub({ status: 'expired' })]]) {
      const s = setup(subs);
      await expect(s.service.cancel(USER, 'sub-1')).rejects.toMatchObject({ status: 409, problemType: 'subscription-not-cancellable' });
      expect(s.adapter!.cancelAtPeriodEnd).not.toHaveBeenCalled();
    }
  });

  it('an adapter without cancelAtPeriodEnd (a store purchase), or no adapter → 409 cancel-in-store', async () => {
    for (const adapter of [{}, null]) {
      await expect(setup([sub()], adapter).service.cancel(USER, 'sub-1')).rejects.toMatchObject({ status: 409, problemType: 'cancel-in-store' });
    }
  });

  it('B8E37: an adapter that throws or does not answer in time → 503 and a warning with the id only', async () => {
    const failing = setup([sub()], { cancelAtPeriodEnd: async () => { throw new Error('provider down'); } });
    await expect(failing.service.cancel(USER, 'sub-1')).rejects.toMatchObject({ status: 503 });
    expect(failing.logs.find((l) => l.event === 'subscription_cancel_failed')).toMatchObject({ level: 'warn', subscription_id: 'sub-1' });
    vi.useFakeTimers();
    try {
      const hanging = setup([sub()], { cancelAtPeriodEnd: () => new Promise<void>(() => {}) });
      const result = hanging.service.cancel(USER, 'sub-1').catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(BILLING_ADAPTER_TIMEOUT_MS + 1);
      expect(await result).toMatchObject({ status: 503 });
    } finally {
      vi.useRealTimers();
    }
  });
});
