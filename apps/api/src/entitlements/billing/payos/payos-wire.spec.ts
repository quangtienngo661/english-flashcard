import { describe, expect, it } from 'vitest';
import { signPayosData } from './payos-signature.js';
import { toParsedEvent, verifyPayosBody, type PayosWebhook } from './payos-wire.js';

const KEY = 'test-checksum-key-not-a-real-one';
const RECEIVED = new Date('2026-11-05T03:02:07.000Z');

const data = (over: Record<string, unknown> = {}) => ({
  orderCode: 1_000_000_123, amount: 199000, description: 'WM0XSNJKV', accountNumber: '12345678', reference: 'FT26309ABC',
  transactionDateTime: '2026-11-05 10:02:00', currency: 'VND', paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', code: '00',
  desc: 'Thành công', counterAccountBankId: '970422', counterAccountBankName: 'MB Bank', counterAccountName: 'NGUYEN THI LAN',
  counterAccountNumber: '0123456789', virtualAccountName: 'WORDMET', virtualAccountNumber: 'V123',
  ...over,
});
const signed = (d: Record<string, unknown>, top: Record<string, unknown> = {}): PayosWebhook =>
  ({ code: '00', desc: 'success', success: true, data: d, signature: signPayosData(d, KEY), ...top }) as PayosWebhook;
const bytes = (value: unknown) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');

describe('verifyPayosBody (design §3.3, §3.4)', () => {
  it('accepts a body signed with the checksum key and hands back the parsed body', () => {
    const body = signed(data());
    const result = verifyPayosBody(bytes(body), KEY);
    expect(result).toEqual({ ok: true, body });
  });

  it('refuses a body whose signature has one character changed', () => {
    const body = signed(data());
    const last = body.signature.slice(-1);
    const broken = { ...body, signature: body.signature.slice(0, -1) + (last === '0' ? '1' : '0') };
    expect(verifyPayosBody(bytes(broken), KEY)).toEqual({ ok: false });
  });

  it('refuses a body whose data changed after signing', () => {
    const body = signed(data());
    expect(verifyPayosBody(bytes({ ...body, data: { ...body.data, amount: 1000 } }), KEY)).toEqual({ ok: false });
  });

  it('refuses another checksum key', () => {
    expect(verifyPayosBody(bytes(signed(data())), 'another-key')).toEqual({ ok: false });
  });

  it('the top-level fields are not signed, only data: changing `success` leaves the signature valid (the applier checks them, §3.4)', () => {
    expect(verifyPayosBody(bytes({ ...signed(data()), success: false }), KEY).ok).toBe(true);
  });

  it('refuses what is not a payOS body: not JSON, an array, a missing or non-string signature, data that is not an object', () => {
    const body = signed(data());
    const wrong: unknown[] = [
      'not json', '', '[]', 'null', '42',
      { ...body, signature: undefined }, { ...body, signature: 123 }, { ...body, signature: '' },
      { ...body, data: undefined }, { ...body, data: 'x' }, { ...body, data: null }, { ...body, data: [] },
    ];
    for (const candidate of wrong) expect(verifyPayosBody(bytes(candidate), KEY), JSON.stringify(candidate)).toEqual({ ok: false });
    expect(verifyPayosBody(Buffer.alloc(0), KEY)).toEqual({ ok: false });
  });

  it('a signature of another length is refused, not thrown at (timingSafeEqual needs equal lengths)', () => {
    const body = signed(data());
    for (const signature of [body.signature.slice(0, 10), `${body.signature}00`, body.signature.toUpperCase()]) {
      expect(verifyPayosBody(bytes({ ...body, signature }), KEY), signature.length.toString()).toEqual({ ok: false });
    }
  });

  it('refuses everything when the checksum key is empty (an unset key must not verify a body signed with the empty key)', () => {
    expect(verifyPayosBody(bytes({ ...signed(data()), signature: signPayosData(data(), '') }), '')).toEqual({ ok: false });
  });
});

describe('toParsedEvent (design §3.3, §3.12)', () => {
  const event = (over: Record<string, unknown> = {}, top: Record<string, unknown> = {}) => toParsedEvent(signed(data(over), top), 'production', RECEIVED);

  it('gives the event the identity <orderCode>:<reference>, no user and no subscription', () => {
    expect(event()).toMatchObject({
      type: 'payment_succeeded', environment: 'production', externalEventId: '1000000123:FT26309ABC', transactionId: '1000000123:FT26309ABC',
      appUserId: null, externalSubscriptionId: null, occurredAt: RECEIVED, missing: [],
    });
  });

  it('the environment is the one the adapter runs in', () => {
    expect(toParsedEvent(signed(data()), 'sandbox', RECEIVED)?.environment).toBe('sandbox');
  });

  it('the payload has the normalised fields and the payer, which is only there until the applier has used it', () => {
    expect(event()?.event).toEqual({
      orderCode: 1_000_000_123, paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', amount: 199000, reference: 'FT26309ABC',
      transactionDateTime: '2026-11-05 10:02:00', source: 'webhook', success: true, code: '00',
      payer: { counterAccountName: 'NGUYEN THI LAN', counterAccountNumber: '0123456789', counterAccountBankName: 'MB Bank' },
    });
  });

  it('blank payer fields become null; success and code carry what payOS said, for the applier to refuse (§3.4)', () => {
    const parsed = event({ counterAccountName: '', counterAccountNumber: null, counterAccountBankName: undefined, code: '01' }, { success: false });
    expect(parsed?.event).toMatchObject({
      success: false, code: '01', payer: { counterAccountName: null, counterAccountNumber: null, counterAccountBankName: null },
    });
  });

  it('raw has no counterAccount* and no virtualAccount* field, and keeps the rest', () => {
    const raw = event()?.raw as { data: Record<string, unknown>; success: boolean; signature: string };
    expect(Object.keys(raw.data).filter((key) => /^(counterAccount|virtualAccount)/.test(key))).toEqual([]);
    expect(JSON.stringify(raw)).not.toMatch(/NGUYEN THI LAN|0123456789|970422|MB Bank|V123|WORDMET/);
    expect(raw.data).toMatchObject({ orderCode: 1_000_000_123, amount: 199000, reference: 'FT26309ABC', paymentLinkId: '124c33293c43417ab7879e14c8d9eb18', code: '00' });
    expect(raw.success).toBe(true);
    expect(raw.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('without an amount or a link id the payload is null and says which are missing (the applier ignores it as missing-fields)', () => {
    const noAmount = event({ amount: undefined });
    expect(noAmount).toMatchObject({ event: null, missing: ['amount'], externalEventId: '1000000123:FT26309ABC' });
    expect(event({ amount: undefined, paymentLinkId: '' })).toMatchObject({ event: null, missing: ['amount', 'paymentLinkId'] });
    expect(event({ amount: '199000' })).toMatchObject({ event: null, missing: ['amount'] });
  });

  it('without an order code or a reference there is no identity, so no event (the adapter counts it as skipped)', () => {
    for (const over of [{ orderCode: undefined }, { orderCode: '1000000123' }, { orderCode: 1.5 }, { reference: undefined }, { reference: '' }, { reference: 7 }]) {
      expect(event(over), JSON.stringify(over)).toBeNull();
    }
  });

  it('the webhook of payOS’s own confirm-webhook test (orderCode 123) parses; the applier turns it into unknown-order', () => {
    expect(event({ orderCode: 123 })).toMatchObject({ externalEventId: '123:FT26309ABC', missing: [] });
  });
});
