import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../common/logging/app-logger.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry } from '../identity/deletion/account-eraser.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../settings/index.js';
import type { BillingAdapterRegistry } from './billing/billing-adapter.registry.js';
import { BILLING_ADAPTER_TIMEOUT_MS } from './entitlements.constants.js';
import { EntitlementsAccountDeletion } from './account-deletion.provider.js';
import type { SubscriptionSource } from './rules/plan-rules.js';
import type { SourcesRepository } from './sources/sources.repository.js';

const NOW = new Date('2026-10-29T12:00:00Z');
const DAY = 86_400_000;

function sub(overrides: Partial<SubscriptionSource> = {}): SubscriptionSource {
  return {
    id: 'sub-1', provider: 'fake', externalSubscriptionId: 'ext-1', status: 'active', trialDenied: false, cancelAtPeriodEnd: false,
    trialEndsAt: null, currentPeriodStart: new Date(NOW.getTime() - 10 * DAY), currentPeriodEnd: new Date(NOW.getTime() + 20 * DAY),
    graceEndsAt: null, quotaAnchorAt: null, interval: 'month', pendingInterval: null, ...overrides,
  };
}

function setup(input: { subs?: SubscriptionSource[]; adapter?: { cancelAtPeriodEnd?: (id: string) => Promise<void> } | null } = {}) {
  const events: string[] = [];
  const logs: LogEntry[] = [];
  const del = (name: string) => ({ deleteMany: vi.fn(async (_a: unknown) => { events.push(name); return { count: 1 }; }) });
  const upd = (name: string) => ({ updateMany: vi.fn(async (_a: unknown) => { events.push(name); return { count: 1 }; }) });
  const tx = {
    $executeRaw: vi.fn(async (_s: TemplateStringsArray, ...v: unknown[]) => { events.push(`lock:${String(v[0])}`); return 1; }),
    subscription: {
      findMany: vi.fn(async () => (input.subs ?? []).map(({ id }) => ({ id }))),
      deleteMany: vi.fn(async (_a: unknown) => { events.push('subscriptions'); return { count: 1 }; }),
      updateMany: vi.fn(async (_a: unknown) => { events.push('flag'); return { count: 1 }; }),
    },
    billingEvent: del('events'), entitlementGrant: del('grants'), trialHistory: del('trial'), entitlementNotice: del('notices'),
    fakeBillingSubscription: del('fake'), usageRecord: upd('usage'), billingTransaction: upd('transactions'),
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)) };
  const sources = { load: vi.fn(async () => ({ subscriptions: input.subs ?? [], grants: [] })) };
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) };
  const adapter = input.adapter === undefined ? { cancelAtPeriodEnd: vi.fn(async () => { events.push('adapter'); }) } : input.adapter;
  const adapters = { get: vi.fn(() => adapter ?? undefined) };
  const registry = new AccountDeletionRegistry();
  const service = new EntitlementsAccountDeletion(
    registry, prisma as unknown as PrismaClient, new FakeClock(NOW), sources as unknown as SourcesRepository,
    settings as unknown as SettingsService, adapters as unknown as BillingAdapterRegistry, new AppLogger({ write: (e) => logs.push(e) }),
  );
  return { service, tx, events, logs, adapter, prisma, sources, registry, client: tx as unknown as Prisma.TransactionClient };
}

afterEach(() => { vi.useRealTimers(); });

describe('EntitlementsAccountDeletion.renewing (D11, D28)', () => {
  it.each(['trialing', 'active', 'grace', 'on_hold'] as const)('%s and not cancelled → renewing', async (status) => {
    const { service, client } = setup({ subs: [sub({ status, graceEndsAt: new Date(NOW.getTime() + DAY) })] });
    expect(await service.renewing(client, 'u1')).toBe(true);
  });

  it('a cancelled subscription, an ended one and none at all → not renewing', async () => {
    expect(await setup({ subs: [sub({ cancelAtPeriodEnd: true })] }).service.renewing(setup().client, 'u1')).toBe(false);
    expect(await setup({ subs: [] }).service.renewing(setup().client, 'u1')).toBe(false);
    // Cancelled and past its period end: the effective status is expired.
    const ended = sub({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date(NOW.getTime() - DAY) });
    expect(await setup({ subs: [ended] }).service.renewing(setup().client, 'u1')).toBe(false);
  });

  it('registers itself as eraser and as precondition', () => {
    const { service, registry } = setup();
    service.onModuleInit();
    expect(registry.precondition()).toBe(service);
  });
});

describe('EntitlementsAccountDeletion.erase (unit: statements; cascades, uniqueness and the real run are in the smoke)', () => {
  it('locks the user then the three pools, deletes the user rows, anonymises usage and transactions with the anon id', async () => {
    const { service, tx, events, client } = setup({ subs: [sub({ cancelAtPeriodEnd: true })] });
    await service.erase(client, 'u1', 'anon-1', { checks: 'normal' });
    expect(events).toEqual([
      'lock:entitlements.user:u1', 'lock:entitlements.pool:u1:practice_sessions', 'lock:entitlements.pool:u1:ai_practice',
      'lock:entitlements.pool:u1:ai_lookup', 'events', 'grants', 'subscriptions', 'trial', 'notices', 'fake', 'usage', 'transactions',
    ]);
    expect(tx.billingEvent.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ userId: 'u1' }, { appUserId: 'u1' }, { subscriptionId: { in: ['sub-1'] } }] },
    });
    expect(tx.entitlementNotice.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ userId: 'u1' }, { recipientUserId: 'u1' }] } });
    expect(tx.usageRecord.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { userId: 'anon-1' } });
    expect(tx.billingTransaction.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { userId: 'anon-1' } });
  });

  it('B8E52: a subscription still renewing makes the normal run throw and delete nothing', async () => {
    const { service, events, client } = setup({ subs: [sub()] });
    await expect(service.erase(client, 'u1', 'anon', { checks: 'normal' })).rejects.toThrow('renewing subscription');
    expect(events.filter((e) => !e.startsWith('lock:'))).toEqual([]);
  });

  it('B8E53 (P2): checks "skip" erases a renewing subscription (replay after a restore)', async () => {
    const { service, events, client } = setup({ subs: [sub()] });
    await service.erase(client, 'u1', 'anon', { checks: 'skip' });
    expect(events).toContain('subscriptions');
  });

  it('a second run with nothing left issues the same statements without error', async () => {
    const { service, client } = setup({ subs: [] });
    await service.erase(client, 'u1', 'anon-1', { checks: 'normal' });
    await service.erase(client, 'u1', 'anon-2', { checks: 'normal' });
  });
});

describe('EntitlementsAccountDeletion.turnOffRenewalForAdminDelete (D31)', () => {
  it('nothing renews → none, the adapter is not called', async () => {
    const { service, adapter } = setup({ subs: [] });
    expect(await service.turnOffRenewalForAdminDelete('u1')).toBe('none');
    expect(adapter!.cancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it('the adapter accepted in time → the flag is written under the user lock, turned_off, one log with the id only', async () => {
    const { service, tx, events, logs } = setup({ subs: [sub()] });
    expect(await service.turnOffRenewalForAdminDelete('u1')).toBe('turned_off');
    expect(events).toEqual(['adapter', 'lock:entitlements.user:u1', 'flag']);
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['sub-1'] }, userId: 'u1' }, data: { cancelAtPeriodEnd: true } });
    expect(logs).toContainEqual(expect.objectContaining({ event: 'subscription_cancel_recorded_locally', subscription_id: 'sub-1' }));
  });

  it('an adapter without cancelAtPeriodEnd, or one that throws → not_supported and no flag', async () => {
    for (const adapter of [{}, { cancelAtPeriodEnd: async () => { throw new Error('provider down'); } }, null]) {
      const { service, tx } = setup({ subs: [sub()], adapter });
      expect(await service.turnOffRenewalForAdminDelete('u1')).toBe('not_supported');
      expect(tx.subscription.updateMany).not.toHaveBeenCalled();
    }
  });

  it('an adapter that does not answer within the timeout → not_supported and no flag', async () => {
    vi.useFakeTimers();
    const { service, tx } = setup({ subs: [sub()], adapter: { cancelAtPeriodEnd: () => new Promise<void>(() => {}) } });
    const result = service.turnOffRenewalForAdminDelete('u1');
    await vi.advanceTimersByTimeAsync(BILLING_ADAPTER_TIMEOUT_MS + 1);
    expect(await result).toBe('not_supported');
    expect(tx.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('one of two subscriptions refused → not_supported, only the accepted one is flagged', async () => {
    const calls: string[] = [];
    const adapter = { cancelAtPeriodEnd: async (id: string) => { calls.push(id); if (id === 'ext-2') throw new Error('no'); } };
    const { service, tx } = setup({ subs: [sub(), sub({ id: 'sub-2', externalSubscriptionId: 'ext-2' })], adapter });
    expect(await service.turnOffRenewalForAdminDelete('u1')).toBe('not_supported');
    expect(calls).toEqual(['ext-1', 'ext-2']);
    expect(tx.subscription.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['sub-1'] }, userId: 'u1' }, data: { cancelAtPeriodEnd: true } });
  });
});
