import { describe, expect, it } from 'vitest';
import { dedupeKey } from '../billing-adapter.js';
import type { EventType } from '../billing.types.js';
import { fakeParse, fakeReadRequest, fakeSign, fakeVerifySignature } from './fake-wire.js';

const SECRET = Buffer.from('fake-secret-for-tests-0123456789abcdef');
const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const at = (iso: string) => new Date(iso);

const base = {
  id: 'evt-1',
  environment: 'sandbox',
  subscription_id: 'sub-1',
  app_user_id: USER,
  occurred_at: '2026-11-15T10:00:00.000Z',
};
const PERIOD = {
  interval: 'month',
  current_period_start: '2026-11-15T10:00:00.000Z',
  current_period_end: '2026-12-15T10:00:00.000Z',
};
const PERIOD_PARSED = {
  interval: 'month',
  currentPeriodStart: at('2026-11-15T10:00:00.000Z'),
  currentPeriodEnd: at('2026-12-15T10:00:00.000Z'),
};

const body = (...entries: unknown[]) => Buffer.from(JSON.stringify({ events: entries }));
const one = (entry: Record<string, unknown>) => {
  const parsed = fakeParse(body(entry));
  expect(parsed).not.toBeNull();
  expect(parsed!.events).toHaveLength(1);
  return parsed!.events[0];
};

describe('fake signature (design §9.1, R16)', () => {
  const signed = body({ ...base, type: 'expired' });

  it('a body signed with the same secret verifies', () => {
    expect(fakeSign(SECRET, signed)).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(fakeVerifySignature(SECRET, signed, fakeSign(SECRET, signed))).toBe(true);
  });

  it('B5E44: a body signed with another secret, or with one byte changed, fails', () => {
    expect(fakeVerifySignature(SECRET, signed, fakeSign(Buffer.from('another-secret'), signed))).toBe(false);
    const changed = Buffer.from(signed);
    changed[changed.length - 3] ^= 1;
    expect(fakeVerifySignature(SECRET, changed, fakeSign(SECRET, signed))).toBe(false);
  });

  it('B5E44: a missing, short or malformed header fails without throwing', () => {
    expect(fakeVerifySignature(SECRET, signed, undefined)).toBe(false);
    expect(fakeVerifySignature(SECRET, signed, 'sha256=abc')).toBe(false);
    expect(fakeVerifySignature(SECRET, signed, fakeSign(SECRET, signed).replace('sha256=', 'md5='))).toBe(false);
  });

  it('the GET form verifies the same as POST', () => {
    const signature = fakeSign(SECRET, signed);
    const post = fakeReadRequest({ method: 'POST', headers: { 'x-fake-signature': signature }, query: {}, rawBody: signed });
    const get = fakeReadRequest({
      method: 'GET',
      headers: {},
      query: { payload: signed.toString('base64url'), signature },
      rawBody: Buffer.alloc(0),
    });
    expect(get).toEqual(post);
    expect(get!.body.equals(signed)).toBe(true);
    expect(fakeVerifySignature(SECRET, get!.body, get!.signature)).toBe(true);
  });

  it('a GET without payload reads nothing', () => {
    expect(fakeReadRequest({ method: 'GET', headers: {}, query: {}, rawBody: Buffer.alloc(0) })).toBeNull();
  });
});

describe('fakeParse (design §9.3)', () => {
  const common = {
    provider: 'fake',
    environment: 'sandbox',
    externalEventId: 'evt-1',
    externalSubscriptionId: 'sub-1',
    appUserId: USER,
    occurredAt: at('2026-11-15T10:00:00.000Z'),
  };

  const CASES: Array<[EventType, Record<string, unknown>, Record<string, unknown>]> = [
    [
      'subscription_started',
      { ...PERIOD, payment_fingerprint: 'fp-1', transaction_id: 'tx-1' },
      { ...PERIOD_PARSED, trialEndsAt: null, paymentFingerprint: 'fp-1', transactionId: 'tx-1', amount: null, currency: null },
    ],
    ['renewed', { ...PERIOD, transaction_id: 'tx-2' }, { ...PERIOD_PARSED, transactionId: 'tx-2', amount: null, currency: null }],
    ['renewal_failed', { grace_ends_at: '2026-11-22T10:00:00.000Z' }, { graceEndsAt: at('2026-11-22T10:00:00.000Z') }],
    ['grace_ended', {}, {}],
    ['cancel_scheduled', {}, {}],
    ['cancel_unscheduled', {}, {}],
    ['expired', {}, {}],
    ['revoked', {}, {}],
    ['refunded', { transaction_id: 'tx-2', amount: 4.99, currency: 'USD' }, { transactionId: 'tx-2', amount: 4.99, currency: 'USD' }],
    ['refund_reversed', { transaction_id: 'tx-2' }, { transactionId: 'tx-2' }],
    ['plan_changed', { ...PERIOD, interval: 'year', transaction_id: 'tx-3' }, { ...PERIOD_PARSED, interval: 'year', transactionId: 'tx-3', amount: null, currency: null }],
    ['plan_change_scheduled', { interval: 'month' }, { interval: 'month' }],
    ['plan_change_canceled', {}, {}],
  ];

  it.each(CASES)('%s parses into its normalized event', (type, fields, normalized) => {
    const parsed = one({ ...base, type, ...fields });
    expect(parsed.event).toEqual({ ...common, type, ...normalized });
    expect(parsed).toMatchObject({
      externalEventId: 'evt-1',
      type,
      environment: 'sandbox',
      externalSubscriptionId: 'sub-1',
      appUserId: USER,
      occurredAt: at('2026-11-15T10:00:00.000Z'),
      transactionId: (fields.transaction_id as string | undefined) ?? null,
      missing: [],
      raw: { ...base, type, ...fields },
    });
  });

  it('optional fields default to null: renewal_failed without grace_ends_at, refunded without amount', () => {
    expect(one({ ...base, type: 'renewal_failed' }).event).toMatchObject({ graceEndsAt: null });
    expect(one({ ...base, type: 'refunded', transaction_id: 'tx-2' }).event).toMatchObject({ amount: null });
  });

  it('GI1/GI6: a charge carries amount and currency when sent; a malformed one is null, never missing', () => {
    const charge = { ...PERIOD, transaction_id: 'tx-1', amount: 99000, currency: 'VND' };
    for (const type of ['subscription_started', 'renewed', 'plan_changed'] as const) {
      expect(one({ ...base, type, ...charge }).event).toMatchObject({ amount: 99000, currency: 'VND' });
    }
    const odd = one({ ...base, type: 'renewed', ...PERIOD, transaction_id: 'tx-1', amount: 'lots', currency: 'vnd' });
    expect(odd).toMatchObject({ missing: [] });
    expect(odd.event).toMatchObject({ amount: null, currency: null });
    expect(one({ ...base, type: 'refunded', transaction_id: 'tx-2', currency: 'US' }).event).toMatchObject({ currency: null });
  });

  it('D35: payment_succeeded is an unknown type (skipped and counted)', () => {
    expect(fakeParse(body({ ...base, type: 'payment_succeeded', transaction_id: 'tx-1' }))).toEqual({ events: [], skipped: 1 });
  });

  it('a renewed without transaction_id parses with event null and missing [transactionId]', () => {
    const parsed = one({ ...base, type: 'renewed', ...PERIOD });
    expect(parsed).toMatchObject({ type: 'renewed', event: null, missing: ['transactionId'], transactionId: null });
  });

  it('B5E94 (D37): subscription_started without a trial and plan_changed each need transaction_id', () => {
    expect(one({ ...base, type: 'subscription_started', ...PERIOD })).toMatchObject({
      event: null,
      missing: ['transactionId'],
    });
    expect(one({ ...base, type: 'plan_changed', ...PERIOD, interval: 'year' })).toMatchObject({
      event: null,
      missing: ['transactionId'],
    });
  });

  it('B5E94 (D37): a subscription_started with trial_ends_at and no transaction_id parses', () => {
    const parsed = one({ ...base, type: 'subscription_started', ...PERIOD, trial_ends_at: '2026-11-22T10:00:00.000Z' });
    expect(parsed.missing).toEqual([]);
    expect(parsed.event).toMatchObject({ trialEndsAt: at('2026-11-22T10:00:00.000Z'), transactionId: null, paymentFingerprint: null });
  });

  it('every missing or malformed §9.3 field is named', () => {
    const parsed = one({ ...base, type: 'renewed', interval: 'week', current_period_start: 'yesterday' });
    expect(parsed.event).toBeNull();
    expect(parsed.missing).toEqual(['transactionId', 'interval', 'currentPeriodStart', 'currentPeriodEnd']);
  });

  it('a non-JSON body or one without an events array → null', () => {
    expect(fakeParse(Buffer.from('not json'))).toBeNull();
    expect(fakeParse(Buffer.from(JSON.stringify({ event: [] })))).toBeNull();
    expect(fakeParse(Buffer.from(JSON.stringify([])))).toBeNull();
    expect(fakeParse(Buffer.from('null'))).toBeNull();
  });

  it('an entry of unknown type is skipped and counted, the others parse', () => {
    const parsed = fakeParse(body({ ...base, type: 'expired' }, { ...base, id: 'evt-2', type: 'mystery' }, 'oops'));
    expect(parsed!.skipped).toBe(2);
    expect(parsed!.events.map((event) => event.externalEventId)).toEqual(['evt-1']);
  });

  it('an entry without an id, a known environment, a subscription id or a valid occurred_at is skipped (it cannot be stored)', () => {
    const parsed = fakeParse(
      body(
        { ...base, type: 'expired', id: undefined },
        { ...base, type: 'expired', environment: 'staging' },
        { ...base, type: 'expired', subscription_id: '' },
        { ...base, type: 'expired', occurred_at: 'soon' },
      ),
    );
    expect(parsed).toEqual({ events: [], skipped: 4 });
  });

  it.each([['abc'], [USER.toUpperCase()], [42], [null]])('app_user_id %j → appUserId null', (appUserId) => {
    const parsed = one({ ...base, type: 'expired', app_user_id: appUserId });
    expect(parsed.appUserId).toBeNull();
    expect(parsed.event).toMatchObject({ appUserId: null });
  });
});

describe('dedupeKey', () => {
  it('is provider:environment:external_event_id', () => {
    expect(dedupeKey('fake', 'production', 'evt-9')).toBe('fake:production:evt-9');
  });
});
