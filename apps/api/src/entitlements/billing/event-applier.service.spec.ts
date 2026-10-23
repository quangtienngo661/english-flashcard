import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { testConfig } from '../../../test/support/test-config.js';
import { BILLING_ADAPTER_TIMEOUT_MS, BILLING_MAX_ATTEMPTS } from '../entitlements.constants.js';
import { BillingAdapter } from './billing-adapter.js';
import { BillingAdapterRegistry } from './billing-adapter.registry.js';
import type { FetchedState } from './billing.types.js';
import { BillingEventApplier } from './event-applier.service.js';
import { FakeBillingAdapter } from './fake/fake-billing.adapter.js';
import { fakeSign } from './fake/fake-wire.js';

const NOW = new Date('2026-11-15T12:00:00.000Z');
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const at = (iso: string) => new Date(iso);

type EventRow = {
  id: string;
  provider: string;
  environment: string;
  type: string;
  kind: string;
  transactionId: string | null;
  occurredAt: Date;
  appUserId: string | null;
  externalSubscriptionId: string | null;
  payload: unknown;
  status: string;
  attempts: number;
  error: string | null;
  userId: string | null;
  subscriptionId: string | null;
  processedAt: Date | null;
};
type SubRow = Record<string, unknown> & { id: string; updatedAt: Date; lastEventAt: Date | null; status: string };

/** In-memory tables with a call log, enough for the applier's queries. Locks are recorded, not enforced. */
class FakeDb {
  events = new Map<string, EventRow>();
  subs: SubRow[] = [];
  trials: Array<{ userId: string; provider: string; paymentFingerprint: string | null }> = [];
  notices: Array<Record<string, unknown>> = [];
  calls: string[] = [];
  inTx = false;
  lockedByOther = new Set<string>();
  failInTx: Error | null = null;
  subSeq = 0;

  private tx = {
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      this.calls.push(`lock:${String(values[0])}`);
      return 1;
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('FROM billing_events')) {
        this.calls.push('claim');
        if (this.failInTx) throw this.failInTx;
        const row = this.events.get(values[0] as string);
        const claimable = row && ['pending', 'failed'].includes(row.status) && !this.lockedByOther.has(row.id);
        return claimable ? [{ id: row.id }] : [];
      }
      this.calls.push('sub-for-update');
      if (sql.includes('WHERE id =')) return this.subs.filter((s) => s.id === values[0]).map((s) => ({ id: s.id }));
      const [provider, environment, external] = values;
      const sub = this.subs.find((s) => s.provider === provider && s.environment === environment && s.externalSubscriptionId === external);
      return sub ? [{ id: sub.id }] : [];
    },
    billingEvent: {
      update: async ({ where, data }: { where: { id: string }; data: Partial<EventRow> }) => {
        this.calls.push(`event:${data.status ?? 'update'}`);
        Object.assign(this.events.get(where.id)!, data);
      },
      findFirst: async ({ where }: { where: Partial<EventRow> }) => {
        const found = [...this.events.values()].find((e) => e.status === 'applied' && e.provider === where.provider
          && e.environment === where.environment && e.type === where.type && e.transactionId === where.transactionId);
        return found ? { id: found.id } : null;
      },
    },
    subscription: {
      findUnique: async ({ where }: { where: { id: string } }) => this.subs.find((s) => s.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.calls.push('sub:create');
        const row = { ...data, id: `sub-${++this.subSeq}` } as SubRow;
        this.subs.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        this.calls.push('sub:update');
        const row = this.subs.find((s) => s.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    trialHistory: {
      createManyAndReturn: async ({ data }: { data: Array<{ userId: string; provider: string; paymentFingerprint: string | null }> }) => {
        this.calls.push('trial_history');
        const item = data[0];
        const clash = this.trials.some((t) => t.userId === item.userId
          || (item.paymentFingerprint !== null && t.provider === item.provider && t.paymentFingerprint === item.paymentFingerprint));
        if (clash) return [];
        this.trials.push(item);
        return [{ id: `trial-${this.trials.length}` }];
      },
    },
    entitlementNotice: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        this.calls.push('notice');
        this.notices.push(...data);
        return { count: data.length };
      },
    },
  };

  client = {
    billingEvent: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = this.events.get(where.id);
        return row ? { ...row } : null;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<EventRow> & { attempts?: { increment: number } } }) => {
        this.calls.push(`event-outside:${data.status}`);
        const row = this.events.get(where.id)!;
        const { attempts, ...rest } = data;
        Object.assign(row, rest);
        if (attempts) row.attempts += attempts.increment;
        return { ...row };
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      this.calls.push('tx:begin');
      this.inTx = true;
      const snapshot = structuredClone({ events: [...this.events.entries()], subs: this.subs, trials: this.trials, notices: this.notices });
      try {
        const result = await fn(this.tx);
        this.calls.push('tx:commit');
        return result;
      } catch (err) {
        this.events = new Map(snapshot.events);
        this.subs = snapshot.subs;
        this.trials = snapshot.trials;
        this.notices = snapshot.notices;
        this.calls.push('tx:rollback');
        throw err;
      } finally {
        this.inTx = false;
      }
    },
  };
}

class StubAdapter extends BillingAdapter {
  readonly provider = 'fake';
  fetched: FetchedState | null | Error | 'hang' = null;
  constructor(private readonly db: FakeDb, opts: { fetch?: boolean; endTrial?: boolean }) {
    super();
    if (opts.fetch) {
      this.fetchState = async () => {
        this.db.calls.push(`fetchState(inTx=${this.db.inTx})`);
        if (this.fetched === 'hang') return new Promise<FetchedState | null>(() => {});
        if (this.fetched instanceof Error) throw this.fetched;
        return this.fetched;
      };
    }
    if (opts.endTrial) {
      this.endTrialNow = async () => { this.db.calls.push(`endTrialNow(inTx=${this.db.inTx})`); };
    }
  }
  async verify() { return { ok: false as const }; }
  ack() { return { status: 200 }; }
}

function setup(opts: { fetch?: boolean; endTrial?: boolean; production?: boolean; profile?: boolean } = {}) {
  const db = new FakeDb();
  const registry = new BillingAdapterRegistry();
  const adapter = new StubAdapter(db, opts);
  registry.register(adapter);
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  const identity = { getProfile: vi.fn(async (id: string) => (opts.profile === false ? null : { id, email: 'lan@example.com' })) };
  const settings = { get: vi.fn(async () => ({ entitlements: { graceDays: 7 } })) };
  const config = testConfig({ billing: { production: opts.production ?? false, fakeEnabled: true, fakeSecret: null, fakeFetchState: true } });
  const recorded: Array<{ type: string; ctx: unknown; inTx: boolean }> = [];
  const transactions = {
    recordFromEvent: vi.fn(async (_tx: unknown, event: { type: string }, ctx: unknown) => {
      recorded.push({ type: event.type, ctx, inTx: db.inTx });
    }),
  };
  const applier = new BillingEventApplier(db.client as never, new FakeClock(NOW), config, registry, identity as never,
    settings as never, logger, transactions as never);
  return { db, applier, adapter, logs, identity, recorded };
}

let seq = 0;
function addEvent(db: FakeDb, type: string, fields: Record<string, unknown> = {}, row: Partial<EventRow> = {}): string {
  const id = `evt-${++seq}`;
  const occurredAt = (fields.occurredAt as string | undefined) ?? '2026-11-15T10:00:00.000Z';
  const payload = {
    provider: 'fake', environment: 'sandbox', externalEventId: id, externalSubscriptionId: 'sub-ext', appUserId: USER,
    occurredAt, type, ...fields,
  };
  db.events.set(id, {
    id, provider: 'fake', environment: 'sandbox', type, kind: type === 'renewed' || type === 'refunded' ? 'additive' : 'state',
    transactionId: (fields.transactionId as string | undefined) ?? null, occurredAt: new Date(occurredAt), appUserId: USER,
    externalSubscriptionId: 'sub-ext', payload, status: 'pending', attempts: 0, error: null, userId: null, subscriptionId: null,
    processedAt: null, ...row,
  });
  return id;
}

const PERIOD = { interval: 'month', currentPeriodStart: '2026-11-15T10:00:00.000Z', currentPeriodEnd: '2026-12-15T10:00:00.000Z' };
const paidStart = { ...PERIOD, trialEndsAt: null, paymentFingerprint: null, transactionId: 'tx-1' };
const trialStart = { ...PERIOD, currentPeriodEnd: '2026-11-22T10:00:00.000Z', trialEndsAt: '2026-11-22T10:00:00.000Z',
  paymentFingerprint: 'fp-card', transactionId: null };

function addSub(db: FakeDb, fields: Partial<SubRow> = {}): SubRow {
  const row: SubRow = {
    id: `sub-${++db.subSeq}`, userId: USER, provider: 'fake', environment: 'sandbox', externalSubscriptionId: 'sub-ext',
    status: 'active', interval: 'month', trialEndsAt: null, trialDenied: false, paymentFingerprint: null,
    currentPeriodStart: at('2026-11-01T00:00:00.000Z'), currentPeriodEnd: at('2026-12-01T00:00:00.000Z'), graceEndsAt: null,
    cancelAtPeriodEnd: false, pendingInterval: null, quotaAnchorAt: at('2026-11-01T00:00:00.000Z'), currentTransactionId: 'tx-0',
    lastEventAt: at('2026-11-14T00:00:00.000Z'), createdAt: at('2026-11-01T00:00:00.000Z'), updatedAt: at('2026-11-14T00:00:00.000Z'),
    ...fields,
  };
  db.subs.push(row);
  return row;
}

describe('BillingEventApplier.apply (design §9.2 step 4, §9.4)', () => {
  it('B5#9/B5E42: a new subscription is created and the event applied; a second apply of the applied row is skipped', async () => {
    const { db, applier } = setup();
    const id = addEvent(db, 'subscription_started', paidStart);
    expect(await applier.apply(id)).toBe('applied');
    expect(db.subs).toHaveLength(1);
    expect(db.subs[0]).toMatchObject({ userId: USER, status: 'active', currentTransactionId: 'tx-1', provider: 'fake',
      environment: 'sandbox', externalSubscriptionId: 'sub-ext', lastEventAt: at('2026-11-15T10:00:00.000Z'), updatedAt: NOW });
    expect(db.events.get(id)).toMatchObject({ status: 'applied', userId: USER, subscriptionId: db.subs[0].id, processedAt: NOW });
    expect(await applier.apply(id)).toBe('skipped');
    expect(db.subs).toHaveLength(1);
  });

  it('a row claimed by another run (SKIP LOCKED returns nothing) is skipped', async () => {
    const { db, applier } = setup();
    const id = addEvent(db, 'subscription_started', paidStart);
    db.lockedByOther.add(id);
    expect(await applier.apply(id)).toBe('skipped');
    expect(db.events.get(id)!.status).toBe('pending');
  });

  it('B5E43/B5#10: a stale state event with fetchState → marked stale, the fetched state written in a second transaction', async () => {
    const { db, applier, adapter } = setup({ fetch: true });
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    adapter.fetched = { status: 'active', interval: 'year', currentPeriodStart: at('2026-11-15T00:00:00.000Z'),
      currentPeriodEnd: at('2027-11-15T00:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: true };
    const id = addEvent(db, 'expired', { occurredAt: '2026-11-15T10:00:00.000Z' });
    expect(await applier.apply(id)).toBe('stale');
    expect(db.events.get(id)!.status).toBe('stale');
    expect(sub).toMatchObject({ status: 'active', interval: 'year', cancelAtPeriodEnd: true, currentPeriodEnd: at('2027-11-15T00:00:00.000Z') });
    expect(db.calls.filter((c) => c === 'tx:begin')).toHaveLength(2);
  });

  it('a stale state event without fetchState → only marked stale', async () => {
    const { db, applier } = setup();
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    const id = addEvent(db, 'expired');
    expect(await applier.apply(id)).toBe('stale');
    expect(sub.status).toBe('active');
    expect(db.calls.filter((c) => c === 'tx:begin')).toHaveLength(1);
  });

  it('R6: fetchState is never called while lockUser is held (call order)', async () => {
    const { db, applier, adapter } = setup({ fetch: true });
    addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    adapter.fetched = null;
    await applier.apply(addEvent(db, 'expired'));
    const fetchAt = db.calls.findIndex((c) => c.startsWith('fetchState'));
    expect(db.calls[fetchAt]).toBe('fetchState(inTx=false)');
    expect(db.calls.slice(0, fetchAt)).toContain('tx:commit');
    expect(db.calls.lastIndexOf('tx:commit')).toBeLessThan(fetchAt);
  });

  it.each([
    ['throws', new Error('provider down')],
    ['returns null', null],
  ])('fetchState %s → the event stays stale, not failed, nothing written', async (_name, fetched) => {
    const { db, applier, adapter, logs } = setup({ fetch: true });
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    adapter.fetched = fetched;
    const id = addEvent(db, 'expired');
    expect(await applier.apply(id)).toBe('stale');
    expect(db.events.get(id)).toMatchObject({ status: 'stale', attempts: 0 });
    expect(sub.status).toBe('active');
    expect(logs.map((l) => l.event)).toContain('billing_state_refetch_failed');
  });

  it('fetchState timing out → the event stays stale after BILLING_ADAPTER_TIMEOUT_MS', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { db, applier, adapter, logs } = setup({ fetch: true });
      addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
      adapter.fetched = 'hang';
      const result = applier.apply(addEvent(db, 'expired'));
      await vi.advanceTimersByTimeAsync(BILLING_ADAPTER_TIMEOUT_MS);
      expect(await result).toBe('stale');
      expect(logs.map((l) => l.event)).toContain('billing_state_refetch_failed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the fetched state is dropped when updated_at changed between the two transactions', async () => {
    const { db, applier, adapter } = setup({ fetch: true });
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    adapter.fetchState = async () => {
      sub.updatedAt = at('2026-11-15T11:59:00.000Z');
      return { status: 'revoked', interval: 'month', currentPeriodStart: null, currentPeriodEnd: null, trialEndsAt: null,
        cancelAtPeriodEnd: false };
    };
    await applier.apply(addEvent(db, 'expired'));
    expect(sub.status).toBe('active');
  });

  it.each([
    ['no app_user_id', { appUserId: null }, true],
    ['a non-uuid one (stored null)', { appUserId: null }, true],
    ['no profile', {}, false],
  ])('B5E45: %s → ignored unknown-user, logged with the event id only', async (_name, row, profile) => {
    const { db, applier, logs } = setup({ profile });
    const id = addEvent(db, 'subscription_started', paidStart, row as Partial<EventRow>);
    expect(await applier.apply(id)).toBe('ignored');
    expect(db.events.get(id)).toMatchObject({ status: 'ignored', error: 'unknown-user', processedAt: NOW });
    expect(db.subs).toHaveLength(0);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'billing_event_unknown_user', event_id: id }));
  });

  it('B5E72: production ignores a sandbox event', async () => {
    const { db, applier } = setup({ production: true });
    const id = addEvent(db, 'subscription_started', paidStart);
    expect(await applier.apply(id)).toBe('ignored');
    expect(db.events.get(id)).toMatchObject({ status: 'ignored', error: 'sandbox-in-production' });
    expect(db.subs).toHaveLength(0);
  });

  it('missing fields (payload null) → ignored missing-fields, logged; refetched when fetchState and the row exist', async () => {
    const withFetch = setup({ fetch: true });
    const sub = addSub(withFetch.db);
    withFetch.adapter.fetched = { status: 'grace', interval: 'month', currentPeriodStart: null, currentPeriodEnd: null,
      trialEndsAt: null, cancelAtPeriodEnd: false };
    const id = addEvent(withFetch.db, 'renewed', {}, { payload: null });
    expect(await withFetch.applier.apply(id)).toBe('ignored');
    expect(withFetch.db.events.get(id)).toMatchObject({ status: 'ignored', error: 'missing-fields', userId: USER });
    expect(withFetch.logs.map((l) => l.event)).toContain('billing_event_incomplete');
    expect(sub.status).toBe('grace');

    const without = setup();
    const id2 = addEvent(without.db, 'renewed', {}, { payload: null });
    expect(await without.applier.apply(id2)).toBe('ignored');
    expect(without.db.calls.filter((c) => c === 'tx:begin')).toHaveLength(1);
  });

  it('B5E94: a plan_changed stored without transaction_id → ignored missing-fields', async () => {
    const { db, applier } = setup();
    addSub(db);
    const id = addEvent(db, 'plan_changed', {}, { payload: null });
    expect(await applier.apply(id)).toBe('ignored');
    expect(db.events.get(id)!.error).toBe('missing-fields');
  });

  it('an additive event whose transaction was already applied → ignored duplicate-transaction', async () => {
    const { db, applier } = setup();
    const sub = addSub(db);
    const renewal = { ...PERIOD, currentPeriodStart: '2026-12-01T00:00:00.000Z', currentPeriodEnd: '2027-01-01T00:00:00.000Z', transactionId: 'tx-2' };
    expect(await applier.apply(addEvent(db, 'renewed', renewal))).toBe('applied');
    const before = { ...sub };
    const again = addEvent(db, 'renewed', renewal);
    expect(await applier.apply(again)).toBe('ignored');
    expect(db.events.get(again)!.error).toBe('duplicate-transaction');
    expect(sub).toEqual(before);
  });

  it('GI1: an applied event is recorded as a transaction inside the same transaction, with the written subscription', async () => {
    const { db, applier, recorded } = setup();
    expect(await applier.apply(addEvent(db, 'subscription_started', paidStart))).toBe('applied');
    expect(recorded).toEqual([{ type: 'subscription_started', ctx: { userId: USER, subscriptionId: db.subs[0].id, provider: 'fake' }, inTx: true }]);
  });

  it('GI5: a duplicate additive event is not recorded again; ignored events are never recorded', async () => {
    const { db, applier, recorded } = setup();
    addSub(db);
    const renewal = { ...PERIOD, currentPeriodStart: '2026-12-01T00:00:00.000Z', currentPeriodEnd: '2027-01-01T00:00:00.000Z', transactionId: 'tx-2' };
    await applier.apply(addEvent(db, 'renewed', renewal));
    await applier.apply(addEvent(db, 'renewed', renewal));
    await applier.apply(addEvent(db, 'renewed', {}, { payload: null }));
    expect(recorded.map((r) => r.type)).toEqual(['renewed']);
  });

  it('a stale plan_changed is still a charge: recorded, though the subscription keeps its newer state', async () => {
    const { db, applier, recorded } = setup();
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    const id = addEvent(db, 'plan_changed', { ...PERIOD, interval: 'year', transactionId: 'tx-9' });
    expect(await applier.apply(id)).toBe('stale');
    expect(recorded).toEqual([{ type: 'plan_changed', ctx: { userId: USER, subscriptionId: sub.id, provider: 'fake' }, inTx: true }]);
  });

  it('review I2: a denied trial, or a trial start for a live subscription, writes no "Dùng thử" row; an allowed trial writes one', async () => {
    const denied = setup({ endTrial: true });
    denied.db.trials.push({ userId: USER, provider: 'fake', paymentFingerprint: null });
    await denied.applier.apply(addEvent(denied.db, 'subscription_started', trialStart));
    expect(denied.recorded).toEqual([]);

    const again = setup();
    addSub(again.db, { status: 'trialing', trialEndsAt: at('2026-11-22T10:00:00.000Z') });
    await again.applier.apply(addEvent(again.db, 'subscription_started', trialStart));
    await again.applier.apply(addEvent(again.db, 'subscription_started', { ...trialStart, occurredAt: '2026-11-10T10:00:00.000Z' }));
    expect(again.recorded).toEqual([]);

    const allowed = setup();
    await allowed.applier.apply(addEvent(allowed.db, 'subscription_started', trialStart));
    expect(allowed.recorded.map((r) => r.type)).toEqual(['subscription_started']);
  });

  it('B5E55/B5#28: a trial for a user with history → trial_denied, endTrialNow after commit, no trial_started notice', async () => {
    const { db, applier, logs } = setup({ endTrial: true });
    db.trials.push({ userId: USER, provider: 'fake', paymentFingerprint: null });
    expect(await applier.apply(addEvent(db, 'subscription_started', trialStart))).toBe('applied');
    expect(db.subs[0]).toMatchObject({ status: 'trialing', trialDenied: true });
    expect(db.notices).toHaveLength(0);
    const endAt = db.calls.indexOf('endTrialNow(inTx=false)');
    expect(endAt).toBeGreaterThan(db.calls.lastIndexOf('tx:commit'));
    expect(logs).toContainEqual(expect.objectContaining({ event: 'trial_reuse_detected', user_id: USER }));
  });

  it('an allowed trial → trial_history row and one trial_started notice for the subscription and trial end', async () => {
    const { db, applier } = setup({ endTrial: true });
    expect(await applier.apply(addEvent(db, 'subscription_started', trialStart))).toBe('applied');
    expect(db.trials).toEqual([{ userId: USER, provider: 'fake', paymentFingerprint: 'fp-card', startedAt: at('2026-11-15T10:00:00.000Z') }]);
    expect(db.subs[0]).toMatchObject({ status: 'trialing', trialDenied: false });
    expect(db.notices).toEqual([{ userId: USER, recipientUserId: USER, kind: 'trial_started', subjectKey: db.subs[0].id,
      periodKey: '2026-11-22T10:00:00.000Z', state: 'pending', dueAt: NOW, windowEndsAt: at('2026-11-22T10:00:00.000Z') }]);
    expect(db.calls.some((c) => c.startsWith('endTrialNow'))).toBe(false);
  });

  it('plan review #3: a second subscription_started with a trial on a trialing row → recorded, no trial_history insert, no endTrialNow', async () => {
    const { db, applier } = setup({ endTrial: true });
    addSub(db, { status: 'trialing', trialEndsAt: at('2026-11-22T10:00:00.000Z'), lastEventAt: at('2026-11-15T09:00:00.000Z') });
    expect(await applier.apply(addEvent(db, 'subscription_started', trialStart))).toBe('applied');
    expect(db.calls).not.toContain('trial_history');
    expect(db.calls.some((c) => c.startsWith('endTrialNow'))).toBe(false);
  });

  it('B5E89: the same card already used for a trial by another account → denied', async () => {
    const { db, applier } = setup();
    db.trials.push({ userId: 'someone-else', provider: 'fake', paymentFingerprint: 'fp-card' });
    await applier.apply(addEvent(db, 'subscription_started', trialStart));
    expect(db.subs[0].trialDenied).toBe(true);
  });

  it('B5E90 (R25): an unverified email still gets the trial and a history row (email is never checked)', async () => {
    const { db, applier, identity } = setup();
    identity.getProfile.mockResolvedValue({ id: USER, email: 'x@example.com', email_verified: false } as never);
    await applier.apply(addEvent(db, 'subscription_started', trialStart));
    expect(db.subs[0]).toMatchObject({ status: 'trialing', trialDenied: false });
    expect(db.trials).toHaveLength(1);
  });

  it('B5E46: an error in the transaction → failed, attempts + 1; the fifth failure logs billing_event_stuck', async () => {
    const { db, applier, logs } = setup();
    const id = addEvent(db, 'subscription_started', paidStart, { attempts: BILLING_MAX_ATTEMPTS - 2 });
    db.failInTx = new Error('connection reset');
    expect(await applier.apply(id)).toBe('failed');
    expect(db.events.get(id)).toMatchObject({ status: 'failed', attempts: BILLING_MAX_ATTEMPTS - 1, error: 'connection reset' });
    expect(logs.map((l) => l.event)).not.toContain('billing_event_stuck');
    expect(await applier.apply(id)).toBe('failed');
    expect(db.events.get(id)!.attempts).toBe(BILLING_MAX_ATTEMPTS);
    expect(logs).toContainEqual(expect.objectContaining({ event: 'billing_event_stuck', event_id: id }));
  });

  it('B5E66/B5#30: renewed after expired → active, anchor reset', async () => {
    const { db, applier } = setup();
    const sub = addSub(db, { status: 'expired' });
    const renewal = { ...PERIOD, currentPeriodStart: '2026-12-01T00:00:00.000Z', currentPeriodEnd: '2027-01-01T00:00:00.000Z', transactionId: 'tx-9' };
    expect(await applier.apply(addEvent(db, 'renewed', renewal))).toBe('applied');
    expect(sub).toMatchObject({ status: 'active', quotaAnchorAt: at('2026-12-01T00:00:00.000Z'), currentTransactionId: 'tx-9' });
  });

  it('an additive event older than last_event_at applies but last_event_at does not move back', async () => {
    const { db, applier } = setup();
    const sub = addSub(db, { lastEventAt: at('2026-11-15T11:00:00.000Z') });
    const renewal = { ...PERIOD, occurredAt: '2026-11-15T10:00:00.000Z', currentPeriodStart: '2026-12-01T00:00:00.000Z',
      currentPeriodEnd: '2027-01-01T00:00:00.000Z', transactionId: 'tx-9' };
    expect(await applier.apply(addEvent(db, 'renewed', renewal))).toBe('applied');
    expect(sub.lastEventAt).toEqual(at('2026-11-15T11:00:00.000Z'));
    expect(sub.currentTransactionId).toBe('tx-9');
  });

  it('lock order: claim → lockUser → subscription row FOR UPDATE', async () => {
    const { db, applier } = setup();
    await applier.apply(addEvent(db, 'subscription_started', paidStart));
    const order = db.calls.filter((c) => ['claim', `lock:entitlements.user:${USER}`, 'sub-for-update'].includes(c));
    expect(order).toEqual(['claim', `lock:entitlements.user:${USER}`, 'sub-for-update']);
  });

  it('applyMany applies the ids one after another', async () => {
    const { db, applier } = setup();
    const a = addEvent(db, 'subscription_started', paidStart);
    const b = addEvent(db, 'cancel_scheduled', { occurredAt: '2026-11-15T10:30:00.000Z' });
    await applier.applyMany([a, b]);
    expect(db.subs[0].cancelAtPeriodEnd).toBe(true);
  });

  describe('D39: a refund that revokes is checked with the provider after commit', () => {
    const yearly: FetchedState = { status: 'active', interval: 'year', currentPeriodStart: at('2026-11-10T00:00:00.000Z'),
      currentPeriodEnd: at('2027-11-10T00:00:00.000Z'), trialEndsAt: null, cancelAtPeriodEnd: false };

    it('B5E102: refunded m1 before plan_changed y1 → revoked → fetch says active year → active, transaction null; plan_changed y1 then sets y1', async () => {
      const { db, applier, adapter } = setup({ fetch: true });
      const sub = addSub(db, { currentTransactionId: 'm1', lastEventAt: at('2026-11-10T00:00:00.000Z') });
      adapter.fetched = yearly;
      expect(await applier.apply(addEvent(db, 'refunded', { occurredAt: '2026-11-10T00:05:00.000Z', transactionId: 'm1', amount: 2 })))
        .toBe('applied');
      expect(db.calls.indexOf('fetchState(inTx=false)')).toBeGreaterThan(db.calls.indexOf('tx:commit'));
      expect(sub).toMatchObject({ status: 'active', interval: 'year', currentPeriodEnd: yearly.currentPeriodEnd, currentTransactionId: null });

      const planChanged = addEvent(db, 'plan_changed', { occurredAt: '2026-11-10T00:06:00.000Z', interval: 'year',
        currentPeriodStart: '2026-11-10T00:00:00.000Z', currentPeriodEnd: '2027-11-10T00:00:00.000Z', transactionId: 'y1' });
      expect(await applier.apply(planChanged)).toBe('applied');
      expect(sub).toMatchObject({ status: 'active', currentTransactionId: 'y1' });
    });

    it('B5E103: refund_reversed before refunded of the same transaction → recorded, then revoked, then fetch → active', async () => {
      const { db, applier, adapter } = setup({ fetch: true });
      const sub = addSub(db, { currentTransactionId: 'tx-0' });
      adapter.fetched = { ...yearly, interval: 'month', currentPeriodStart: sub.currentPeriodStart as Date, currentPeriodEnd: sub.currentPeriodEnd as Date };
      await applier.apply(addEvent(db, 'refund_reversed', { occurredAt: '2026-11-15T10:00:00.000Z', transactionId: 'tx-0' }));
      expect(sub.status).toBe('active');
      await applier.apply(addEvent(db, 'refunded', { occurredAt: '2026-11-15T10:01:00.000Z', transactionId: 'tx-0', amount: null }));
      expect(sub).toMatchObject({ status: 'active', currentTransactionId: 'tx-0' });
      expect(db.calls.filter((c) => c.startsWith('fetchState'))).toHaveLength(1);
    });

    it.each([
      ['throws', new Error('down')],
      ['times out', 'hang' as const],
    ])('B5E104: fetchState %s → stays revoked, logged', async (_name, fetched) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { db, applier, adapter, logs } = setup({ fetch: true });
        const sub = addSub(db, { currentTransactionId: 'tx-0' });
        adapter.fetched = fetched;
        const result = applier.apply(addEvent(db, 'refunded', { transactionId: 'tx-0', amount: null }));
        await vi.advanceTimersByTimeAsync(BILLING_ADAPTER_TIMEOUT_MS);
        expect(await result).toBe('applied');
        expect(sub.status).toBe('revoked');
        expect(logs.map((l) => l.event)).toContain('billing_state_refetch_failed');
      } finally {
        vi.useRealTimers();
      }
    });

    it('the provider also says revoked → kept revoked', async () => {
      const { db, applier, adapter } = setup({ fetch: true });
      const sub = addSub(db, { currentTransactionId: 'tx-0' });
      adapter.fetched = { ...yearly, status: 'revoked' };
      await applier.apply(addEvent(db, 'refunded', { transactionId: 'tx-0', amount: null }));
      expect(sub.status).toBe('revoked');
    });

    it('B5E102 end to end with the real fake provider: one webhook carries refunded m1 before plan_changed y1 → Pro back, yearly', async () => {
      const db = new FakeDb();
      const fakeRows = new Map<string, Record<string, unknown>>();
      const fakePrisma = { fakeBillingSubscription: {
        findUnique: async ({ where }: { where: { externalSubscriptionId: string } }) => structuredClone(fakeRows.get(where.externalSubscriptionId) ?? null),
        createMany: async ({ data }: { data: Array<Record<string, unknown> & { externalSubscriptionId: string }> }) => {
          for (const row of data) fakeRows.set(row.externalSubscriptionId, structuredClone(row));
          return { count: data.length };
        },
        updateMany: async ({ where, data }: { where: { externalSubscriptionId: string }; data: Record<string, unknown> }) => {
          Object.assign(fakeRows.get(where.externalSubscriptionId)!, structuredClone(data));
          return { count: 1 };
        },
      } };
      const secret = Buffer.alloc(32, 7);
      const config = testConfig({ billing: { production: false, fakeEnabled: true, fakeSecret: secret, fakeFetchState: true } });
      const registry = new BillingAdapterRegistry();
      const fake = new FakeBillingAdapter(config, fakePrisma as never, new FakeClock(NOW), registry);
      fake.onModuleInit();
      const applier = new BillingEventApplier(db.client as never, new FakeClock(NOW), config, registry,
        { getProfile: async (id: string) => ({ id }) } as never, { get: async () => ({ entitlements: { graceDays: 7 } }) } as never,
        new AppLogger({ write: () => {} }), { recordFromEvent: async () => {} } as never);

      // What the provider sends, and what the inbox stores for the applier (same ids, same order).
      const wire = (id: string, type: string, occurredAt: string, fields: Record<string, unknown>) => ({
        id, type, environment: 'sandbox', subscription_id: 'sub-ext', app_user_id: USER, occurred_at: occurredAt, ...fields,
      });
      async function deliver(...entries: Array<ReturnType<typeof wire>>) {
        const rawBody = Buffer.from(JSON.stringify({ events: entries }));
        const verified = await fake.verify({ method: 'POST', headers: { 'x-fake-signature': fakeSign(secret, rawBody) }, query: {}, rawBody });
        if (!verified.ok) throw new Error('signature');
        for (const parsed of verified.events) {
          const { type, event } = parsed;
          db.events.set(parsed.externalEventId, {
            id: parsed.externalEventId, provider: 'fake', environment: 'sandbox', type, kind: type === 'refunded' || type === 'renewed' ? 'additive' : 'state',
            transactionId: parsed.transactionId, occurredAt: parsed.occurredAt, appUserId: USER, externalSubscriptionId: 'sub-ext',
            payload: JSON.parse(JSON.stringify(event)), status: 'pending', attempts: 0, error: null, userId: null, subscriptionId: null, processedAt: null,
          });
        }
        await applier.applyMany(verified.events.map((e) => e.externalEventId));
      }

      await deliver(wire('e-start', 'subscription_started', '2026-11-01T00:00:00.000Z', { interval: 'month',
        current_period_start: '2026-11-01T00:00:00.000Z', current_period_end: '2026-12-01T00:00:00.000Z', transaction_id: 'm1' }));
      await deliver(
        wire('e-refund', 'refunded', '2026-11-10T00:05:00.000Z', { transaction_id: 'm1', amount: 2 }),
        wire('e-plan', 'plan_changed', '2026-11-10T00:00:00.000Z', { interval: 'year', current_period_start: '2026-11-10T00:00:00.000Z',
          current_period_end: '2027-11-10T00:00:00.000Z', transaction_id: 'y1' }),
      );

      expect(db.events.get('e-refund')!.status).toBe('applied');
      expect(db.events.get('e-plan')!.status).toBe('stale');
      expect(db.subs[0]).toMatchObject({ status: 'active', interval: 'year', currentPeriodEnd: at('2027-11-10T00:00:00.000Z'), currentTransactionId: null });
      // D37: until a renewal names the yearly transaction, a refund of it only records.
      await deliver(wire('e-refund-y', 'refunded', '2026-11-11T00:00:00.000Z', { transaction_id: 'y1', amount: null }));
      expect(db.subs[0].status).toBe('active');
    });

    it('an adapter without fetchState → stays revoked, no second transaction', async () => {
      const { db, applier } = setup();
      const sub = addSub(db, { currentTransactionId: 'tx-0' });
      await applier.apply(addEvent(db, 'refunded', { transactionId: 'tx-0', amount: null }));
      expect(sub.status).toBe('revoked');
      expect(db.calls.filter((c) => c === 'tx:begin')).toHaveLength(1);
    });

    it('a refund that only records (another transaction) asks nothing', async () => {
      const { db, applier } = setup({ fetch: true });
      addSub(db, { currentTransactionId: 'tx-0' });
      await applier.apply(addEvent(db, 'refunded', { transactionId: 'tx-other', amount: null }));
      expect(db.calls.some((c) => c.startsWith('fetchState'))).toBe(false);
    });
  });

  it('B5E62: no log entry of the applier carries the payload, the fingerprint or an email', async () => {
    const { db, applier, logs } = setup({ fetch: true, endTrial: true });
    db.trials.push({ userId: USER, provider: 'fake', paymentFingerprint: null });
    await applier.apply(addEvent(db, 'subscription_started', trialStart));
    await applier.apply(addEvent(db, 'renewed', {}, { payload: null, appUserId: null }));
    db.failInTx = new Error('boom');
    await applier.apply(addEvent(db, 'expired'));
    const text = JSON.stringify(logs);
    expect(logs.length).toBeGreaterThan(0);
    expect(text).not.toContain('fp-card');
    expect(text).not.toContain('@example.com');
    expect(text).not.toContain('"payload"');
    expect(text).not.toContain('2026-11-22T10:00:00.000Z');
  });
});
